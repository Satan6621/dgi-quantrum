import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { signToken } from "../src/lib/jwt";

export const TABLE_ORDER = [
  "notification",
  "commission",
  "webhookLog",
  "invoice",
  "apiKey",
  "onboardingTask",
  "followUp",
  "message",
  "session",
  "lead",
  "sequenceTemplate",
  "brainItem",
  "distributor",
  "refreshToken",
  "auditLog",
  "user",
  "organization",
];

export async function resetDb() {
  for (const t of TABLE_ORDER) {
    await (prisma as any)[t].deleteMany({});
  }
}

export interface Seed {
  org: any;
  admin: any;
  token: string;
}

export async function seedOrg(opts: { plan?: string; settings?: any } = {}): Promise<Seed> {
  const org = await prisma.organization.create({
    data: {
      name: "Test Org",
      slug: `test-${Date.now()}`,
      plan: opts.plan ?? "SCALE",
      settings: JSON.stringify(opts.settings ?? {}),
      billing: JSON.stringify({ status: "ACTIVE" }),
    },
  });
  const admin = await prisma.user.create({
    data: {
      orgId: org.id,
      role: "ADMIN",
      email: `admin-${Date.now()}@test.demo`,
      name: "Admin Test",
      passwordHash: await hashPassword("demo1234"),
    },
  });
  const token = signToken({ sub: admin.id, orgId: org.id, role: "ADMIN", name: admin.name });
  return { org, admin, token };
}

export async function seedTwin(orgId: string, opts: { slug?: string; name?: string; sponsorId?: string | null } = {}) {
  const name = opts.name ?? `Twin ${Math.random().toString(36).slice(2, 7)}`;
  const user = await prisma.user.create({
    data: {
      orgId,
      role: "DISTRIBUTOR",
      email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}-${Date.now()}@twin.demo`,
      name,
      passwordHash: await hashPassword("demo1234"),
    },
  });
  return prisma.distributor.create({
    data: {
      orgId,
      userId: user.id,
      name,
      slug: opts.slug ?? `twin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tone: "cercano y profesional",
      presentation: `Hola, soy ${name}.`,
      sponsorId: opts.sponsorId ?? null,
      funnelEnabled: true,
    },
  });
}

export async function seedLead(orgId: string, opts: any = {}) {
  return prisma.lead.create({
    data: {
      orgId,
      distributorId: opts.distributorId ?? null,
      name: opts.name ?? "Lead Test",
      email: opts.email ?? null,
      phone: opts.phone ?? null,
      source: opts.source ?? "test",
      status: opts.status ?? "NEW",
      score: opts.score ?? 0,
    },
  });
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
