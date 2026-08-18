import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function levelFor(points: number): string {
  if (points >= 800) return "PLATINUM";
  if (points >= 300) return "GOLD";
  if (points >= 150) return "SILVER";
  return "BRONZE";
}

export async function recomputeBadges(orgId: string, distId: string): Promise<string[]> {
  const badges: string[] = [];
  const [teamCount, activations, convos] = await Promise.all([
    prisma.distributor.count({ where: { orgId, sponsorId: distId } }),
    prisma.lead.count({ where: { orgId, distributorId: distId, status: "DISTRIBUTOR" } }),
    prisma.session.count({ where: { orgId, distributorId: distId } }),
  ]);
  if (teamCount >= 1) badges.push("networker");
  if (teamCount >= 5) badges.push("team-builder");
  if (activations >= 1) badges.push("primer-lead");
  if (activations >= 5) badges.push("activador-pro");
  if (convos >= 20) badges.push("conversador");
  return badges;
}

export async function awardPoints(orgId: string, distId: string, delta: number, reason = "") {
  const d = await prisma.distributor.findUnique({ where: { id: distId } });
  if (!d) return d;
  const points = Math.max(0, d.points + delta);
  const level = levelFor(points);
  const badges = JSON.stringify(await recomputeBadges(orgId, distId));
  await prisma.distributor.update({ where: { id: distId }, data: { points, level, badges } });
  if (reason) {
    await prisma.notification.create({
      data: {
        orgId,
        distributorId: distId,
        type: "gamification",
        title: `${delta > 0 ? "+" : ""}${delta} puntos ⭐`,
        body: reason,
        link: "/app/downline",
      },
    });
  }
  return d;
}