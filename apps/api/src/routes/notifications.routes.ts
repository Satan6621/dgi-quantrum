import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler, parsePage, paged } from "../lib/helpers";

const r = Router();
r.use(requireAuth, requireOrg);

function scopeWhere(req: any): any {
  if (req.user.role === "ADMIN" || req.user.role === "MANAGER") return { orgId: req.user.orgId };
  return { orgId: req.user.orgId };
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = scopeWhere(req);
    const { unreadOnly } = req.query;
    if (unreadOnly === "true" || unreadOnly === "1") where.read = false;
    const pg = parsePage(req, 30, 100);
    const [items, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take }),
      prisma.notification.count({ where }),
    ]);
    const unread = await prisma.notification.count({ where: { ...scopeWhere(req), read: false } });
    res.json({ ...paged(items, total, pg), unread });
  })
);

r.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const n = await prisma.notification.findFirst({ where: { id: req.params.id, orgId: req.user!.orgId! } });
    if (!n) return res.status(404).json({ error: "No encontrada" });
    await prisma.notification.update({ where: { id: n.id }, data: { read: true } });
    res.json({ ok: true });
  })
);

r.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    const where = scopeWhere(req);
    await prisma.notification.updateMany({ where: { ...where, read: false }, data: { read: true } });
    res.json({ ok: true });
  })
);

export default r;