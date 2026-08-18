import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, authHeader, seedLead } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

let seed: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("audit log", () => {
  it("registra login y actions sensibles y se consultan", async () => {
    await request(app).post("/api/auth/login").send({ email: seed.admin.email, password: "demo1234" });
    const l = await seedLead(seed.org.id, { name: "Audit Lead" });
    await request(app).post(`/api/leads/${l.id}/activate`).set(authHeader(seed.token)).send({});
    await request(app).post("/api/org/outgoing-webhooks/test").set(authHeader(seed.token)).send({ id: "no-existe" });

    const res = await request(app).get("/api/audit").set(authHeader(seed.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    const actions = res.body.items.map((i: any) => i.action);
    expect(actions).toContain("auth.login");
  });

  it("filtra por acción", async () => {
    const res = await request(app).get("/api/audit?action=auth.login").set(authHeader(seed.token));
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: any) => i.action === "auth.login")).toBe(true);
  });

  it("un distribuidor no puede leer el audit log", async () => {
    const u = await prisma.user.create({
      data: {
        orgId: seed.org.id,
        role: "DISTRIBUTOR",
        email: `dist-audit-${Date.now()}@test.demo`,
        name: "Dist Audit",
        passwordHash: await hashPassword("demo1234"),
      },
    });
    const login = await request(app).post("/api/auth/login").send({ email: u.email, password: "demo1234" });
    expect(login.status).toBe(200);
    const res = await request(app).get("/api/audit").set(authHeader(login.body.token));
    expect(res.status).toBe(403);
  });
});
