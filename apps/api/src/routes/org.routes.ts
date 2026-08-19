import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, requireOrg } from "../lib/middleware";
import { asyncHandler, safeParseJson, parsePage, paged } from "../lib/helpers";
import { OUTGOING_EVENTS, outgoingWebhooksOf, deliverNow } from "../lib/outgoing";
import { audit } from "../lib/audit";

const r = Router();

r.use(requireAuth, requireOrg);

/** Org info + settings (admin) */
r.get(
  "/",
  requireRole("ADMIN", "MANAGER", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.user!.orgId! },
      include: {
        _count: { select: { users: true, distributors: true, leads: true, brainItems: true } },
      },
    });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    res.json({ org: { ...org, settings: safeParseJson(org.settings, {}) } });
  })
);

r.put(
  "/",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const { name, slug, logoUrl, primaryColor, settings } = req.body || {};
    const data: any = {};
    if (name) data.name = name;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (primaryColor) data.primaryColor = primaryColor;
    if (settings !== undefined) data.settings = JSON.stringify(settings);
    if (slug) {
      const clean = String(slug)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const clash = await prisma.organization.findFirst({ where: { slug: clean, id: { not: req.user!.orgId! } } });
      if (clash) return res.status(409).json({ error: "Slug ya en uso" });
      data.slug = clean;
    }
    const org = await prisma.organization.update({ where: { id: req.user!.orgId! }, data });
    audit({ orgId: req.user!.orgId, userId: req.user!.sub, action: "org.settings_update", entity: "organization", entityId: org.id, meta: { changed: Object.keys(data) } });
    res.json({ org: { ...org, settings: safeParseJson(org.settings, {}) } });
  })
);

/** Secuencias de follow-up (admin) */
r.get(
  "/sequences",
  requireRole("ADMIN", "MANAGER", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const seqs = await prisma.sequenceTemplate.findMany({
      where: { orgId: req.user!.orgId! },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items: seqs.map((s) => ({ ...s, steps: safeParseJson(s.steps, []) })) });
  })
);

r.post(
  "/sequences",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const { name, trigger, steps, active } = req.body || {};
    if (!name || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "Nombre y al menos un paso requeridos" });
    }
    const seq = await prisma.sequenceTemplate.create({
      data: {
        orgId: req.user!.orgId!,
        name: String(name),
        trigger: String(trigger || "NUTRICION"),
        steps: JSON.stringify(steps),
        active: active !== false,
      },
    });
    res.status(201).json({ item: { ...seq, steps: safeParseJson(seq.steps, []) } });
  })
);

r.patch(
  "/sequences/:id",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const existing = await prisma.sequenceTemplate.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "No encontrado" });
    const { name, trigger, steps, active } = req.body || {};
    const seq = await prisma.sequenceTemplate.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: String(name) } : {}),
        ...(trigger ? { trigger: String(trigger) } : {}),
        ...(steps ? { steps: JSON.stringify(steps) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });
    res.json({ item: { ...seq, steps: safeParseJson(seq.steps, []) } });
  })
);

r.delete(
  "/sequences/:id",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const existing = await prisma.sequenceTemplate.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "No encontrado" });
    await prisma.sequenceTemplate.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  })
);

/* ===================== Webhooks de salida ===================== */

/** Devuelve los webhooks de salida configurados en org.settings.outgoingWebhooks */
r.get(
  "/outgoing-webhooks",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    const settings = safeParseJson<any>(org.settings, {});
    res.json({ webhooks: settings.outgoingWebhooks ?? [], events: OUTGOING_EVENTS });
  })
);

/** Reemplaza la configuración de webhooks de salida */
r.put(
  "/outgoing-webhooks",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const { webhooks } = req.body || {};
    if (!Array.isArray(webhooks)) return res.status(400).json({ error: "'webhooks' debe ser un arreglo" });
    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    const settings = safeParseJson<any>(org.settings, {});
    const clean = webhooks
      .map((w: any) => ({
        id: w.id,
        label: String(w.label || "Webhook"),
        url: String(w.url || ""),
        secret: w.secret ? String(w.secret) : "",
        events: (Array.isArray(w.events) ? w.events : []).filter((e: unknown) => OUTGOING_EVENTS.includes(e as any)),
        enabled: w.enabled !== false,
      }))
      .filter((w: any) => w.url);
    settings.outgoingWebhooks = clean;
    await prisma.organization.update({
      where: { id: org.id },
      data: { settings: JSON.stringify(settings) },
    });
    res.json({ webhooks: clean, events: OUTGOING_EVENTS });
  })
);

/** Dispara un evento de prueba a un webhook de salida */
r.post(
  "/outgoing-webhooks/test",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const { id } = req.body || {};
    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    const hook = outgoingWebhooksOf(org).find((h) => h.id === id);
    if (!hook) return res.status(404).json({ error: "Webhook no encontrado o desactivado" });
    const result = await deliverNow(org, hook, "lead.created", { test: true, message: "Evento de prueba de DGI Quantrum" });
    audit({ orgId: org.id, userId: req.user!.sub, action: "webhook.test", entity: "webhook", entityId: hook.id, meta: { url: hook.url, ok: result.status === "ok" } });
    res.json({ ok: result.status === "ok", detail: result });
  })
);

/** Log de entregas de webhooks (entrantes y salientes) */
r.get(
  "/webhook-logs",
  requireRole("ADMIN", "MANAGER", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const pg = parsePage(req, 30, 100);
    const { provider } = req.query;
    const where: any = { orgId: req.user!.orgId! };
    if (provider) where.provider = { contains: String(provider) };
    const [items, total] = await Promise.all([
      prisma.webhookLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take }),
      prisma.webhookLog.count({ where }),
    ]);
    res.json({
      ...paged(items.map((l) => ({ ...l, payload: safeParseJson(l.payload, l.payload) })), total, pg),
    });
  })
);

export default r;