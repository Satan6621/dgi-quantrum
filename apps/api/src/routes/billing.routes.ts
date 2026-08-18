import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler } from "../lib/helpers";
import { billingView, createCheckout, PLANS, verifyStripeWebhook, handleStripeEvent } from "../lib/billing";
import { env } from "../env";
import { audit } from "../lib/audit";

/** Webhook de Stripe (público, verifica la firma). Montado en app.ts antes del router autenticado. */
export const stripeWebhook = Router();

stripeWebhook.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET no configurado" });
    }
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const signature = String(req.headers["stripe-signature"] || "");
    if (!verifyStripeWebhook(env.STRIPE_WEBHOOK_SECRET, rawBody, signature)) {
      return res.status(401).json({ error: "Firma de Stripe inválida" });
    }
    const result = await handleStripeEvent(req.body);
    res.json({ received: true, ...result });
  })
);

const r = Router();
r.use(requireAuth, requireOrg);

r.get("/plans", (_req, res) => res.json({ plans: Object.values(PLANS) }));

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    res.json({ billing: await billingView(org) });
  })
);

/** Checkout: Stripe si hay clave, si no factura simulada (demo). */
r.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    const { planId } = req.body || {};
    if (!planId || !PLANS[planId]) return res.status(400).json({ error: "Plan inválido" });
    const result = await createCheckout(org, String(planId));
    audit({ orgId: req.user!.orgId, userId: req.user!.sub, action: "billing.plan_change", entity: "organization", entityId: org.id, meta: { from: org.plan, to: planId } });
    res.json({ ...result, planId });
  })
);

export default r;