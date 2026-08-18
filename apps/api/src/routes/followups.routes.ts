import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler, parsePage, paged } from "../lib/helpers";

const r = Router();

r.use(requireAuth, requireOrg);

/** Follow-ups (scope por rol). Filtro opcional ?status & ?leadId */
r.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, leadId } = req.query;
    const pg = parsePage(req);
    const orgId = req.user!.orgId!;
    const where: any = { orgId };
    if (status) where.status = String(status);
    if (leadId) where.leadId = String(leadId);
    if (req.user!.role === "DISTRIBUTOR") {
      const leads = await prisma.lead.findMany({ where: { orgId, distributorId: req.user!.sub === null ? undefined : undefined }, select: { id: true } });
      const myDist = await prisma.distributor.findFirst({ where: { userId: req.user!.sub } });
      const myLeadIds = await prisma.lead.findMany({ where: { distributorId: myDist?.id }, select: { id: true } });
      where.leadId = { in: myLeadIds.map((l) => l.id) };
      void leads;
    }
    const items = await prisma.followUp.findMany({
      where,
      include: { lead: { select: { id: true, name: true, status: true, score: true } } },
      orderBy: { dueAt: "asc" },
      skip: pg.skip,
      take: pg.take,
    });
    const total = await prisma.followUp.count({ where });
    res.json({ ...paged(items, total, pg) });
  })
);

/** Marcar un follow-up manualmente (enviar / cancelar) */
r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const fu = await prisma.followUp.findFirst({ where: { id: req.params.id, orgId } });
    if (!fu) return res.status(404).json({ error: "No encontrado" });
    const { status } = req.body || {};
    const data: any = { status: String(status || fu.status) };
    if (String(status) === "SENT" && !fu.sentAt) data.sentAt = new Date();
    const updated = await prisma.followUp.update({ where: { id: fu.id }, data });
    res.json({ item: updated });
  })
);

export default r;