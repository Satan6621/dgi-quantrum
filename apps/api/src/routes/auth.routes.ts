import { Router } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../lib/middleware";
import { asyncHandler } from "../lib/helpers";
import { createRefreshToken, rotateRefreshToken, revokeRefreshToken, hashRefresh } from "../lib/refresh";
import { provisionOrg } from "../lib/provision";
import { audit } from "../lib/audit";

const r = Router();

export function publicUser(u: any) {
  return {
    id: u.id,
    orgId: u.orgId,
    role: u.role,
    email: u.email,
    name: u.name,
    active: u.active,
    distributorId: u.distributor?.id ?? null,
    distributorSlug: u.distributor?.slug ?? null,
    orgName: u.org?.name ?? null,
  };
}

export async function issueSession(user: any) {
  const refreshToken = await createRefreshToken(user.id);
  const token = signToken({ sub: user.id, orgId: user.orgId, role: user.role, name: user.name });
  return { token, refreshToken, user: publicUser(user) };
}

r.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email y contraseña requeridos" });
    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      include: { distributor: true, org: true },
    });
    if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
      audit({ userId: user?.id ?? null, orgId: user?.orgId ?? null, action: "auth.login_failed", entity: "user", meta: { email } });
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    if (user.active === false) {
      return res.status(403).json({ error: "Tu cuenta está desactivada. Contacta al administrador." });
    }
    audit({ userId: user.id, orgId: user.orgId, action: "auth.login", entity: "user", entityId: user.id });
    res.json(await issueSession(user));
  })
);

r.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: "refreshToken requerido" });
    const candidate = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefresh(String(refreshToken)) } });
    if (!candidate) return res.status(401).json({ error: "Sesión inválida" });
    const owner = await prisma.user.findUnique({
      where: { id: candidate.userId },
      include: { distributor: true, org: true },
    });
    if (!owner || owner.active === false) return res.status(401).json({ error: "Sesión inválida" });
    const newRefresh = await rotateRefreshToken(String(refreshToken), owner.id);
    if (!newRefresh) return res.status(401).json({ error: "Sesión expirada, vuelve a iniciar sesión" });
    audit({ userId: owner.id, orgId: owner.orgId, action: "auth.refresh", entity: "user", entityId: owner.id });
    res.json(await issueSession(owner));
  })
);

r.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      await revokeRefreshToken(String(refreshToken));
      audit({ userId: req.user?.sub, orgId: req.user?.orgId, action: "auth.logout", entity: "user", entityId: req.user?.sub });
    }
    res.json({ ok: true });
  })
);

r.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      include: { distributor: true, org: true },
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ user: publicUser(user) });
  })
);

/** Alta self-serve de una organización: provisiona brain, secuencia y AI Twin. */
r.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { name, orgName, slug, email, password } = req.body || {};
    if (!name || !orgName || !email || !password) {
      return res.status(400).json({ error: "Nombre, organización, email y contraseña requeridos" });
    }
    if (password.length < 6) return res.status(400).json({ error: "Contraseña de mínimo 6 caracteres" });
    const orgSlug = (slug || orgName)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (orgSlug.length < 2) return res.status(400).json({ error: "Elige un slug para tu organización" });
    const exists = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (exists) return res.status(409).json({ error: "Ese nombre de organización ya está en uso" });
    const emailClean = String(email).toLowerCase().trim();
    if (await prisma.user.findUnique({ where: { email: emailClean } })) {
      return res.status(409).json({ error: "Ese email ya está registrado" });
    }

    const org = await prisma.organization.create({
      data: { name: orgName, slug: orgSlug, plan: "TRIAL" },
    });

    const user = await prisma.user.create({
      data: {
        orgId: org.id,
        role: "ADMIN",
        email: emailClean,
        name,
        passwordHash: await hashPassword(String(password)),
      },
    });

    await provisionOrg(org.id, user.id, name);

    audit({ orgId: org.id, userId: user.id, action: "org.signup", entity: "organization", entityId: org.id, meta: { slug: orgSlug, plan: "TRIAL" } });

    const session = await issueSession({ ...user, org: { name: org.name }, distributor: null });
    res.status(201).json({ ...session, orgSlug });
  })
);

export default r;
