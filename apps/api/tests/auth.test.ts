import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("auth", () => {
  it("login correcto devuelve token y usuario", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: seed.admin.email, password: "demo1234" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe("ADMIN");
  });

  it("login con password incorrecta → 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: seed.admin.email, password: "mal-password" });
    expect(res.status).toBe(401);
  });

  it("login con email inexistente → 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nadie@test.demo", password: "x" });
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me con token devuelve el usuario", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${seed.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(seed.admin.id);
  });

  it("GET /api/auth/me sin token → 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});