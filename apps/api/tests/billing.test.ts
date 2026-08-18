import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, seedTwin, authHeader } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg({ plan: "STARTER" });
  await seedTwin(seed.org.id, { name: "Único distribuidor" });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("billing y límites", () => {
  it("checkout con plan inválido → 400", async () => {
    const res = await request(app).post("/api/billing/checkout").set(authHeader(seed.token)).send({ planId: "NOPE" });
    expect(res.status).toBe(400);
  });

  it("checkout simulado STARTER actualiza el plan", async () => {
    const res = await request(app).post("/api/billing/checkout").set(authHeader(seed.token)).send({ planId: "STARTER" });
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("simulate");
    const org = await prisma.organization.findUnique({ where: { id: seed.org.id } });
    expect(org!.plan).toBe("STARTER");
  });

  it("STARTER permite hasta 2 distribuidores", async () => {
    const first = await request(app)
      .post("/api/distributors")
      .set(authHeader(seed.token))
      .send({ name: "Dos", email: `dos-${Date.now()}@t.demo`, password: "demo1234" });
    expect(first.status).toBe(201);
    const second = await request(app)
      .post("/api/distributors")
      .set(authHeader(seed.token))
      .send({ name: "Tres", email: `tres-${Date.now()}@t.demo`, password: "demo1234" });
    expect(second.status).toBe(402);
  });

  it("al subir a GROWTH el límite se amplía", async () => {
    await request(app).post("/api/billing/checkout").set(authHeader(seed.token)).send({ planId: "GROWTH" });
    const res = await request(app)
      .post("/api/distributors")
      .set(authHeader(seed.token))
      .send({ name: "Cuatro", email: `cuatro-${Date.now()}@t.demo`, password: "demo1234" });
    expect(res.status).toBe(201);
  });
});