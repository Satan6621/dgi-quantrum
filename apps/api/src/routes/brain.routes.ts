import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, requireOrg } from "../lib/middleware";
import { asyncHandler, parsePage, paged } from "../lib/helpers";
import { checkLimit } from "../lib/billing";
import { parseCsv } from "../lib/csv";
import { hybridRetrieve } from "../lib/rag";
import { generate } from "../lib/aiEngine";
import { audit } from "../lib/audit";

const r = Router();

const KNOWLEDGE_CATS = ["CORPORATE", "PRODUCT", "VALUE_PROP", "POLICY", "FAQ", "PROCESS", "ARGUMENT"];

r.use(requireAuth, requireOrg, requireRole("ADMIN", "MANAGER", "PLATFORM"));

export const BRAIN_CATEGORIES = [
  "CORPORATE",
  "PRODUCT",
  "VALUE_PROP",
  "POLICY",
  "FAQ",
  "ELIGIBILITY",
  "DISQUALIFICATION",
  "SCREENING",
  "ARGUMENT",
  "PROHIBITED_CLAIM",
  "PROCESS",
  "FOLLOW_UP",
  "ESCALATION",
  "OBJECTION",
] as const;

r.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json({ categories: BRAIN_CATEGORIES });
  })
);

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, q, active } = req.query;
    const orgId = req.user!.orgId!;
    const pg = parsePage(req);
    const where: any = {
      orgId,
      ...(category ? { category: String(category) } : {}),
      ...(active ? { active: active === "true" } : {}),
    };
    if (q) {
      const term = String(q);
      where.OR = [
        { title: { contains: term } },
        { content: { contains: term } },
        { keywords: { contains: term } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.brainItem.findMany({
        where,
        orderBy: [{ category: "asc" }, { createdAt: "desc" }],
        skip: pg.skip,
        take: pg.take,
      }),
      prisma.brainItem.count({ where }),
    ]);
    res.json(paged(items, total, pg));
  })
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const { category, title, content, keywords, active } = req.body || {};
    if (!BRAIN_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Categoría inválida. Válidas: ${BRAIN_CATEGORIES.join(", ")}` });
    }
    if (!title || !content) return res.status(400).json({ error: "Título y contenido requeridos" });
    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    await checkLimit(org, "brain");
    const item = await prisma.brainItem.create({
      data: {
        orgId: req.user!.orgId!,
        category,
        title: String(title),
        content: String(content),
        keywords: String(keywords || ""),
        active: active !== false,
      },
    });
    res.status(201).json({ item });
  })
);

/** Importación CSV de ítems del cerebro: columnas category,title,content,keywords */
r.post(
  "/import",
  asyncHandler(async (req, res) => {
    const { csv } = req.body || {};
    if (!csv || typeof csv !== "string") {
      return res.status(400).json({ error: "Envía el CSV en el campo 'csv' (texto)" });
    }
    const rows = parseCsv(csv);
    if (rows.length === 0) return res.status(400).json({ error: "El CSV está vacío" });
    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });

    const created: any[] = [];
    const errors: string[] = [];
    for (const [i, row] of rows.entries()) {
      const category = (row.category || "").trim().toUpperCase();
      const title = (row.title || "").trim();
      const content = (row.content || "").trim();
      if (!(BRAIN_CATEGORIES as readonly string[]).includes(category) || !title || !content) {
        errors.push(`Fila ${i + 2}: categoría o campos inválidos`);
        continue;
      }
      await checkLimit(org, "brain");
      const item = await prisma.brainItem.create({
        data: {
          orgId: org.id,
          category: category as (typeof BRAIN_CATEGORIES)[number],
          title,
          content,
          keywords: (row.keywords || "").trim(),
          active: (row.active ?? "true").toLowerCase() !== "false",
        },
      });
      created.push({ id: item.id, category, title });
    }
    res.status(201).json({ created: created.length, errorCount: errors.length, createdItems: created, errors: errors.slice(0, 50) });
  })
);

/** Playground: prueba qué respondería la IA con el contenido actual del cerebro. */
r.post(
  "/test",
  asyncHandler(async (req, res) => {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ error: "Envía una pregunta en el campo 'text'" });
    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });

    const brain = await prisma.brainItem.findMany({ where: { orgId: org.id, active: true } });
    const knowledge = brain.filter((b) => KNOWLEDGE_CATS.includes(b.category));
    const prohibited = brain.filter((b) => b.category === "PROHIBITED_CLAIM");
    const matches = hybridRetrieve(knowledge, String(text), { limit: 3, minScore: 0.3 });
    const answer = matches[0] ?? null;

    const knowledgeLines = brain
      .slice(0, 40)
      .map((b) => `- [${b.category}] ${b.title}: ${b.content}`)
      .join("\n");
    const prohibitedLines = prohibited.map((b) => `- ${b.title}: ${b.content}`).join("\n") || "- Ninguno";
    const systemPrompt = `Eres el asistente oficial de ${org.name}.
BASE DE CONOCIMIENTO OFICIAL (usa SOLO esta información; no inventes datos, precios ni promesas):
${knowledgeLines}

CLAIMS PROHIBIDOS (nunca los hagas):
${prohibitedLines}

Responde de forma clara, cálida y breve (máx. 3-4 párrafos).`;

    const reply = await generate({
      systemPrompt,
      history: [{ role: "user", content: String(text) }],
      intent: {
        kind: "answer",
        twinName: org.name,
        tone: "claro y profesional",
        presentation: `Asistente de ${org.name}`,
        name: "test",
        answer: answer ?? null,
        question: null,
      },
    });

    audit({ orgId: org.id, userId: req.user!.sub, action: "brain.test", entity: "brain", meta: { q: String(text).slice(0, 120) } });
    res.json({
      reply,
      sources: matches.map((m) => ({ id: m.id, category: m.category, title: m.title, relevance: Number(m.relevance.toFixed(3)) })),
    });
  })
);

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const existing = await prisma.brainItem.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "No encontrado" });
    const { title, content, keywords, active, category } = req.body || {};
    const item = await prisma.brainItem.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(content !== undefined ? { content: String(content) } : {}),
        ...(keywords !== undefined ? { keywords: String(keywords) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(category !== undefined ? { category } : {}),
      },
    });
    res.json({ item });
  })
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const existing = await prisma.brainItem.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "No encontrado" });
    await prisma.brainItem.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  })
);

export default r;