import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../lib/middleware";
import { asyncHandler } from "../lib/helpers";
import { getCached, setCache } from "../lib/cache";

const r = Router();

r.use(requireAuth, requireOrg);

async function leadWhere(req: any): Promise<any> {
  const orgId = req.user.orgId;
  if (req.user.role === "DISTRIBUTOR") {
    const dist = await prisma.distributor.findFirst({ where: { userId: req.user.sub } });
    return { orgId, distributorId: dist?.id ?? "__none__" };
  }
  return { orgId };
}

function stat(nums: number[]): { avg: number; median: number } {
  if (nums.length === 0) return { avg: 0, median: 0 };
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const round = (n: number) => Math.round(n * 10) / 10;
  return { avg: round(nums.reduce((a, b) => a + b, 0) / nums.length), median: round(median) };
}

async function overviewData(req: any): Promise<any> {
  const where = await leadWhere(req);
  const orgId = req.user!.orgId!;
  const [total, inConversation, high, nutrition, disqualified, onboarded, conversations, pendingFollowups] =
    await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, status: "IN_CONVERSATION" } }),
      prisma.lead.count({ where: { ...where, outcome: "ALTA_INTENCION" } }),
      prisma.lead.count({ where: { ...where, status: "NUTRITION" } }),
      prisma.lead.count({ where: { ...where, outcome: "NO_APTO" } }),
      prisma.lead.count({ where: { ...where, outcome: "ONBOARDED" } }),
      prisma.session.count({ where: { orgId } }),
      prisma.followUp.count({ where: { orgId, status: "PENDING", dueAt: { lte: new Date(Date.now() + 86400000) } } }),
    ]);
  const scored = await prisma.lead.aggregate({ where, _avg: { score: true } });
  const toHandoff = await prisma.lead.count({ where: { ...where, status: { in: ["HANDOFF", "ONBOARDING"] } } });
  const conversion = total > 0 ? Math.round(((onboarded + toHandoff) / total) * 100) : 0;
  return {
    total,
    inConversation,
    high,
    nutrition,
    disqualified,
    onboarded,
    toHandoff,
    conversations,
    pendingFollowups,
    avgScore: Math.round((scored._avg.score ?? 0) * 10) / 10,
    conversion,
  };
}

async function velocityMetrics(req: any): Promise<any> {
  const where = await leadWhere(req);
  const orgId = req.user!.orgId!;
  const leads = await prisma.lead.findMany({
    where: { ...where, OR: [{ handoffAt: { not: null } }, { activatedAt: { not: null } }] },
    select: { firstSeen: true, handoffAt: true, activatedAt: true, status: true },
  });
  const h = (ms: number) => ms / 3600000;

  const toHandoff = leads.filter((l) => l.handoffAt).map((l) => h(l.handoffAt!.getTime() - l.firstSeen.getTime()));
  const handoffToActivation = leads
    .filter((l) => l.handoffAt && l.activatedAt)
    .map((l) => h(l.activatedAt!.getTime() - l.handoffAt!.getTime()));

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const slaHours = Number(JSON.parse(org?.settings || "{}").slaHours ?? 24);
  const resolved = leads.filter((l) => l.activatedAt);
  const withinSla = resolved.filter((l) => h(l.activatedAt!.getTime() - l.handoffAt!.getTime()) <= slaHours);
  const pending = leads.filter((l) => l.status === "HANDOFF");

  // Latencia del motor: intervalo usuario → respuesta IA (por sesión, último salto del último usuario)
  const sessions = await prisma.session.findMany({
    where: { orgId, startedAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    select: { id: true },
  });
  const replyDiffs: number[] = [];
  for (const s of sessions) {
    const msgs = await prisma.message.findMany({
      where: { sessionId: s.id },
      orderBy: { ts: "asc" },
      select: { role: true, ts: true },
    });
    for (let i = 1; i < msgs.length; i++) {
      if (msgs[i].role === "AI" && msgs[i - 1].role === "USER") {
        replyDiffs.push(msgs[i].ts.getTime() - msgs[i - 1].ts.getTime());
      }
    }
  }

  return {
    avgTimeToHandoffH: stat(toHandoff).avg,
    medianTimeToHandoffH: stat(toHandoff).median,
    avgHandoffToActivationH: stat(handoffToActivation).avg,
    medianHandoffToActivationH: stat(handoffToActivation).median,
    handoffSlaHours: slaHours,
    handoffsResolved: resolved.length,
    handoffsResolvedWithinSla: withinSla.length,
    handoffsSlaCompliance: resolved.length > 0 ? Math.round((withinSla.length / resolved.length) * 100) : 0,
    handoffsPending: pending.length,
    avgAiReplyMs: replyDiffs.length > 0 ? Math.round(replyDiffs.reduce((a, b) => a + b, 0) / replyDiffs.length) : 0,
    sampleSize: toHandoff.length,
  };
}

async function sourceFunnel(req: any): Promise<any> {
  const where = await leadWhere(req);
  const leads = await prisma.lead.findMany({ where, select: { source: true, outcome: true, score: true } });
  const by = new Map<string, { total: number; high: number; onboarded: number; disqualified: number; scoreSum: number }>();
  for (const l of leads) {
    const s = by.get(l.source) ?? { total: 0, high: 0, onboarded: 0, disqualified: 0, scoreSum: 0 };
    s.total += 1;
    s.scoreSum += l.score;
    if (l.outcome === "ALTA_INTENCION") s.high += 1;
    if (l.outcome === "ONBOARDED") s.onboarded += 1;
    if (l.outcome === "NO_APTO") s.disqualified += 1;
    by.set(l.source, s);
  }
  const items = [...by.entries()]
    .map(([source, s]) => ({
      source,
      total: s.total,
      highIntent: s.high,
      onboarded: s.onboarded,
      disqualified: s.disqualified,
      conversionRate: s.total > 0 ? Math.round((s.onboarded / s.total) * 100) : 0,
      highRate: s.total > 0 ? Math.round((s.high / s.total) * 100) : 0,
      avgScore: s.total > 0 ? Math.round((s.scoreSum / s.total) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
  return { items };
}

function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (x.getUTCDay() + 6) % 7; // lunes = 0
  x.setUTCDate(x.getUTCDate() - day);
  return x;
}

async function weeklyCohorts(req: any): Promise<any> {
  const where = await leadWhere(req);
  const leads = await prisma.lead.findMany({
    where: { ...where, firstSeen: { gte: new Date(Date.now() - 90 * 86400000) } },
    select: { firstSeen: true, handoffAt: true, activatedAt: true },
  });
  const buckets: Array<{ week: string; label: string; created: number; high: number; onboarded: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400000);
    const ws = weekStart(d);
    buckets.push({ week: ws.toISOString().slice(0, 10), label: `${String(ws.getUTCDate()).padStart(2, "0")}/${String(ws.getUTCMonth() + 1).padStart(2, "0")}`, created: 0, high: 0, onboarded: 0 });
  }
  const byWeek = new Map<string, { created: number; high: number; onboarded: number }>();
  for (const l of leads) {
    const wk = weekStart(l.firstSeen).toISOString().slice(0, 10);
    const c = byWeek.get(wk) ?? { created: 0, high: 0, onboarded: 0 };
    c.created += 1;
    if (l.handoffAt) c.high += 1;
    if (l.activatedAt) c.onboarded += 1;
    byWeek.set(wk, c);
  }
  for (const b of buckets) {
    const c = byWeek.get(b.week);
    if (c) {
      b.created = c.created;
      b.high = c.high;
      b.onboarded = c.onboarded;
    }
  }
  return {
    cohorts: buckets.map((b) => ({
      ...b,
      highRate: b.created > 0 ? Math.round((b.high / b.created) * 100) : 0,
      onboardRate: b.created > 0 ? Math.round((b.onboarded / b.created) * 100) : 0,
    })),
  };
}

r.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const cacheKey = `overview:${req.user!.orgId}:${req.user!.sub}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    const data = await overviewData(req);
    setCache(cacheKey, data, 30000);
    res.json(data);
  })
);

r.get(
  "/funnel",
  asyncHandler(async (req, res) => {
    const cacheKey = `funnel:${req.user!.orgId}:${req.user!.sub}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    const where = await leadWhere(req);
    const byStatus = await prisma.lead.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });
    const map: Record<string, number> = {};
    for (const s of byStatus) map[s.status] = s._count._all;
    const order = ["NEW", "IN_CONVERSATION", "NUTRITION", "HANDOFF", "ONBOARDING", "DISTRIBUTOR", "DISQUALIFIED"];
    const data = {
      stages: order.map((k) => ({ status: k, count: map[k] ?? 0 })),
    };
    setCache(cacheKey, data, 30000);
    res.json(data);
  })
);

r.get(
  "/timeseries",
  asyncHandler(async (req, res) => {
    const where = await leadWhere(req);
    const days = 14;
    const since = new Date(Date.now() - days * 86400000);
    const leads = await prisma.lead.findMany({
      where: { ...where, createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    });
    const [sessions, disqualified] = await Promise.all([
      prisma.session.findMany({ where: { startedAt: { gte: since } }, select: { startedAt: true } }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: since }, outcome: "NO_APTO" } }),
    ]);
    void disqualified;
    const buckets: Array<{ date: string; label: string; leads: number; conversations: number; highIntent: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      buckets.push({
        date: key,
        label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        leads: 0,
        conversations: 0,
        highIntent: 0,
      });
    }
    for (const l of leads) {
      const key = l.createdAt.toISOString().slice(0, 10);
      const b = buckets.find((x) => x.date === key);
      if (b) b.leads += 1;
    }
    for (const s of sessions) {
      const key = s.startedAt.toISOString().slice(0, 10);
      const b = buckets.find((x) => x.date === key);
      if (b) b.conversations += 1;
    }
    res.json({ buckets });
  })
);

r.get(
  "/score-distribution",
  asyncHandler(async (req, res) => {
    const where = await leadWhere(req);
    const leads = await prisma.lead.findMany({ where, select: { score: true } });
    const buckets = [
      { label: "< 0", min: -999, max: -1, count: 0 },
      { label: "0-2", min: 0, max: 2, count: 0 },
      { label: "3-4", min: 3, max: 4, count: 0 },
      { label: "5-6", min: 5, max: 6, count: 0 },
      { label: "7+", min: 7, max: 999, count: 0 },
    ];
    for (const l of leads) {
      const b = buckets.find((x) => l.score >= x.min && l.score <= x.max);
      if (b) b.count += 1;
    }
    res.json({ buckets });
  })
);

r.get(
  "/distributors",
  requireOrg,
  asyncHandler(async (req, res) => {
    if (req.user!.role === "DISTRIBUTOR") {
      const dist = await prisma.distributor.findFirst({ where: { userId: req.user!.sub } });
      return res.json({ items: dist ? [{ id: dist.id, name: dist.name, leads: 0, highIntent: 0, avgScore: 0 }] : [] });
    }
    const orgId = req.user!.orgId!;
    const dists = await prisma.distributor.findMany({ where: { orgId } });
    const items = await Promise.all(
      dists.map(async (d) => {
        const [leads, highIntent, avg] = await Promise.all([
          prisma.lead.count({ where: { distributorId: d.id } }),
          prisma.lead.count({ where: { distributorId: d.id, outcome: "ALTA_INTENCION" } }),
          prisma.lead.aggregate({ where: { distributorId: d.id }, _avg: { score: true } }),
        ]);
        return {
          id: d.id,
          name: d.name,
          slug: d.slug,
          leads,
          highIntent,
          avgScore: Math.round((avg._avg.score ?? 0) * 10) / 10,
        };
      })
    );
    res.json({ items });
  })
);

r.get(
  "/variants",
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = req.user!.orgId!;
    const dists = await prisma.distributor.findMany({
      where: { orgId },
      select: { id: true, name: true, variants: true },
    });
    const sessions = await prisma.session.findMany({
      where: { orgId },
      include: { lead: { select: { id: true, status: true, outcome: true } } },
    });
    const byVariant: Record<string, any> = {};
    for (const d of dists) {
      const variants = JSON.parse(d.variants || "[]");
      for (const v of variants) byVariant[v.id] = { id: v.id, name: v.name, distributorId: d.id, distributorName: d.name, sessions: 0, leads: 0, highIntent: 0, conversions: 0 };
    }
    const baseId = "base";
    byVariant[baseId] = { id: baseId, name: "Base (original)", distributorId: null, distributorName: null, sessions: 0, leads: 0, highIntent: 0, conversions: 0 };
    for (const s of sessions) {
      const key = s.variant || baseId;
      const b = byVariant[key];
      if (!b) continue;
      b.sessions += 1;
      if (s.lead) {
        b.leads += 1;
        if (s.lead.outcome === "ALTA_INTENCION" || s.lead.status === "HANDOFF") b.highIntent += 1;
        if (s.lead.status === "DISTRIBUTOR" || s.lead.outcome === "ONBOARDED") b.conversions += 1;
      }
    }
    res.json({
      items: Object.values(byVariant).map((b) => ({
        ...b,
        conversionRate: b.sessions > 0 ? Math.round((b.conversions / b.sessions) * 100) : 0,
      })),
    });
  })
);

/** Fase 7 — analítica avanzada */

r.get(
  "/velocity",
  asyncHandler(async (req, res) => {
    res.json(await velocityMetrics(req));
  })
);

r.get(
  "/sources",
  asyncHandler(async (req, res) => {
    res.json(await sourceFunnel(req));
  })
);

r.get(
  "/cohorts",
  asyncHandler(async (req, res) => {
    res.json(await weeklyCohorts(req));
  })
);

r.get(
  "/executive",
  asyncHandler(async (req, res) => {
    const cacheKey = `executive:${req.user!.orgId}:${req.user!.sub}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    const [overview, velocity, sources, cohorts] = await Promise.all([
      overviewData(req),
      velocityMetrics(req),
      sourceFunnel(req),
      weeklyCohorts(req),
    ]);
    const data = { overview, velocity, sources, cohorts };
    setCache(cacheKey, data, 60000);
    res.json(data);
  })
);

r.get(
  "/report",
  asyncHandler(async (req, res) => {
    const cacheKey = `report:${req.user!.orgId}:${req.user!.sub}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const where = await leadWhere(req);
    const [overview, velocity, sources, cohorts, funnel, scoreDistribution] = await Promise.all([
      overviewData(req),
      velocityMetrics(req),
      sourceFunnel(req),
      weeklyCohorts(req),
      prisma.lead.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.lead.findMany({ where, select: { score: true } }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of funnel) statusMap[s.status] = s._count._all;
    const funnelData = {
      stages: ["NEW", "IN_CONVERSATION", "NUTRITION", "HANDOFF", "ONBOARDING", "DISTRIBUTOR", "DISQUALIFIED"]
        .map((k) => ({ status: k, count: statusMap[k] ?? 0 })),
    };

    const scoreBuckets = [
      { label: "< 0", min: -999, max: -1, count: 0 },
      { label: "0-2", min: 0, max: 2, count: 0 },
      { label: "3-4", min: 3, max: 4, count: 0 },
      { label: "5-6", min: 5, max: 6, count: 0 },
      { label: "7+", min: 7, max: 999, count: 0 },
    ];
    for (const l of scoreDistribution) {
      const b = scoreBuckets.find((x) => l.score >= x.min && l.score <= x.max);
      if (b) b.count += 1;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      overview,
      velocity,
      sources,
      cohorts,
      funnel: funnelData,
      scoreDistribution: { buckets: scoreBuckets },
    };

    setCache(cacheKey, report, 60000);
    res.json(report);
  })
);

export default r;