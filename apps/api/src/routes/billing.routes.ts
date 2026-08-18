import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler } from "../lib/helpers";
import { billingView, createCheckout, PLANS } from "../lib/billing";
import { audit } from "../lib/audit";

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