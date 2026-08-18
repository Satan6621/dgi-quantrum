import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;
let login: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  login = await request(app).post("/api/auth/login").send({ email: seed.admin.email, password: "demo1234" });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("refresh tokens", () => {
  it("el login devuelve access + refresh token", async () => {
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.refreshToken).toBeTruthy();
  });

  it("el access token expira y /refresh emite una sesión nueva (rotación)", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: login.body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.refreshToken).not.toBe(login.body.refreshToken);
    // El refresh anterior queda revocado
    const reuse = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken });
    expect(reuse.status).toBe(401);
  });

  it("el nuevo refresh permite refrescar de nuevo", async () => {
    const fresh = await request(app).post("/api/auth/login").send({ email: seed.admin.email, password: "demo1234" });
    const first = await request(app).post("/api/auth/refresh").send({ refreshToken: fresh.body.refreshToken });
    const second = await request(app).post("/api/auth/refresh").send({ refreshToken: first.body.refreshToken });
    expect(second.status).toBe(200);
    expect(second.body.refreshToken).toBeTruthy();
  });

  it("refresh con token inválido → 401", async () => {
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "no-existe" });
    expect(res.status).toBe(401);
  });

  it("logout revoca el refresh token", async () => {
    const l2 = await request(app).post("/api/auth/login").send({ email: seed.admin.email, password: "demo1234" });
    const out = await request(app).post("/api/auth/logout").send({ refreshToken: l2.body.refreshToken });
    expect(out.status).toBe(200);
    const reuse = await request(app).post("/api/auth/refresh").send({ refreshToken: l2.body.refreshToken });
    expect(reuse.status).toBe(401);
  });
});
