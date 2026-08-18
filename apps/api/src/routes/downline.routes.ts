import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler } from "../lib/helpers";
import { buildTree, teamStats } from "../lib/downline";

const r = Router();
r.use(requireAuth, requireOrg);

async function distributorIdOf(req: any) {
  if (req.user.role === "ADMIN" || req.user.role === "MANAGER") return null;
  const d = await prisma.distributor.findFirst({ where: { userId: req.user.sub } });
  return d?.id ?? null;
}

/** Resumen del panel de red (downline / gamificación / comisiones) */
r.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const distId = await distributorIdOf(req);
    if (!distId) {
      const me = await prisma.distributor.findMany({ where: { orgId }, select: { id: true, name: true, level: true, points: true, commissionBalance: true } });
      const totalCommissions = await prisma.commission.aggregate({ where: { orgId }, _sum: { amount: true } });
      const activations = await prisma.lead.count({ where: { orgId, status: "DISTRIBUTOR" } });
      const leaders = await prisma.distributor.findMany({ where: { orgId }, orderBy: { points: "desc" }, take: 10, select: { id: true, name: true, level: true, points: true } });
      return res.json({
        role: "ADMIN",
        distributors: me,
        activations,
        commissionsTotal: totalCommissions._sum.amount ?? 0,
        leaderboard: leaders,
      });
    }
    const stats = await teamStats(orgId, distId);
    const commissions = await prisma.commission.findMany({
      where: { orgId, distributorId: distId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ role: "DISTRIBUTOR", stats, commissions });
  })
);

/** Árbol de red */
r.get(
  "/tree",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const distId = await distributorIdOf(req);
    const tree = await buildTree(orgId, distId ? [distId] : undefined);
    res.json({ tree });
  })
);

export default r;