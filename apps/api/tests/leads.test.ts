import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, seedTwin, seedLead, authHeader } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;
let maria: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  maria = await seedTwin(seed.org.id, { name: "María Gómez" });
  for (let i = 1; i <= 5; i++) {
    await seedLead(seed.org.id, {
      name: `Lead ${i}`,
      email: `lead${i}@test.demo`,
      phone: `+521550000000${i}`,
      source: i % 2 ? "funnel" : "import",
    });
  }
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("leads", () => {
  it("lista con paginación devuelve metadatos", async () => {
    const res = await request(app).get("/api/leads?page=1&pageSize=2").set(authHeader(seed.token));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.total).toBe(5);
    expect(res.body.totalPages).toBe(3);
  });

  it("página 3 devuelve el último lead", async () => {
    const res = await request(app).get("/api/leads?page=3&pageSize=2").set(authHeader(seed.token));
    expect(res.body.items.length).toBe(1);
  });

  it("búsqueda por email", async () => {
    const res = await request(app).get("/api/leads?q=lead3").set(authHeader(seed.token));
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].email).toBe("lead3@test.demo");
  });

  it("filtro por source", async () => {
    const res = await request(app).get("/api/leads?source=import").set(authHeader(seed.token));
    expect(res.body.items.length).toBe(2);
  });

  it("import CSV crea leads y omite duplicados", async () => {
    const csv = "name,email,phone,source\n" +
      "Carlos Perez,carlos@test.demo,+5215500000100,funnel\n" +
      "Lucia Ruiz,lucia@test.demo,,web\n" +
      "lead3,lead3@test.demo,,duplicado\n";
    const res = await request(app)
      .post("/api/leads/import")
      .set(authHeader(seed.token))
      .send({ csv });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(2);
    expect(res.body.skippedCount).toBe(1);
    expect(res.body.errors).toEqual([]);
  });

  it("import con body vacío → 400", async () => {
    const res = await request(app).post("/api/leads/import").set(authHeader(seed.token)).send({});
    expect(res.status).toBe(400);
  });

  it("accept-handoff crea tareas y pasa a ONBOARDING", async () => {
    const lead = await seedLead(seed.org.id, { name: "Ana Alta", email: "ana@test.demo" });
    const res = await request(app)
      .post(`/api/leads/${lead.id}/accept-handoff`)
      .set(authHeader(seed.token));
    expect(res.status).toBe(200);
    expect(res.body.lead.status).toBe("ONBOARDING");
    const updated = await prisma.lead.findUnique({ where: { id: lead.id }, include: { tasks: true } });
    expect(updated!.tasks.length).toBeGreaterThan(0);
  });

  it("activate sin tareas completadas → 400", async () => {
    const lead = await seedLead(seed.org.id, { name: "Bloqueado", email: "bloq@test.demo", distributorId: maria.id, status: "ONBOARDING" });
    await prisma.onboardingTask.create({ data: { orgId: seed.org.id, leadId: lead.id, title: "Tarea pendiente", order: 0 } });
    const res = await request(app)
      .post(`/api/leads/${lead.id}/activate`)
      .set(authHeader(seed.token))
      .send({});
    expect(res.status).toBe(400);
  });

  it("activate con tareas completadas crea distribuidor y comisión", async () => {
    const lead = await seedLead(seed.org.id, { name: "Nuevo Distrib", email: "nuevo@test.demo", distributorId: maria.id, status: "ONBOARDING" });
    await prisma.onboardingTask.create({ data: { orgId: seed.org.id, leadId: lead.id, title: "Tarea", order: 0, completed: true } });
    const res = await request(app)
      .post(`/api/leads/${lead.id}/activate`)
      .set(authHeader(seed.token))
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.newDistributor.funnelUrl).toBeTruthy();
    const commission = await prisma.commission.findFirst({ where: { leadId: lead.id, distributorId: maria.id } });
    expect(commission).toBeTruthy();
    expect(commission!.type).toBe("DIRECT");
    expect(commission!.amount).toBeGreaterThan(0);
  });
});