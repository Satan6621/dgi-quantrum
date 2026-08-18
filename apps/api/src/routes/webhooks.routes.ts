import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler, safeParseJson } from "../lib/helpers";
import { inboundMessage } from "../lib/inbound";
import { channelCfg } from "../lib/channels";
import { notify } from "../lib/notify";
import { fire } from "../lib/outgoing";

const r = Router();

async function loadOrg(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

/**
 * Endpoints públicos de integración (WhatsApp / Twilio / Cal.com / genérico).
 * La organización se identifica por su slug en la URL. Opcionalmente se exige
 * X-Webhook-Secret si la organización lo configura.
 */
r.post(
  "/:orgSlug/whatsapp",
  asyncHandler(async (req, res) => {
    const org = await loadOrg(req.params.orgSlug);
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    const cfg = channelCfg(org, "whatsapp");
    if (cfg.webhookSecret && cfg.webhookSecret !== req.headers["x-webhook-secret"]) {
      return res.status(401).json({ error: "Secret inválido" });
    }
    const body = req.body || {};
    const from = body.From || body.from || body.wa_id || body.sender;
    const text = body.Body || body.body || body.text || body.message;
    if (!from || !text) return res.status(400).json({ error: "Faltan 'from' y 'text'" });
    const distributorSlug = req.query.distributor ? String(req.query.distributor) : null;
    const result = await inboundMessage({
      org,
      channel: "whatsapp",
      distributorSlug,
      from,
      text,
    });
    res.json(result);
  })
);

/** Genérico: mapea {from, text} (Twilio, Meta, HTTP-SMS...) */
r.post(
  "/:orgSlug/generic",
  asyncHandler(async (req, res) => {
    const org = await loadOrg(req.params.orgSlug);
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    const body = req.body || {};
    const from = String(body.from || body.phone || body.sender || "");
    const text = String(body.text || body.body || body.message || "");
    if (!from || !text) return res.status(400).json({ error: "Faltan 'from' y 'text'" });
    const distributorSlug = req.query.distributor ? String(req.query.distributor) : null;
    const result = await inboundMessage({ org, channel: "generic", distributorSlug, from, text });
    res.json(result);
  })
);

/**
 * Cal.com (BOOKING_CREATED): crea la cita y empuja el lead a ONBOARDING.
 */
r.post(
  "/:orgSlug/calcom",
  asyncHandler(async (req, res) => {
    const org = await loadOrg(req.params.orgSlug);
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    const body = req.body || {};
    const payload = body.payload || body;
    const invitee = payload.responses?.email?.value || payload.attendees?.[0]?.email || body.inviteeEmail;
    if (!invitee) return res.status(400).json({ error: "Falta el email del invitado" });

    const lead = await prisma.lead.findFirst({ where: { orgId: org.id, email: invitee } });
    if (lead) {
      const orgSettings = safeParseJson<any>(org.settings, {});
      const checklist: string[] = orgSettings.onboardingChecklist ?? [];
      await prisma.onboardingTask.deleteMany({ where: { leadId: lead.id } });
      for (const [i, t] of checklist.entries()) {
        await prisma.onboardingTask.create({ data: { orgId: org.id, leadId: lead.id, title: t, order: i } });
      }
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "ONBOARDING", outcome: "AGENDADA", intentLevel: "HIGH", lastActivity: new Date() },
      });
      const twin = lead.distributorId
        ? await prisma.distributor.findUnique({ where: { id: lead.distributorId } })
        : null;
      await notify(org.id, {
        distributorId: twin?.id ?? null,
        type: "booking",
        title: "Cita agendada 📅",
        body: `${lead.name ?? invitee} agendó una llamada por Cal.com.`,
        link: "/app/leads",
      });
      await fire(org, "lead.onboarding", {
        leadId: lead.id,
        name: lead.name ?? invitee,
        email: invitee,
        distributorId: twin?.id ?? null,
        source: "calcom",
      });
    }
    await prisma.webhookLog.create({
      data: { orgId: org.id, provider: "calcom", payload: JSON.stringify(body).slice(0, 4000), status: "processed" },
    });
    res.json({ ok: true });
  })
);

/** Simulador (auth): WhatsApp/calcom simulados desde el panel */
r.post(
  "/simulate/:orgSlug/:channel",
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const org = await loadOrg(req.params.orgSlug);
    if (!org || org.id !== req.user!.orgId) {
      return res.status(404).json({ error: "Organización no encontrada" });
    }
    const channel = String(req.params.channel);
    const { distributorSlug, from, text } = req.body || {};
    if (!from || !text) return res.status(400).json({ error: "Faltan 'from' y 'text'" });
    const result = await inboundMessage({ org, channel, distributorSlug: distributorSlug ?? null, from, text });
    res.json(result);
  })
);

export default r;