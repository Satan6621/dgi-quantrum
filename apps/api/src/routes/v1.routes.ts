import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, leadView, parsePage, paged } from "../lib/helpers";
import { authApiKey, rateLimit } from "../lib/apikey";

const r = Router();

declare global {
  namespace Express {
    interface Request {
      apiOrgId?: string;
    }
  }
}

function hasScope(scopes: string[], needed: string) {
  return scopes.includes(needed) || scopes.includes("*");
}

/** Middleware: valida API key, rate-limit 60/min y scope. */
function guard(scope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = await authApiKey(req);
    if (!auth) return res.status(401).json({ error: "API key inválida o revocada" });
    const rl = rateLimit(auth.orgId, 60, 60000);
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil((rl.reset - Date.now()) / 1000)));
    if (!rl.ok) return res.status(429).json({ error: "Rate limit superado. Máximo 60 peticiones/min." });
    if (!hasScope(auth.scopes, scope)) return res.status(403).json({ error: `Tu API key no tiene el scope '${scope}'` });
    req.apiOrgId = auth.orgId;
    next();
  };
}

r.get(
  "/leads",
  guard("leads:read"),
  asyncHandler(async (req, res) => {
    const pg = parsePage(req);
    const where: any = { orgId: req.apiOrgId! };
    if (req.query.status) where.status = String(req.query.status);
    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: { distributor: { select: { name: true } } },
        orderBy: { lastActivity: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      prisma.lead.count({ where }),
    ]);
    res.json({
      ...paged(
        items.map((l) => {
          const view = leadView(l);
          return { id: view.id, name: view.name, email: view.email, phone: view.phone, source: view.source, status: view.status, score: view.score, intentLevel: view.intentLevel, outcome: view.outcome, distributorName: view.distributorName, firstSeen: view.firstSeen, lastActivity: view.lastActivity };
        }),
        total,
        pg
      ),
    });
  })
);

r.get(
  "/leads/:id",
  guard("leads:read"),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, orgId: req.apiOrgId! } });
    if (!lead) return res.status(404).json({ error: "No encontrado" });
    res.json({ lead: leadView(lead) });
  })
);

r.get(
  "/analytics",
  guard("analytics:read"),
  asyncHandler(async (req, res) => {
    const orgId = req.apiOrgId!;
    const [total, highIntent, onboarded, conversations] = await Promise.all([
      prisma.lead.count({ where: { orgId } }),
      prisma.lead.count({ where: { orgId, outcome: "ALTA_INTENCION" } }),
      prisma.lead.count({ where: { orgId, outcome: "ONBOARDED" } }),
      prisma.session.count({ where: { orgId } }),
    ]);
    res.json({
      totalLeads: total,
      highIntent,
      conversions: onboarded,
      conversations,
      conversionRate: total > 0 ? Math.round((onboarded / total) * 100) : 0,
    });
  })
);

r.get(
  "/brain",
  guard("brain:read"),
  asyncHandler(async (req, res) => {
    const items = await prisma.brainItem.findMany({
      where: { orgId: req.apiOrgId!, active: true },
      select: { id: true, category: true, title: true, content: true, keywords: true },
    });
    res.json({ items });
  })
);

export default r;