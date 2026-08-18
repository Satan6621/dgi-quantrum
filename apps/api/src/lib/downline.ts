import { PrismaClient } from "@prisma/client";
import { safeParseJson } from "./helpers";
import { awardPoints } from "./gamify";
import { notify } from "./notify";
import { fire } from "./outgoing";

const prisma = new PrismaClient();

export interface Compensation {
  direct?: number;
  level1?: number;
  level2?: number;
  base?: number;
}

export function compensationFor(org: any): Compensation {
  const settings: any = safeParseJson(org.settings, {});
  const c = (settings.compensation as Compensation) ?? {};
  return { direct: c.direct ?? 15, level1: c.level1 ?? 5, level2: c.level2 ?? 2, base: c.base ?? 100 };
}

/**
 * Al activar un lead (se convierte en distribuidor) se asigna al patrocinador
 * (lead.distributorId) y se paga comisión en 3 niveles según la configuración.
 */
export async function awardOnActivation(org: any, newTwin: { id: string; name: string }, lead: { id: string; distributorId: string | null }) {
  const comp = compensationFor(org);
  let sponsor = lead.distributorId
    ? await prisma.distributor.findUnique({ where: { id: lead.distributorId } })
    : null;
  const labels: Array<{ key: string; name: string; points: number }> = [
    { key: "direct", name: "DIRECT", points: 100 },
    { key: "level1", name: "LEVEL1", points: 50 },
    { key: "level2", name: "LEVEL2", points: 25 },
  ];
  let lvl = 0;
  while (sponsor && lvl < 3) {
    const pct = (comp as any)[labels[lvl].key] ?? 0;
    const amount = Math.round(((comp.base ?? 100) * pct) / 100 * 100) / 100;
    if (amount > 0) {
      await prisma.commission.create({
        data: {
          orgId: org.id,
          distributorId: sponsor.id,
          leadId: lead.id,
          type: labels[lvl].name,
          amount,
          description: `Comisión ${labels[lvl].name} · activación de ${newTwin.name}`,
        },
      });
      await prisma.distributor.update({
        where: { id: sponsor.id },
        data: { commissionBalance: { increment: amount } },
      });
      await notify(org.id, {
        distributorId: sponsor.id,
        type: "commission",
        title: "Comisión recibida 💰",
        body: `+$${amount.toFixed(2)} por la activación de ${newTwin.name}.`,
        link: "/app/downline",
      });
      await fire(org, "commission.paid", {
        commission: { type: labels[lvl].name, amount },
        distributorId: sponsor.id,
        distributorName: sponsor.name,
        activatedDistributor: newTwin.name,
        leadId: lead.id,
      });
    }
    await awardPoints(org.id, sponsor.id, labels[lvl].points, `${newTwin.name} se unió a tu red.`);
    sponsor = sponsor.sponsorId
      ? await prisma.distributor.findUnique({ where: { id: sponsor.sponsorId } })
      : null;
    lvl++;
  }
}

/** Construye el árbol de downline a partir de raíces (sin sponsor). */
export async function buildTree(orgId: string, roots?: string[]): Promise<any[]> {
  const all = await prisma.distributor.findMany({
    where: { orgId },
    select: { id: true, name: true, slug: true, level: true, points: true, sponsorId: true },
    orderBy: { createdAt: "asc" },
  });
  const childrenOf = new Map<string, any[]>();
  for (const d of all) {
    if (!childrenOf.has(d.sponsorId ?? "__root")) childrenOf.set(d.sponsorId ?? "__root", []);
    childrenOf.get(d.sponsorId ?? "__root")!.push(d);
  }
  const rootsToUse = roots && roots.length ? roots : all.filter((d) => !d.sponsorId).map((d) => d.id);
  const nodes = new Map(all.map((d) => [d.id, d]));
  const build = (id: string, depth = 0): any => {
    const d = nodes.get(id);
    if (!d) return null;
    return { ...d, depth, children: (childrenOf.get(id) ?? []).map((c) => build(c.id, depth + 1)).filter(Boolean) };
  };
  return rootsToUse.map(build).filter(Boolean);
}

export async function teamStats(orgId: string, distId: string) {
  const me = await prisma.distributor.findUnique({ where: { id: distId } });
  if (!me) return null;
  const direct = await prisma.distributor.count({ where: { orgId, sponsorId: distId } });
  const tree = await buildTree(orgId, [distId]);
  let total = 0;
  const count = (n: any) => {
    total += 1;
    n.children.forEach(count);
  };
  tree.forEach(count);
  const activations = await prisma.lead.count({ where: { orgId, distributorId: distId, status: "DISTRIBUTOR" } });
  const leads = await prisma.lead.count({ where: { orgId, distributorId: distId } });
  const commissions = await prisma.commission.aggregate({
    where: { orgId, distributorId: distId },
    _sum: { amount: true },
  });
  return {
    me: { id: me.id, name: me.name, level: me.level, points: me.points, commissionBalance: me.commissionBalance },
    direct,
    teamSize: Math.max(0, total - 1),
    activations,
    leads,
    commissionsTotal: commissions._sum.amount ?? 0,
  };
}