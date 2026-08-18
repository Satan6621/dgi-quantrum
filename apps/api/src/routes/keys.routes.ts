import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler } from "../lib/helpers";
import { checkLimit } from "../lib/billing";
import { generateApiKey, hashKey, keyScopes } from "../lib/apikey";
import { audit } from "../lib/audit";

const r = Router();
r.use(requireAuth, requireOrg);

async function orgOf(req: any) {
  return prisma.organization.findUnique({ where: { id: req.user.orgId } });
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const keys = await prisma.apiKey.findMany({
      where: { orgId: req.user!.orgId! },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, keyPrefix: true, scopes: true, revoked: true, lastUsedAt: true, createdAt: true },
    });
    res.json({ items: keys });
  })
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const org = await orgOf(req);
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    await checkLimit(org, "keys");
    const { name, scopes } = req.body || {};
    if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
    const scopesArr = Array.isArray(scopes) ? scopes : ["leads:read", "analytics:read"];
    const key = generateApiKey(org.slug);
    const created = await prisma.apiKey.create({
      data: {
        orgId: org.id,
        name: String(name),
        keyPrefix: key.slice(0, key.lastIndexOf("_") + 1),
        keyHash: hashKey(key),
        scopes: keyScopes(scopesArr),
      },
    });
    audit({ orgId: req.user!.orgId, userId: req.user!.sub, action: "keys.create", entity: "apikey", entityId: created.id, meta: { name: String(name), scopes: scopesArr } });
    res.status(201).json({ key: { id: created.id, name: created.name, scopes: scopesArr }, rawKey: key });
  })
);

r.patch(
  "/:id/revoke",
  asyncHandler(async (req, res) => {
    const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, orgId: req.user!.orgId! } });
    if (!key) return res.status(404).json({ error: "Clave no encontrada" });
    await prisma.apiKey.update({ where: { id: key.id }, data: { revoked: true } });
    res.json({ ok: true });
  })
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, orgId: req.user!.orgId! } });
    if (!key) return res.status(404).json({ error: "Clave no encontrada" });
    await prisma.apiKey.delete({ where: { id: key.id } });
    audit({ orgId: req.user!.orgId, userId: req.user!.sub, action: "keys.delete", entity: "apikey", entityId: key.id, meta: { name: key.name } });
    res.json({ ok: true });
  })
);

export default r;