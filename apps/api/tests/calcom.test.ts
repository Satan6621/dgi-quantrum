import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createHmac } from "crypto";
import { app } from "../src/app";
import { resetDb, seedOrg, seedTwin } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;
let twin: any;

function calSig(raw: string) {
  return createHmac("sha256", "cal-secret").update(raw).digest("hex");
}

async function configureCal(cfg: any) {
  const org = await prisma.organization.findUnique({ where: { id: seed.org.id } });
  const settings = JSON.parse(org!.settings || "{}");
  settings.channels = { ...(settings.channels || {}), calcom: { ...(settings.channels?.calcom || {}), ...cfg } };
  await prisma.organization.update({ where: { id: seed.org.id }, data: { settings: JSON.stringify(settings) } });
}

function v2Payload(email = "lead@cal.com", overrides: any = {}) {
  return {
    triggerEvent: "BOOKING_CREATED",
    payload: {
      booking: {
        id: 123,
        start: "2026-09-01T15:00:00Z",
        url: "https://cal.com/booking/abc",
        user: { email: "maria@vida-nova.demo", name: "María González" },
        responses: { email: { value: email } },
        ...overrides,
      },
    },
    createdAt: new Date().toISOString(),
  };
}

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  twin = await seedTwin(seed.org.id, { slug: "cal-test" });
  await configureCal({ distributorSlug: twin.slug, webhookSecret: "cal-secret" });
  const org = await prisma.organization.findUnique({ where: { id: seed.org.id } });
  const settings = JSON.parse(org!.settings || "{}");
  settings.onboardingChecklist = ["Agendar llamada de bienvenida", "Enviar presentación", "Completar perfil"];
  await prisma.organization.update({ where: { id: seed.org.id }, data: { settings: JSON.stringify(settings) } });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("webhook de entrada Cal.com", () => {
  it("rechaza con 401 una firma inválida", async () => {
    const raw = JSON.stringify(v2Payload());
    const res = await request(app)
      .post(`/api/webhooks/${seed.org.slug}/calcom`)
      .set("X-Cal-Signature-256", "incorrecto")
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(401);
  });

  it("acepta un BOOKING_CREATED v2 con firma válida y activa ONBOARDING", async () => {
    const raw = JSON.stringify(v2Payload("nuevo@cal.com"));
    const res = await request(app)
      .post(`/api/webhooks/${seed.org.slug}/calcom`)
      .set("X-Cal-Signature-256", calSig(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const lead = await prisma.lead.findFirst({ where: { orgId: seed.org.id, email: "nuevo@cal.com" } });
    expect(lead).toBeTruthy();
    expect(lead!.status).toBe("ONBOARDING");
    expect(lead!.outcome).toBe("AGENDADA");
    expect(lead!.intentLevel).toBe("HIGH");
    expect(lead!.source).toBe("calcom");
    expect(lead!.distributorId).toBe(twin.id);

    const tasks = await prisma.onboardingTask.count({ where: { leadId: lead!.id } });
    expect(tasks).toBeGreaterThan(0);
    const notif = await prisma.notification.findFirst({ where: { orgId: seed.org.id, type: "booking" } });
    expect(notif).toBeTruthy();
    const log = await prisma.webhookLog.findFirst({ where: { orgId: seed.org.id, provider: "calcom" } });
    expect(log).toBeTruthy();
    expect(JSON.parse(log!.payload).url).toContain("cal.com");
  });

  it("actualiza un lead existente (mismo email) a ONBOARDING", async () => {
    const existing = await prisma.lead.create({
      data: { orgId: seed.org.id, distributorId: twin.id, email: "existente@cal.com", phone: null, source: "funnel", status: "NUTRITION", score: 3 },
    });
    const raw = JSON.stringify(v2Payload("existente@cal.com"));
    const res = await request(app)
      .post(`/api/webhooks/${seed.org.slug}/calcom`)
      .set("X-Cal-Signature-256", calSig(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(200);
    const after = await prisma.lead.findUnique({ where: { id: existing.id } });
    expect(after!.status).toBe("ONBOARDING");
    const count = await prisma.lead.count({ where: { orgId: seed.org.id, email: "existente@cal.com" } });
    expect(count).toBe(1);
  });

  it("acepta formato v1 (payload plano con email)", async () => {
    const v1 = { payload: { email: "v1@cal.com", attendee: "Juan", startTime: "2026-09-02T10:00:00Z" } };
    const raw = JSON.stringify(v1);
    const res = await request(app)
      .post(`/api/webhooks/${seed.org.slug}/calcom`)
      .set("X-Cal-Signature-256", calSig(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(200);
    const lead = await prisma.lead.findFirst({ where: { orgId: seed.org.id, email: "v1@cal.com" } });
    expect(lead).toBeTruthy();
  });

  it("responde 400 sin email de invitado", async () => {
    const raw = JSON.stringify({ triggerEvent: "BOOKING_CREATED", payload: { booking: {} } });
    const res = await request(app)
      .post(`/api/webhooks/${seed.org.slug}/calcom`)
      .set("X-Cal-Signature-256", calSig(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(400);
  });
});