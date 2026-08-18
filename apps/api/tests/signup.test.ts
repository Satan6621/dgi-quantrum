import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb } from "./helpers";
import { prisma } from "../src/lib/prisma";

beforeAll(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

const SUFFIX = `${Date.now()}`;

describe("signup self-serve", () => {
  it("crea org con plan TRIAL y provisiona brain + secuencia + twin", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Laura Admin",
      orgName: "Acme Corp",
      slug: `acme-${SUFFIX}`,
      email: `laura-${SUFFIX}@test.demo`,
      password: "secreto123",
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.role).toBe("ADMIN");

    const org = await prisma.organization.findUnique({ where: { slug: `acme-${SUFFIX}` } });
    expect(org).toBeTruthy();
    expect(org!.plan).toBe("TRIAL");

    const brain = await prisma.brainItem.count({ where: { orgId: org!.id } });
    const seq = await prisma.sequenceTemplate.count({ where: { orgId: org!.id } });
    const twin = await prisma.distributor.findFirst({ where: { orgId: org!.id } });
    expect(brain).toBeGreaterThanOrEqual(10);
    expect(seq).toBeGreaterThanOrEqual(1);
    expect(twin).toBeTruthy();
    expect(twin!.slug).toBe(`acme-${SUFFIX}`);
  });

  it("la cuenta nueva puede hacer login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: `laura-${SUFFIX}@test.demo`, password: "secreto123" });
    expect(res.status).toBe(200);
    expect(res.body.user.orgName).toBe("Acme Corp");
  });

  it("el funnel público de la org nueva responde", async () => {
    const res = await request(app).get(`/api/public/f/acme-${SUFFIX}`);
    expect(res.status).toBe(200);
    expect(res.body.twin.name).toBeTruthy();
  });

  it("slug duplicado → 409", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Otro",
      orgName: "Acme Corp Otro",
      slug: `acme-${SUFFIX}`,
      email: `otro-${SUFFIX}@test.demo`,
      password: "secreto123",
    });
    expect(res.status).toBe(409);
  });

  it("email duplicado → 409", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Laura de Nuevo",
      orgName: "Acme Dos",
      slug: `acme2-${SUFFIX}`,
      email: `laura-${SUFFIX}@test.demo`,
      password: "secreto123",
    });
    expect(res.status).toBe(409);
  });
});
