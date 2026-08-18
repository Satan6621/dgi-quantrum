import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createHmac } from "crypto";
import { app } from "../src/app";
import { resetDb, seedOrg } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;

function stripeSig(raw: string, ts = 1700000000) {
  const hmac = createHmac("sha256", "test-stripe-secret").update(`${ts}.${raw}`).digest("hex");
  return `t=${ts},v1=${hmac}`;
}

function sessionEvent(overrides: any = {}) {
  return {
    id: "evt_test_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        customer: "cus_123",
        subscription: "sub_123",
        metadata: { orgId: seed.org.id, plan: "GROWTH" },
        ...overrides,
      },
    },
  };
}

async function billingOf() {
  const org = await prisma.organization.findUnique({ where: { id: seed.org.id } });
  return JSON.parse(org!.billing || "{}");
}

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("webhook de Stripe", () => {
  it("rechaza con 401 una firma inválida", async () => {
    const res = await request(app)
      .post("/api/billing/webhook")
      .set("Stripe-Signature", "t=1700000000,v1=incorrecto")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(sessionEvent()));
    expect(res.status).toBe(401);
  });

  it("checkout.session.completed activa el plan y crea la factura", async () => {
    const raw = JSON.stringify(sessionEvent());
    const res = await request(app)
      .post("/api/billing/webhook")
      .set("Stripe-Signature", stripeSig(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const org = await prisma.organization.findUnique({ where: { id: seed.org.id } });
    expect(org!.plan).toBe("GROWTH");
    const b = await billingOf();
    expect(b.status).toBe("ACTIVE");
    expect(b.mode).toBe("stripe");
    expect(b.stripeSubscriptionId).toBe("sub_123");
    expect(b.periodEnd).toBeTruthy();

    const inv = await prisma.invoice.findFirst({ where: { orgId: seed.org.id } });
    expect(inv!.plan).toBe("GROWTH");
    expect(inv!.stripeId).toBe("cs_test_1");

    const notif = await prisma.notification.findFirst({ where: { orgId: seed.org.id, type: "billing" } });
    expect(notif).toBeTruthy();
  });

  it("es idempotente: reenvíos no duplican la factura", async () => {
    const raw = JSON.stringify(sessionEvent());
    await request(app)
      .post("/api/billing/webhook")
      .set("Stripe-Signature", stripeSig(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    const count = await prisma.invoice.count({ where: { orgId: seed.org.id } });
    expect(count).toBe(1);
  });

  it("invoice.payment_failed marca PAST_DUE y notifica", async () => {
    const ev = {
      id: "evt_test_2",
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_123" } },
    };
    const raw = JSON.stringify(ev);
    const res = await request(app)
      .post("/api/billing/webhook")
      .set("Stripe-Signature", stripeSig(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(200);
    expect(await (await billingOf()).status).toBe("PAST_DUE");
  });

  it("customer.subscription.deleted degrada a TRIAL", async () => {
    const ev = {
      id: "evt_test_3",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_123" } },
    };
    const raw = JSON.stringify(ev);
    const res = await request(app)
      .post("/api/billing/webhook")
      .set("Stripe-Signature", stripeSig(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(200);
    const org = await prisma.organization.findUnique({ where: { id: seed.org.id } });
    expect(org!.plan).toBe("TRIAL");
    expect(await (await billingOf()).status).toBe("EXPIRED");
  });

  it("eventos desconocidos se reconocen pero se ignoran", async () => {
    const ev = { id: "evt_9", type: "charge.succeeded", data: { object: { id: "ch_1" } } };
    const raw = JSON.stringify(ev);
    const res = await request(app)
      .post("/api/billing/webhook")
      .set("Stripe-Signature", stripeSig(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
  });
});