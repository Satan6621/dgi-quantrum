import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler, safeParseJson } from "../lib/helpers";
import { inboundMessage } from "../lib/inbound";
import { channelCfg } from "../lib/channels";
import { verifyTwilioSignature, verifyMetaSignature, parseTwilioPayload, parseMetaPayload, WsMessage } from "../lib/whatsapp";
import { env } from "../env";
import { notify } from "../lib/notify";
import { fire } from "../lib/outgoing";

const r = Router();

async function loadOrg(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

/**
 * Endpoints públicos de integración (WhatsApp / Twilio / Meta / Cal.com / genérico).
 * La organización se identifica por su slug en la URL.
 */

/** Verificación GET de webhook (Meta WhatsApp Cloud API): responde el challenge. */
r.get(
  "/:orgSlug/whatsapp",
  asyncHandler(async (req, res) => {
    const org = await loadOrg(req.params.orgSlug);
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    const cfg = channelCfg(org, "whatsapp");
    if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === cfg.metaVerifyToken) {
      return res.send(String(req.query["hub.challenge"] ?? ""));
    }
    res.status(403).json({ error: "Verificación fallida" });
  })
);

r.post(
  "/:orgSlug/whatsapp",
  asyncHandler(async (req, res) => {
    const org = await loadOrg(req.params.orgSlug);
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    const cfg = channelCfg(org, "whatsapp");
    const provider = cfg?.provider === "meta" ? "meta" : "twilio";
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));
    let parsed: WsMessage | null = null;

    if (provider === "meta") {
      const sig = String(req.headers["x-hub-signature-256"] || "");
      if (!verifyMetaSignature(cfg.webhookSecret || "", rawBody, sig)) {
        return res.status(401).json({ error: "Firma de Meta inválida" });
      }
      parsed = parseMetaPayload(req.body);
    } else {
      // Twilio: firma X-Twilio-Signature si hay credenciales; si no, X-Webhook-Secret opcional
      if (cfg.webhookSecret && cfg.webhookSecret !== req.headers["x-webhook-secret"]) {
        return res.status(401).json({ error: "Secret inválido" });
      }
      if (env.TWILIO_AUTH_TOKEN) {
        const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
        const params: Record<string, any> = { ...(req.body || {}), ...(req.query || {}) };
        const sig = String(req.headers["x-twilio-signature"] || "");
        if (!verifyTwilioSignature(env.TWILIO_AUTH_TOKEN, fullUrl, params, sig)) {
          return res.status(401).json({ error: "Firma de Twilio inválida" });
        }
      }
      parsed = parseTwilioPayload(req.body);
    }

    if (!parsed) return res.status(400).json({ error: "Formato de mensaje no reconocido" });
    const distributorSlug = req.query.distributor ? String(req.query.distributor) : null;
    const result = await inboundMessage({
      org,
      channel: "whatsapp",
      distributorSlug,
      from: parsed.from,
      text: parsed.text,
      sid: parsed.sid,
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