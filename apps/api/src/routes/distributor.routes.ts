import { Router } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { requireAuth, requireOrg, requireRole } from "../lib/middleware";
import { asyncHandler, safeParseJson, parsePage, paged } from "../lib/helpers";
import { checkLimit } from "../lib/billing";

const r = Router();

r.use(requireAuth, requireOrg);

const DISTRIBUTOR_FIELDS = [
  "name", "avatarUrl", "tone", "presentation", "language", "zone",
  "whatsapp", "calendarUrl", "socialLinks", "availability",
] as const;

/** Mi AI Twin (distribuidor) */
r.get(
  "/twin",
  asyncHandler(async (req, res) => {
    const dist = await prisma.distributor.findFirst({
      where: { userId: req.user!.sub },
      include: { _count: { select: { leads: true, sessions: true } } },
    });
    if (!dist) return res.status(404).json({ error: "No tienes un AI Twin configurado" });
    res.json({
      twin: {
        ...dist,
        socialLinks: safeParseJson(dist.socialLinks, {}),
        availability: safeParseJson(dist.availability, {}),
      },
    });
  })
);

r.put(
  "/twin",
  asyncHandler(async (req, res) => {
    const dist = await prisma.distributor.findFirst({ where: { userId: req.user!.sub } });
    if (!dist) return res.status(404).json({ error: "No tienes un AI Twin configurado" });
    const body = req.body || {};
    const data: any = {};
    for (const f of DISTRIBUTOR_FIELDS) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.socialLinks !== undefined && typeof body.socialLinks === "object") {
      data.socialLinks = JSON.stringify(body.socialLinks);
    }
    if (body.availability !== undefined && typeof body.availability === "object") {
      data.availability = JSON.stringify(body.availability);
    }
    if (body.name) {
      const slug = String(body.name)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const clash = await prisma.distributor.findFirst({ where: { slug, id: { not: dist.id } } });
      if (!clash) data.slug = slug;
      data.name = body.name;
    }
    const updated = await prisma.distributor.update({ where: { id: dist.id }, data });
    res.json({
      twin: {
        ...updated,
        socialLinks: safeParseJson(updated.socialLinks, {}),
        availability: safeParseJson(updated.availability, {}),
      },
    });
  })
);

/* ===================== ADMIN: gestión de distribuidores ===================== */

r.get(
  "/",
  requireRole("ADMIN", "MANAGER", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const { q } = req.query;
    const pg = parsePage(req);
    const where: any = { orgId };
    if (q) {
      const term = String(q);
      where.OR = [{ name: { contains: term } }, { slug: { contains: term } }];
    }
    const [dists, total] = await Promise.all([
      prisma.distributor.findMany({
        where,
        include: {
          user: { select: { email: true, name: true } },
          _count: { select: { leads: true, sessions: true } },
        },
        orderBy: { createdAt: "asc" },
        skip: pg.skip,
        take: pg.take,
      }),
      prisma.distributor.count({ where }),
    ]);
    const rows = await Promise.all(
      dists.map(async (d) => {
        const stats = await prisma.lead.aggregate({
          where: { distributorId: d.id },
          _avg: { score: true },
          _count: true,
        });
        const high = await prisma.lead.count({ where: { distributorId: d.id, outcome: "ALTA_INTENCION" } });
        return {
          id: d.id,
          name: d.name,
          slug: d.slug,
          email: d.user.email,
          avatarUrl: d.avatarUrl,
          status: d.status,
          funnelEnabled: d.funnelEnabled,
          funnelUrl: `/f/${d.slug}`,
          createdAt: d.createdAt,
          leads: stats._count,
          avgScore: Math.round(stats._avg.score ?? 0),
          highIntent: high,
          sessions: d._count.sessions,
          variants: safeParseJson(d.variants, []),
        };
      })
    );
    res.json({ ...paged(rows, total, pg) });
  })
);

r.post(
  "/",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const { name, email, password, presentation, avatarUrl, tone, whatsapp, calendarUrl } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nombre, email y contraseña requeridos" });
    }
    const emailClean = String(email).toLowerCase().trim();
    if (await prisma.user.findUnique({ where: { email: emailClean } })) {
      return res.status(409).json({ error: "Ese email ya está registrado" });
    }
    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organización no encontrada" });
    await checkLimit(org, "distributors");
    const slug = String(name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const user = await prisma.user.create({
      data: {
        orgId: req.user!.orgId!,
        role: "DISTRIBUTOR",
        email: emailClean,
        name: String(name),
        passwordHash: await hashPassword(String(password)),
      },
    });
    const dist = await prisma.distributor.create({
      data: {
        orgId: req.user!.orgId!,
        userId: user.id,
        name: String(name),
        slug,
        avatarUrl: avatarUrl || null,
        presentation: presentation || `Hola, soy ${name}. Te acompaño a conocer esta oportunidad paso a paso.`,
        tone: tone || "cercano y profesional",
        whatsapp: whatsapp || null,
        calendarUrl: calendarUrl || null,
      },
    });
    res.status(201).json({ item: { id: dist.id, name: dist.name, slug: dist.slug, funnelUrl: `/f/${dist.slug}` } });
  })
);

r.patch(
  "/:id",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const existing = await prisma.distributor.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "No encontrado" });
    const body = req.body || {};
    const data: any = {};
    for (const f of DISTRIBUTOR_FIELDS) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.status !== undefined) data.status = body.status;
    if (body.funnelEnabled !== undefined) data.funnelEnabled = Boolean(body.funnelEnabled);
    const updated = await prisma.distributor.update({ where: { id: existing.id }, data });
    res.json({ item: { id: updated.id, name: updated.name, slug: updated.slug, funnelEnabled: updated.funnelEnabled, status: updated.status } });
  })
);

/** Variantes A/B del AI Twin (admin) */
r.put(
  "/:id/variants",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const existing = await prisma.distributor.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "No encontrado" });
    const { variants } = req.body || {};
    if (!Array.isArray(variants)) return res.status(400).json({ error: "'variants' debe ser un arreglo" });
    const clean = variants.map((v) => ({
      id: v.id,
      name: v.name,
      tone: v.tone,
      presentation: v.presentation,
      color: v.color,
      weight: Number(v.weight) || 1,
    }));
    const updated = await prisma.distributor.update({
      where: { id: existing.id },
      data: { variants: JSON.stringify(clean) },
    });
    res.json({ variants: JSON.parse(updated.variants) });
  })
);

export default r;