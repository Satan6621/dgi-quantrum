import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, authHeader } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("equipo (team)", () => {
  it("lista los miembros de la organización", async () => {
    const res = await request(app).get("/api/team").set(authHeader(seed.token));
    expect(res.status).toBe(200);
    expect(res.body.members.some((m: any) => m.email === seed.admin.email)).toBe(true);
  });

  it("invita un miembro MANAGER y devuelve contraseña temporal", async () => {
    const res = await request(app)
      .post("/api/team/invite")
      .set(authHeader(seed.token))
      .send({ email: "manager-1@test.demo", name: "Manager Uno", role: "MANAGER" });
    expect(res.status).toBe(201);
    expect(res.body.member.role).toBe("MANAGER");
    expect(res.body.tempPassword).toBeTruthy();
  });

  it("invita con contraseña propia (sin tempPassword) y puede hacer login", async () => {
    const inv = await request(app)
      .post("/api/team/invite")
      .set(authHeader(seed.token))
      .send({ email: "dist-1@test.demo", name: "Dist Uno", role: "DISTRIBUTOR", password: "secreto123" });
    expect(inv.status).toBe(201);
    expect(inv.body.tempPassword).toBeUndefined();
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "dist-1@test.demo", password: "secreto123" });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("DISTRIBUTOR");
  });

  it("invita con email duplicado → 409", async () => {
    const res = await request(app)
      .post("/api/team/invite")
      .set(authHeader(seed.token))
      .send({ email: seed.admin.email, name: "Dupe", role: "DISTRIBUTOR" });
    expect(res.status).toBe(409);
  });

  it("desactiva un miembro y este ya no puede entrar", async () => {
    const inv = await request(app)
      .post("/api/team/invite")
      .set(authHeader(seed.token))
      .send({ email: "apagado@test.demo", name: "Apagado", role: "DISTRIBUTOR" });
    const id = inv.body.member.id;
    const deact = await request(app)
      .patch(`/api/team/${id}`)
      .set(authHeader(seed.token))
      .send({ active: false });
    expect(deact.status).toBe(200);
    expect(deact.body.member.active).toBe(false);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "apagado@test.demo", password: inv.body.tempPassword });
    expect(login.status).toBe(403);
  });

  it("no permite desactivar al último admin", async () => {
    const res = await request(app)
      .patch(`/api/team/${seed.admin.id}`)
      .set(authHeader(seed.token))
      .send({ active: false });
    expect(res.status).toBe(400);
  });

  it("no permite eliminar al último admin ni a uno mismo", async () => {
    const self = await request(app).delete(`/api/team/${seed.admin.id}`).set(authHeader(seed.token));
    expect(self.status).toBe(400);
  });

  it("elimina un miembro (con su distribuidor si existe)", async () => {
    const inv = await request(app)
      .post("/api/team/invite")
      .set(authHeader(seed.token))
      .send({ email: "twin-del@test.demo", name: "Para Borrar", role: "DISTRIBUTOR" });
    const id = inv.body.member.id;
    await prisma.distributor.create({ data: { orgId: seed.org.id, userId: id, name: "Para Borrar", slug: `borrar-${Date.now()}` } });
    const del = await request(app).delete(`/api/team/${id}`).set(authHeader(seed.token));
    expect(del.status).toBe(200);
    const gone = await prisma.user.findUnique({ where: { id } });
    expect(gone).toBeNull();
  });

  it("un distribuidor no puede gestionar el equipo", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: "dist-1@test.demo", password: "secreto123" });
    const res = await request(app).get("/api/team").set(authHeader(login.body.token));
    expect(res.status).toBe(403);
  });
});
