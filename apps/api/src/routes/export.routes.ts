import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, requireOrg } from "../lib/middleware";
import { asyncHandler } from "../lib/helpers";
import { audit } from "../lib/audit";
import {
  renderExport,
  flattenLead,
  flattenBrain,
  flattenDistributor,
  flattenCommission,
  flattenFollowUp,
  flattenSession,
} from "../lib/export";

const r = Router();
r.use(requireAuth, requireOrg, requireRole("ADMIN", "MANAGER"));

const DEFS: Record<
  string,
  { headers: string[]; fetch: (orgId: string) => Promise<any[]>; flatten: (x: any) => (string | number | null)[] }
> = {
  leads: {
    headers: ["id", "name", "email", "phone", "source", "status", "score", "intent_level", "outcome", "distributor", "first_seen", "last_activity"],
    fetch: (orgId) => prisma.lead.findMany({ where: { orgId }, include: { distributor: { select: { name: true } } } }),
    flatten: flattenLead,
  },
  brain: {
    headers: ["id", "category", "title", "content", "keywords", "active"],
    fetch: (orgId) => prisma.brainItem.findMany({ where: { orgId } }),
    flatten: flattenBrain,
  },
  distributors: {
    headers: ["id", "name", "slug", "level", "points", "commission_balance", "sponsor", "variants"],
    fetch: (orgId) => prisma.distributor.findMany({ where: { orgId }, include: { sponsor: { select: { name: true } } } }),
    flatten: flattenDistributor,
  },
  commissions: {
    headers: ["id", "distributor", "type", "amount", "description", "created_at"],
    fetch: (orgId) => prisma.commission.findMany({ where: { orgId }, include: { distributor: { select: { name: true } } } }),
    flatten: flattenCommission,
  },
  followups: {
    headers: ["id", "lead", "phone", "kind", "scheduled_at", "sent_at", "status", "content"],
    fetch: (orgId) =>
      prisma.followUp.findMany({ where: { orgId }, include: { lead: { select: { name: true, phone: true } } } }),
    flatten: flattenFollowUp,
  },
  sessions: {
    headers: ["id", "distributor", "lead", "channel", "variant", "started_at", "ended_at", "messages"],
    fetch: (orgId) =>
      prisma.session.findMany({
        where: { orgId },
        include: { distributor: { select: { name: true } }, lead: { select: { name: true } }, messages: { select: { id: true } } },
      }),
    flatten: flattenSession,
  },
  analytics: {
    headers: ["metric", "value"],
    fetch: async (orgId) => {
      const leads = await prisma.lead.findMany({ where: { orgId }, select: { source: true, outcome: true, score: true, firstSeen: true, handoffAt: true, activatedAt: true, status: true } });
      const rows: Array<{ metric: string; value: string | number }> = [];
      const h = (ms: number) => Math.round((ms / 3600000) * 10) / 10;
      const toHandoff = leads.filter((l) => l.handoffAt).map((l) => h(l.handoffAt!.getTime() - l.firstSeen.getTime()));
      const hta = leads.filter((l) => l.handoffAt && l.activatedAt).map((l) => h(l.activatedAt!.getTime() - l.handoffAt!.getTime()));
      const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0);
      rows.push({ metric: "analytics.total", value: leads.length });
      rows.push({ metric: "analytics.avg_time_to_handoff_h", value: avg(toHandoff) });
      rows.push({ metric: "analytics.avg_handoff_to_activation_h", value: avg(hta) });
      rows.push({ metric: "analytics.activated", value: leads.filter((l) => l.activatedAt).length });
      const bySource = new Map<string, number>();
      for (const l of leads) bySource.set(l.source, (bySource.get(l.source) ?? 0) + 1);
      for (const [src, n] of bySource) rows.push({ metric: `source.${src || "?"}.created`, value: n });
      const weeks = new Map<string, number>();
      for (const l of leads) {
        const wk = l.firstSeen.toISOString().slice(0, 10);
        weeks.set(wk, (weeks.get(wk) ?? 0) + 1);
      }
      for (const [wk, n] of [...weeks.entries()].sort()) rows.push({ metric: `cohort.${wk}.created`, value: n });
      return rows;
    },
    flatten: (x) => [x.metric, x.value],
  },
};

r.get(
  "/:type",
  asyncHandler(async (req, res) => {
    const type = String(req.params.type);
    const def = DEFS[type];
    if (!def) return res.status(400).json({ error: `Tipo inválido. Disponibles: ${Object.keys(DEFS).join(", ")}` });
    const format = String(req.query.format || "csv").toLowerCase();
    if (!["csv", "json"].includes(format)) return res.status(400).json({ error: "Formato inválido (csv|json)" });

    const orgId = req.user!.orgId!;
    let fetchFn = def.fetch;

    if (type === "leads") {
      const { from, to, status, source } = req.query;
      fetchFn = async (orgId: string) => {
        const where: any = { orgId };
        if (from || to) {
          where.createdAt = {};
          if (from) where.createdAt.gte = new Date(String(from));
          if (to) where.createdAt.lte = new Date(String(to) + "T23:59:59.999Z");
        }
        if (status) where.status = String(status);
        if (source) where.source = String(source);
        return prisma.lead.findMany({ where, include: { distributor: { select: { name: true } } } });
      };
    }

    const rows = await fetchFn(orgId);
    const data = { headers: def.headers, rows: rows.map(def.flatten) };
    const out = renderExport(data, format, `dgi-quantrum-${type}-${new Date().toISOString().slice(0, 10)}`);
    audit({ orgId: req.user!.orgId, userId: req.user!.sub, action: "export.run", entity: type, meta: { format, rows: rows.length } });
    res.setHeader("Content-Type", out.contentType);
    res.setHeader("Content-Disposition", out.disposition);
    res.send(out.body);
  })
);

export default r;