import { prisma } from "./prisma";
import { hybridRetrieve, Raggable } from "./rag";
import { analyze, classify, extractName, Outcome } from "./scoring";
import { generate, RuleIntent } from "./aiEngine";
import { safeParseJson } from "./helpers";
import { awardPoints } from "./gamify";
import { notify } from "./notify";
import { fire } from "./outgoing";

export interface SessionMeta {
  stage: string;
  q: number;
  greeted: boolean;
  screeningDone: boolean;
  done: boolean;
  score: number;
  answers: Array<{ q: string; a: string }>;
}

export interface ChatParams {
  slug: string;
  userText: string;
  sessionId?: string | null;
  leadId?: string | null;
  variantId?: string | null;
  channel?: string | null;
}

export interface ChatResult {
  sessionId: string;
  leadId: string | null;
  reply: string;
  score: number;
  stage: string;
  outcome: Outcome | null;
  status: string | null;
  handoff: { whatsapp: string | null; calendarUrl: string | null } | null;
}

const KNOWLEDGE_CATS = ["CORPORATE", "PRODUCT", "VALUE_PROP", "POLICY", "FAQ", "PROCESS", "ARGUMENT"];

function settingsOf(org: any) {
  const s = JSON.parse(org.settings || "{}");
  return {
    highIntent: s?.thresholds?.highIntent ?? 5,
    nutrition: s?.thresholds?.nutrition ?? 2,
  };
}

function parseMeta(session: any): SessionMeta {
  try {
    const m = JSON.parse(session.meta || "{}");
    return {
      stage: m.stage || "SCREENING",
      q: m.q || 0,
      greeted: !!m.greeted,
      screeningDone: !!m.screeningDone,
      done: !!m.done,
      score: m.score || 0,
      answers: m.answers || [],
    };
  } catch {
    return { stage: "SCREENING", q: 0, greeted: false, screeningDone: false, done: false, score: 0, answers: [] };
  }
}

export async function runChat(p: ChatParams): Promise<ChatResult> {
  const twin = await prisma.distributor.findFirst({
    where: { slug: p.slug, funnelEnabled: true, status: "ACTIVE" },
  });
  if (!twin) throw new Error("Funnel no encontrado");

  const org = await prisma.organization.findUnique({ where: { id: twin.orgId } });
  if (!org) throw new Error("Funnel no encontrado");

  const variants = safeParseJson(twin.variants, []) as Array<{ id: string; tone?: string; presentation?: string }>;
  const variant = p.variantId ? variants.find((v) => v.id === p.variantId) ?? null : null;
  const tone = variant?.tone || twin.tone;
  const presentation = variant?.presentation || twin.presentation;

  const brain = await prisma.brainItem.findMany({ where: { orgId: org.id, active: true } });
  const screening = brain.filter((b) => b.category === "SCREENING");
  const knowledge = brain.filter((b) => KNOWLEDGE_CATS.includes(b.category));
  const objectionItems = brain.filter((b) => b.category === "OBJECTION");
  const prohibited = brain.filter((b) => b.category === "PROHIBITED_CLAIM");
  const th = settingsOf(org);

  let session: any;
  if (p.sessionId) {
    session = await prisma.session.findFirst({ where: { id: p.sessionId, orgId: org.id } });
  }
  if (!session) {
    let lead = null;
    if (p.leadId) {
      lead = await prisma.lead.findFirst({ where: { id: p.leadId, orgId: org.id } });
    }
    if (!lead) {
      lead = await prisma.lead.create({
        data: { orgId: org.id, distributorId: twin.id, source: p.channel ?? "funnel", status: "IN_CONVERSATION" },
      });
      await notify(org.id, {
        distributorId: twin.id,
        type: "lead",
        title: "Nuevo lead 🧲",
        body: "Alguien entró a tu funnel y comenzó una conversación.",
        link: "/app/leads",
      });
      await awardPoints(org.id, twin.id, 10, "Nuevo lead en tu funnel.");
      await fire(org, "lead.created", {
        leadId: lead.id,
        distributorId: twin.id,
        distributorSlug: twin.slug,
        channel: p.channel ?? "funnel",
        source: p.channel ?? "funnel",
      });
    }
    session = await prisma.session.create({
      data: {
        orgId: org.id,
        distributorId: twin.id,
        leadId: lead.id,
        channel: p.channel ?? "chat",
        variant: variant?.id ?? "base",
        meta: JSON.stringify({ stage: "SCREENING", q: 0, greeted: false, screeningDone: false, done: false, score: 0, answers: [] }),
      },
    });
  } else if (variant && session.variant === "base") {
    session = await prisma.session.update({ where: { id: session.id }, data: { variant: variant.id } });
  }

  let lead: any = session.leadId
    ? await prisma.lead.findFirst({ where: { id: session.leadId, orgId: org.id } })
    : null;
  if (!lead) {
    lead = await prisma.lead.create({
      data: { orgId: org.id, distributorId: twin.id, source: "funnel", status: "IN_CONVERSATION" },
    });
    session = await prisma.session.update({
      where: { id: session.id },
      data: { leadId: lead.id },
    });
  }

  const meta = parseMeta(session);
  const analysis = analyze(p.userText);
  const extractedName = extractName(p.userText);
  let score = lead.score ?? 0;

  // --- actualizar datos del lead ---
  const leadUpdates: any = { lastActivity: new Date() };
  if (!lead.name && extractedName) leadUpdates.name = extractedName;
  if (!lead.email && analysis.email) leadUpdates.email = analysis.email;
  if (!lead.phone && analysis.phone) leadUpdates.phone = analysis.phone;
  const displayName = leadUpdates.name ?? lead.name ?? null;

  // --- persistir mensaje del usuario ---
  await prisma.message.create({
    data: { sessionId: session.id, role: "USER", content: p.userText, score, tags: analysis.signal },
  });

  const history = await prisma.message.findMany({
    where: { sessionId: session.id, role: { in: ["USER", "AI"] } },
    orderBy: { ts: "asc" },
  });

  // --- lógica de decisión ---
  let outcome: Outcome = "CONTINUE";
  let status: string | null = null;
  let intent: RuleIntent;

  const hasContact = !!(leadUpdates.email || leadUpdates.phone || lead.email || lead.phone);
  const strongPositive = analysis.signal === "positive";
  const negative = analysis.signal === "negative";
  const pendingQ = meta.q < screening.length ? screening[meta.q] : null;
  const nextQ = meta.q + 1 < screening.length ? screening[meta.q + 1] : null;
  const base = {
    name: displayName,
    twinName: twin.name,
    tone,
    presentation,
    whatsapp: twin.whatsapp,
    calendarUrl: twin.calendarUrl,
  };

  if (analysis.signal === "disqualify" || score <= -4) {
    outcome = "NO_APTO";
    status = "DISQUALIFIED";
    intent = { kind: "no_apto", ...base };
  } else if (analysis.signal === "objection") {
    // Objeción: atenderla con el contenido OBJECTION del cerebro (RAG), sin castigar el score
    // ni forzar la siguiente pregunta de screening en este turno.
    const objection = hybridRetrieve(objectionItems, p.userText, { limit: 1, minScore: 0.4 })[0] ?? null;
    intent = { kind: "objection", ...base, answer: objection, question: pendingQ?.title ?? null };
  } else if (analysis.signal === "farewell") {
    // Despedida: cierre cálido, sin avanzar el screening.
    intent = { kind: "farewell", ...base };
  } else if (analysis.url && analysis.signal === "neutral") {
    // Enlace: no se puede abrir desde el chat; invitar a contar lo que vieron.
    intent = { kind: "link", ...base };
  } else {
    // Lead que ya pasó el funnel (nutrición, handoff o screening completo) y vuelve a escribir:
    // la IA responde sus dudas con el historial + RAG (re-engagement), y solo re-escala si
    // vuelve con intención clara y datos de contacto.
    const returning = meta.done || meta.screeningDone || screening.length === 0;
    const willHigh = returning
      ? strongPositive && hasContact
      : (strongPositive && hasContact) ||
        (score + analysis.delta >= th.highIntent && (hasContact || meta.screeningDone));
    if (willHigh) {
      outcome = "HIGH";
      status = "HANDOFF";
      intent = { kind: "handoff", ...base };
    } else if (returning) {
      const answer = hybridRetrieve(knowledge, p.userText, { limit: 1, minScore: 0.45 })[0] ?? null;
      if (answer && analysis.signal !== "negative") {
        intent = { kind: "answer", ...base, answer, question: null };
      } else {
        const finalScore = score + analysis.delta;
        outcome = "NUTRITION";
        status = "NUTRITION";
        intent =
          finalScore >= th.nutrition
            ? { kind: "nutrition", ...base }
            : { kind: "nurture", ...base };
      }
    } else if (meta.screeningDone || screening.length === 0 || negative) {
      const finalScore = score + analysis.delta;
      outcome = "NUTRITION";
      status = "NUTRITION";
      intent =
        finalScore >= th.nutrition
          ? { kind: "nutrition", ...base }
          : { kind: "nurture", ...base };
    } else {
      // responder dudas con RAG híbrido + siguiente pregunta de screening
      const answer = hybridRetrieve(knowledge, p.userText, { limit: 1, minScore: 0.4 })[0] ?? null;
      intent = answer
        ? { kind: "answer", ...base, answer, question: nextQ?.title ?? null }
        : { kind: "screening_question", ...base, question: nextQ?.title ?? null };
    }
  }

  // saludo + primera pregunta en la primera interacción
  if (!meta.greeted) {
    meta.greeted = true;
    if (outcome === "CONTINUE") {
      const firstQ = pendingQ?.title ?? "¿Qué te motiva a buscar esta oportunidad?";
      intent = { kind: "greeting", ...base, question: firstQ };
    }
  }

  // --- generar respuesta ---
  const systemPrompt = buildSystemPrompt({ org, twin, brain, prohibited, screening, meta, score, lastUserText: p.userText });
  const llmHistory = history.slice(-8).map((m: any) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));
  const reply = await generate({ systemPrompt, history: llmHistory, intent });

  // --- avanzar scoring / screening ---
  if (outcome === "CONTINUE" && (intent.kind === "answer" || intent.kind === "screening_question")) {
    score += analysis.delta;
    if (pendingQ) {
      meta.answers.push({ q: pendingQ.title, a: p.userText });
      if (meta.q + 1 < screening.length) meta.q += 1;
      else meta.screeningDone = true;
    } else {
      meta.screeningDone = true;
    }
  }
  if (outcome === "NUTRITION" || outcome === "HIGH" || outcome === "NO_APTO") {
    meta.done = true;
  }
  meta.score = score;

  // --- persistencia ---
  await prisma.message.create({
    data: { sessionId: session.id, role: "AI", content: reply, score, tags: intent.kind },
  });

  const statusOut = status ?? (lead.status || "IN_CONVERSATION");
  const intentLevel =
    outcome === "HIGH" ? "HIGH" : outcome === "NO_APTO" ? "LOW" : analysis.signal === "positive" ? "HIGH" : analysis.signal === "negative" ? "LOW" : "MEDIUM";

  leadUpdates.score = score;
  leadUpdates.status = statusOut;
  leadUpdates.lastActivity = new Date();
  if (statusOut === "HANDOFF" && !lead.handoffAt) {
    leadUpdates.handoffAt = new Date();
  }
  if (outcome !== "CONTINUE") {
    leadUpdates.outcome = outcome;
    leadUpdates.intentLevel = intentLevel;
  }
  await prisma.lead.update({ where: { id: lead.id }, data: leadUpdates });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      meta: JSON.stringify(meta),
      endedAt: meta.done ? new Date() : session.endedAt ?? null,
    },
  });

  if (outcome === "NUTRITION") {
    await scheduleNutritionFollowUps(org.id, lead.id, lead.name, twin.name);
  }
  if (outcome === "HIGH") {
    await notify(org.id, {
      distributorId: twin.id,
      type: "handoff",
      title: "Lead de alta intención 🔥",
      body: `${displayName ?? "Un prospecto"} completó el funnel y está listo para agendar.`,
      link: "/app/leads",
    });
    await awardPoints(org.id, twin.id, 25, "Prospecto de alta intención.");
    await fire(org, "lead.handoff", {
      leadId: lead.id,
      name: displayName,
      email: leadUpdates.email ?? lead.email,
      phone: leadUpdates.phone ?? lead.phone,
      distributorId: twin.id,
      distributorSlug: twin.slug,
      score,
    });
  }

  return {
    sessionId: session.id,
    leadId: lead.id,
    reply,
    score,
    stage: meta.stage,
    outcome,
    status: statusOut,
    handoff: outcome === "HIGH" ? { whatsapp: twin.whatsapp, calendarUrl: twin.calendarUrl } : null,
  };
}

function buildSystemPrompt(opts: {
  org: any;
  twin: any;
  brain: Raggable[];
  prohibited: Raggable[];
  screening: Raggable[];
  meta: SessionMeta;
  score: number;
  lastUserText: string;
}): string {
  const { org, twin, brain, prohibited, screening, meta, score, lastUserText } = opts;
  const knowledgeLines = brain
    .slice(0, 40)
    .map((b) => `- [${b.category}] ${b.title}: ${b.content}`)
    .join("\n");
  const prohibitedLines = prohibited.map((b) => `- ${b.title}: ${b.content}`).join("\n") || "- Ninguno";
  const remainingQ = screening.slice(meta.q).map((b) => `- ${b.title}`).join("\n") || "- Ninguna (screening completo)";
  return `Eres ${twin.name}, asesora de la empresa ${org.name}.

Personalidad y tono: ${twin.tone}.
Presentación: ${twin.presentation}.
Idioma: ${twin.language} (responde SIEMPRE en este idioma).

BASE DE CONOCIMIENTO OFICIAL (usa SOLO esta información; no inventes datos, precios ni promesas):
${knowledgeLines}

CLAIMS PROHIBIDOS (nunca los hagas):
${prohibitedLines}

PREGUNTAS DE AUTOEVALUACIÓN restantes (guía la conversación para responderlas una a una, una por turno, tras resolver las dudas del prospecto):
${remainingQ}

SCORE ACTUAL DEL PROSPECTO: ${score}.

REGLA: si el prospecto expresa una duda u objeción (precio, tiempo, confianza, indecisión), VALIDA su preocupación y respóndela con la base de conocimiento ANTES de continuar; no la minimices ni cambies de tema.
MENSAJE ACTUAL DEL PROSPECTO: ${lastUserText.slice(0, 300)}.

REGLAS:
- Responde de forma cálida, cercana y profesional.
- No prometas ingresos garantizados ni afirmes que los productos curan enfermedades.
- Si el prospecto pide precios o condiciones, responde con la información de la base de conocimiento.
- Máximo 3-4 párrafos.`;
}

async function scheduleNutritionFollowUps(
  orgId: string,
  leadId: string,
  leadName: string | null,
  twinName: string
) {
  const tmpl = await prisma.sequenceTemplate.findFirst({
    where: { orgId, active: true, trigger: "NUTRICION" },
  });
  if (!tmpl) return;
  const steps = JSON.parse(tmpl.steps || "[]") as Array<{
    delayDays: number;
    title: string;
    content: string;
    channel?: string;
  }>;
  await prisma.followUp.deleteMany({ where: { leadId, status: "PENDING" } });
  for (const [i, s] of steps.entries()) {
    const content = (s.content || "")
      .replaceAll("{name}", leadName?.split(" ")[0] ?? "amigo")
      .replaceAll("{twin}", twinName);
    await prisma.followUp.create({
      data: {
        orgId,
        leadId,
        templateId: tmpl.id,
        stepIndex: i,
        title: s.title,
        content,
        channel: s.channel || "whatsapp",
        dueAt: new Date(Date.now() + s.delayDays * 86400000),
        status: "PENDING",
      },
    });
  }
}