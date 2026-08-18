import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg, requireRole } from "../lib/middleware";
import { asyncHandler } from "../lib/helpers";
import { hashPassword } from "../lib/password";
import { audit } from "../lib/audit";

const r = Router();

r.use(requireAuth, requireOrg, requireRole("ADMIN", "PLATFORM"));

const ROLES = ["MANAGER", "DISTRIBUTOR", "ADMIN"];

function genTempPassword() {
  return `Naio-${Math.random().toString(36).slice(2, 8)}`;
}

function memberView(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    distributorSlug: u.distributor?.slug ?? null,
    createdAt: u.createdAt,
  };
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { orgId: req.user!.orgId! },
      include: { distributor: { select: { slug: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ members: users.map(memberView) });
  })
);

r.post(
  "/invite",
  asyncHandler(async (req, res) => {
    const { email, name, role, password } = req.body || {};
    if (!email || !name) return res.status(400).json({ error: "Email y nombre requeridos" });
    if (!ROLES.includes(role)) return res.status(400).json({ error: "Rol inválido. Usa MANAGER o DISTRIBUTOR" });
    const emailClean = String(email).toLowerCase().trim();
    if (await prisma.user.findUnique({ where: { email: emailClean } })) {
      return res.status(409).json({ error: "Ese email ya está registrado" });
    }
    if (role === "ADMIN" && req.user!.role !== "PLATFORM") {
      return res.status(403).json({ error: "Solo la plataforma puede asignar el rol ADMIN" });
    }
    const tempPassword = password && String(password).length >= 6 ? String(password) : genTempPassword();
    const user = await prisma.user.create({
      data: { orgId: req.user!.orgId!, role, email: emailClean, name, passwordHash: await hashPassword(tempPassword) },
      include: { distributor: { select: { slug: true } } },
    });
    audit({ orgId: req.user!.orgId, userId: req.user!.sub, action: "team.invite", entity: "user", entityId: user.id, meta: { email: emailClean, role } });
    res.status(201).json({ member: memberView(user), tempPassword: password ? undefined : tempPassword });
  })
);

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findFirst({ where: { id: req.params.id, orgId: req.user!.orgId! } });
    if (!target) return res.status(404).json({ error: "Miembro no encontrado" });

    const { role, active, name } = req.body || {};
    const data: any = {};
    if (name !== undefined) data.name = String(name);
    if (role !== undefined) {
      if (!ROLES.includes(role)) return res.status(400).json({ error: "Rol inválido" });
      if (role === "ADMIN" && req.user!.role !== "PLATFORM") {
        return res.status(403).json({ error: "Solo la plataforma puede asignar el rol ADMIN" });
      }
      data.role = role;
    }
    if (active !== undefined) data.active = Boolean(active);

    // Protección: no desactivar/quitar el rol del último admin activo (ni a uno mismo).
    if (target.role === "ADMIN" && (data.active === false || (data.role && data.role !== "ADMIN"))) {
      const admins = await prisma.user.count({ where: { orgId: req.user!.orgId!, role: "ADMIN", active: true, id: { not: target.id } } });
      if (admins === 0) return res.status(400).json({ error: "No puedes desactivar al último administrador de la organización" });
    }
    if (req.params.id === req.user!.sub && (data.active === false || (data.role && data.role !== req.user!.role))) {
      return res.status(400).json({ error: "No puedes modificar tu propio acceso" });
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data,
      include: { distributor: { select: { slug: true } } },
    });
    audit({ orgId: req.user!.orgId, userId: req.user!.sub, action: "team.update", entity: "user", entityId: target.id, meta: { data } });
    res.json({ member: memberView(updated) });
  })
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.sub) return res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
    const target = await prisma.user.findFirst({ where: { id: req.params.id, orgId: req.user!.orgId! } });
    if (!target) return res.status(404).json({ error: "Miembro no encontrado" });
    if (target.role === "ADMIN") {
      const admins = await prisma.user.count({ where: { orgId: req.user!.orgId!, role: "ADMIN", active: true, id: { not: target.id } } });
      if (admins === 0) return res.status(400).json({ error: "No puedes eliminar al último administrador" });
    }
    await prisma.$transaction([
      prisma.distributor.deleteMany({ where: { userId: target.id } }),
      prisma.refreshToken.deleteMany({ where: { userId: target.id } }),
      prisma.user.delete({ where: { id: target.id } }),
    ]);
    audit({ orgId: req.user!.orgId, userId: req.user!.sub, action: "team.delete", entity: "user", entityId: target.id, meta: { email: target.email } });
    res.json({ ok: true });
  })
);

export default r;
