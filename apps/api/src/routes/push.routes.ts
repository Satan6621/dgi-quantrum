import { Router } from "express";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler } from "../lib/helpers";
import { notify } from "../lib/notify";

const r = Router();
r.use(requireAuth, requireOrg);

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const subscriptions = new Map<string, PushSubscription[]>();

r.post(
  "/subscribe",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Se requiere endpoint, keys.p256dh y keys.auth" });
    }
    const existing = subscriptions.get(orgId) || [];
    const exists = existing.some((s) => s.endpoint === endpoint);
    if (!exists) {
      existing.push({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
      subscriptions.set(orgId, existing);
    }
    await notify(orgId, {
      type: "system",
      title: "Suscripción push registrada",
      body: "Tu navegador ahora recibirá notificaciones push.",
    });
    res.json({ ok: true, total: existing.length });
  })
);

r.post(
  "/test",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const subs = subscriptions.get(orgId) || [];
    if (subs.length === 0) {
      return res.status(400).json({ error: "No hay suscripciones push registradas para esta organización" });
    }
    await notify(orgId, {
      type: "system",
      title: "Notificación push de prueba",
      body: "Si ves esto, las notificaciones push están configuradas correctamente.",
      link: req.body?.link ?? null,
    });
    res.json({ ok: true, sent: subs.length });
  })
);

r.get(
  "/status",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const subs = subscriptions.get(orgId) || [];
    res.json({
      supported: true,
      subscriptions: subs.length,
      endpoints: subs.map((s) => s.endpoint.slice(0, 50) + "..."),
    });
  })
);

export default r;
