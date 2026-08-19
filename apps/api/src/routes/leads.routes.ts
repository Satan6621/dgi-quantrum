import { Router } from "express";
import { prisma } from "../lib/prisma";
import { env } from "../env";
import { hashPassword } from "../lib/password";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler, leadView, safeParseJson, parsePage, paged } from "../lib/helpers";
import { awardOnActivation } from "../lib/downline";
import { notify } from "../lib/notify";
import { fire } from "../lib/outgoing";
import { sendEmail } from "../lib/email";
import { parseCsv, normalizeEmail, normalizePhone } from "../lib/csv";
import { audit } from "../lib/audit";
import { generateICS } from "../lib/calendar";
import { invalidateCache } from "../lib/cache";

const r = Router();

r.use(requireAuth, requireOrg);

function scopeWhere(req: any) {
  const orgId = req.user.orgId;
  if (req.user.role === "DISTRIBUTOR") {
    return { orgId, distributorId: req.distributorId ?? undefined };
  }
  return { orgId };
}

/** Lista de leads (scope por rol) con paginación y filtros */
r.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, source, q, outcome, distributorId } = req.query;
    const pg = parsePage(req);
    let where: any = scopeWhere(req);
    if (status) where.status = String(status);
    if (source) where.source = String(source);
    if (outcome) where.outcome = String(outcome);
    if (distributorId) where.distributorId = String(distributorId);
    if (q) {
      const term = String(q);
      where.OR = [{ name: { contains: term } }, { email: { contains: term } }, { phone: { contains: term } }];
    }
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          distributor: { select: { id: true, name: true, slug: true } },
          _count: { select: { sessions: true, tasks: true, followUps: true } },
          tasks: { select: { id: true, title: true, completed: true, order: true }, orderBy: { order: "asc" } },
          followUps: { select: { id: true, title: true, status: true, dueAt: true }, orderBy: { dueAt: "asc" } },
        },
        orderBy: { lastActivity: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      prisma.lead.count({ where }),
    ]);
    res.json(paged(leads.map(leadView), total, pg));
  })
);

/** Importación CSV de leads (admin/manager): columnas name,email,phone,source,distributor_slug */
r.post(
  "/import",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    if (req.user!.role !== "ADMIN" && req.user!.role !== "MANAGER" && req.user!.role !== "PLATFORM") {
      return res.status(403).json({ error: "No tienes permisos para importar leads" });
    }
    const { csv, source } = req.body || {};
    if (!csv || typeof csv !== "string") {
      return res.status(400).json({ error: "Envía el CSV en el campo 'csv' (texto)" });
    }
    const rows = parseCsv(csv);
    if (rows.length === 0) return res.status(400).json({ error: "El CSV está vacío" });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });

    const existingEmails = new Set(
      (await prisma.lead.findMany({ where: { orgId, email: { not: null } }, select: { email: true } })).map((l) => normalizeEmail(l.email!))
    );
    const existingPhones = new Set(
      (await prisma.lead.findMany({ where: { orgId, phone: { not: null } }, select: { phone: true } })).map((l) => normalizePhone(l.phone!))
    );

    const created: any[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    const defaultSource = String(source || "import");

    for (const [i, row] of rows.entries()) {
      const name = (row.name || "").trim();
      const email = normalizeEmail(row.email || "");
      const phone = normalizePhone(row.phone || "");
      if (!name && !email && !phone) {
        errors.push(`Fila ${i + 2}: sin datos`);
        continue;
      }
      if (email && existingEmails.has(email)) {
        skipped.push(`Fila ${i + 2}: email duplicado (${email})`);
        continue;
      }
      if (phone && existingPhones.has(phone)) {
        skipped.push(`Fila ${i + 2}: teléfono duplicado (${phone})`);
        continue;
      }
      const slug = (row.distributor_slug || row.distributor || "").trim();
      const dist = slug ? await prisma.distributor.findFirst({ where: { orgId, slug } }) : null;
      const lead = await prisma.lead.create({
        data: {
          orgId,
          distributorId: dist?.id ?? null,
          name: name || null,
          email: email || null,
          phone: phone || null,
          source: row.source || defaultSource,
          status: "NEW",
        },
      });
      created.push({ id: lead.id, name: name || null, email: email || null, phone: phone || null });
      if (email) existingEmails.add(email);
      if (phone) existingPhones.add(phone);
    }

    if (created.length > 0) {
      invalidateCache(`overview:${orgId}`);
      invalidateCache(`funnel:${orgId}`);
      invalidateCache(`executive:${orgId}`);
      invalidateCache(`sources:${orgId}`);
      invalidateCache(`cohorts:${orgId}`);
      await fire(org, "lead.created", { created: created.length, source: defaultSource });
    }
    audit({ orgId: org.id, userId: req.user!.sub, action: "leads.import", entity: "lead", meta: { created: created.length, skipped: skipped.length, errors: errors.length, source: defaultSource } });
    res.status(201).json({ created: created.length, skippedCount: skipped.length, errorCount: errors.length, createdItems: created, skipped: skipped.slice(0, 50), errors: errors.slice(0, 50) });
  })
);

r.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    let leadWhere: any = { orgId: req.user!.orgId! };
    if (req.user!.role === "DISTRIBUTOR") {
      const dist = await prisma.distributor.findFirst({ where: { userId: req.user!.sub } });
      leadWhere.distributorId = dist?.id ?? "__none__";
    }
    const sessions = await prisma.session.findMany({
      where: { orgId: req.user!.orgId!, lead: leadWhere },
      include: {
        lead: { select: { id: true, name: true, email: true, score: true, status: true, source: true } },
        distributor: { select: { name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    res.json({
      items: sessions.map((s) => ({
        id: s.id,
        lead: s.lead,
        distributorName: s.distributor?.name ?? null,
        channel: s.channel,
        messages: s._count.messages,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
      })),
      total: sessions.length,
    });
  })
);

r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, orgId },
      include: {
        distributor: { select: { name: true, slug: true, whatsapp: true, calendarUrl: true } },
        sessions: {
          include: { messages: { orderBy: { ts: "asc" } } },
          orderBy: { startedAt: "desc" },
        },
        followUps: { orderBy: { dueAt: "asc" } },
        tasks: { orderBy: { order: "asc" } },
      },
    });
    if (!lead) return res.status(404).json({ error: "No encontrado" });
    res.json({ lead });
  })
);

/** Mover estado manualmente (distribuidor/admin) */
r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "No encontrado" });
    const { status, score, intentLevel, outcome } = req.body || {};
    const data: any = { lastActivity: new Date() };
    if (status) {
      data.status = String(status);
      if (String(status) === "HANDOFF" && !existing.handoffAt) data.handoffAt = new Date();
    }
    if (score !== undefined) data.score = Number(score);
    if (intentLevel) data.intentLevel = String(intentLevel);
    if (outcome) data.outcome = String(outcome);
    const updated = await prisma.lead.update({ where: { id: existing.id }, data });
    invalidateCache(`overview:${orgId}`);
    invalidateCache(`funnel:${orgId}`);
    invalidateCache(`executive:${orgId}`);
    invalidateCache(`sources:${orgId}`);
    invalidateCache(`cohorts:${orgId}`);
    res.json({ lead: leadView(updated) });
  })
);

/** Aceptar handoff → pasa a ONBOARDING y crea las tareas */
r.post(
  "/:id/accept-handoff",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, orgId } });
    if (!lead) return res.status(404).json({ error: "No encontrado" });
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const settings = safeParseJson<any>(org?.settings, {});
    const checklist: string[] = settings.onboardingChecklist ?? [
      "Confirmar datos de contacto",
      "Revisar y aceptar el código de conducta",
      "Ver material de capacitación inicial",
      "Configurar su perfil público y enlaces",
      "Primer contacto con su mentor",
      "Activar su AI Twin y recibir su funnel",
    ];
    await prisma.onboardingTask.deleteMany({ where: { leadId: lead.id } });
    for (const [i, t] of checklist.entries()) {
      await prisma.onboardingTask.create({
        data: { orgId, leadId: lead.id, title: t, order: i },
      });
    }
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "ONBOARDING", outcome: "ALTA_INTENCION", intentLevel: "HIGH", lastActivity: new Date() },
    });
    invalidateCache(`overview:${orgId}`);
    invalidateCache(`funnel:${orgId}`);
    invalidateCache(`executive:${orgId}`);
    invalidateCache(`sources:${orgId}`);
    invalidateCache(`cohorts:${orgId}`);
    const orgForEvt = await prisma.organization.findUnique({ where: { id: orgId } });
    if (orgForEvt) {
      await fire(orgForEvt, "lead.handoff", { leadId: lead.id, name: lead.name, email: lead.email });
    }
    res.json({ lead: leadView(updated) });
  })
);

/** Toggle tarea de onboarding */
r.patch(
  "/:leadId/tasks/:taskId",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const lead = await prisma.lead.findFirst({ where: { id: req.params.leadId, orgId } });
    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });
    const task = await prisma.onboardingTask.findFirst({ where: { id: req.params.taskId, leadId: lead.id } });
    if (!task) return res.status(404).json({ error: "Tarea no encontrada" });
    const updated = await prisma.onboardingTask.update({
      where: { id: task.id },
      data: { completed: !task.completed },
    });
    res.json({ task: updated });
  })
);

/**
 * ACTIVACIÓN / DUPLICACIÓN: el lead activado se convierte en un nuevo
 * distribuidor con su propio AI Twin (se hereda el cerebro de la organización).
 */
r.post(
  "/:id/activate",
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, orgId },
      include: { tasks: true, distributor: true },
    });
    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });
    if (lead.status === "DISTRIBUTOR") return res.status(400).json({ error: "Este lead ya fue activado" });
    const incomplete = lead.tasks.filter((t) => !t.completed);
    if (incomplete.length > 0) {
      return res.status(400).json({ error: `Quedan ${incomplete.length} tareas de onboarding pendientes` });
    }
    const { name, email, password } = req.body || {};
    const finalName = (name || lead.name || "Nuevo Distribuidor").trim();
    const finalEmail = (email || lead.email || `${lead.id}@nuevo-distribuidor.demo`).toLowerCase().trim();
    const finalPassword = password || "demo1234";

    const existing = await prisma.user.findUnique({ where: { email: finalEmail } });
    if (existing) return res.status(409).json({ error: "Ese email ya está registrado" });

    const slug = finalName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const newUser = await prisma.user.create({
      data: {
        orgId,
        role: "DISTRIBUTOR",
        email: finalEmail,
        name: finalName,
        passwordHash: await hashPassword(finalPassword),
      },
    });
    const newTwin = await prisma.distributor.create({
      data: {
        orgId,
        userId: newUser.id,
        name: finalName,
        slug,
        presentation: `Hola, soy ${finalName}. Te acompaño a conocer esta oportunidad paso a paso.`,
        tone: "cercano y profesional",
        whatsapp: null,
        calendarUrl: null,
        sponsorId: lead.distributorId ?? null,
      },
    });
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "DISTRIBUTOR", outcome: "ONBOARDED", intentLevel: "HIGH", activatedAt: new Date(), lastActivity: new Date() },
    });

    audit({ orgId, userId: req.user!.sub, action: "lead.activate", entity: "lead", entityId: lead.id, meta: { distributor: finalName, slug, email: finalEmail } });
    invalidateCache(`overview:${orgId}`);
    invalidateCache(`funnel:${orgId}`);
    invalidateCache(`executive:${orgId}`);
    invalidateCache(`sources:${orgId}`);
    invalidateCache(`cohorts:${orgId}`);

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (org) {
      await awardOnActivation(org, newTwin, lead);
      await notify(orgId, {
        type: "system",
        title: "Nuevo distribuidor activado 🎉",
        body: `${finalName} activó su cuenta. Su funnel ya está en /f/${slug}.`,
        link: "/app/downline",
      });
      await fire(org, "distributor.activated", {
        distributor: { id: newTwin.id, name: finalName, slug, email: finalEmail },
        sponsor: lead.distributorId ?? null,
        leadId: lead.id,
      });
    }
    // Email de bienvenida con credenciales (SMTP real o log en demo)
    await sendEmail({
      to: finalEmail,
      subject: `🎉 ¡Bienvenido a ${(await prisma.organization.findUnique({ where: { id: orgId } }))?.name ?? "la red"}!`,
      text: `Hola ${finalName},\n\nTu cuenta de distribuidor ya está activa.\n\n  Email: ${finalEmail}\n  Contraseña: ${password || "demo1234"}\n  Tu funnel: ${env.APP_URL}/f/${slug}\n\n¡Mucho éxito!`,
    });

    const settings = safeParseJson<any>((await prisma.organization.findUnique({ where: { id: orgId } }))?.settings, {});
    const checklist: string[] = settings.onboardingChecklist ?? [];
    await prisma.onboardingTask.deleteMany({ where: { leadId: lead.id } });
    for (const [i, t] of checklist.entries()) {
      await prisma.onboardingTask.create({
        data: { orgId, leadId: lead.id, title: t, order: i, completed: true },
      });
    }

    res.status(201).json({
      lead: leadView(updated),
      newDistributor: {
        id: newTwin.id,
        name: newTwin.name,
        email: finalEmail,
        slug: newTwin.slug,
        funnelUrl: `/f/${newTwin.slug}`,
      },
    });
  }));

/** Generar archivo .ics para reunión de handoff */
r.get(
  "/:id/calendar",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, orgId },
      include: { distributor: { select: { name: true, calendarUrl: true } } },
    });
    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });

    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const icsContent = generateICS({
      title: `Handoff: ${lead.name || "Prospecto"}`,
      description: `Reunión de handoff con ${lead.name || "prospecto"}.\nFuente: ${lead.source}\nEstado: ${lead.status}\nDistribuidor: ${lead.distributor?.name || "N/A"}`,
      startTime,
      endTime,
      url: lead.distributor?.calendarUrl ?? undefined,
    });

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="handoff-${lead.id}.ics"`);
    res.send(icsContent);
  })
);

export default r;