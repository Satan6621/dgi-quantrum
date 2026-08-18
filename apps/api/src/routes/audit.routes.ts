import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg, requireRole } from "../lib/middleware";
import { asyncHandler, parsePage, paged } from "../lib/helpers";

const r = Router();

r.use(requireAuth, requireOrg, requireRole("ADMIN", "PLATFORM"));

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const pg = parsePage(req);
    const action = String(req.query.action || "").trim();
    const where: any = { orgId: req.user!.orgId! };
    if (action) where.action = action;

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
    ]);
    const items = rows.map((l) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      meta: (() => { try { return JSON.parse(l.meta); } catch { return {}; } })(),
      createdAt: l.createdAt,
      actor: l.user ? `${l.user.name} <${l.user.email}>` : null,
    }));
    res.json(paged(items, total, pg));
  })
);

export default r;
