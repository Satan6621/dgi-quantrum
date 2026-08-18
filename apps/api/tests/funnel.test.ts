import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, seedTwin } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;
let twin: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  twin = await seedTwin(seed.org.id, { slug: "maria-demo" });
  await prisma.brainItem.createMany({
    data: [
      { orgId: seed.org.id, category: "SCREENING", title: "¿Tienes más de 18 años?", content: "Esperar confirmación de edad.", keywords: "edad", active: true },
      { orgId: seed.org.id, category: "FAQ", title: "¿Cuánto cuesta el kit?", content: "El kit de inicio cuesta 100 USD.", keywords: "precio kit", active: true },
      { orgId: seed.org.id, category: "PRODUCT", title: "Kit de inicio", content: "Incluye productos y material.", keywords: "kit", active: true },
    ],
  });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("funnel público", () => {
  it("GET /f/:slug devuelve el perfil del twin + catálogo", async () => {
    const res = await request(app).get("/api/public/f/maria-demo");
    expect(res.status).toBe(200);
    expect(res.body.twin.name).toBe(twin.name);
    expect(res.body.catalog.length).toBeGreaterThanOrEqual(1);
    expect(res.body.variants).toEqual([]);
  });

  it("GET /f/:slug de un slug inexistente → 404", async () => {
    const res = await request(app).get("/api/public/f/no-existe");
    expect(res.status).toBe(404);
  });

  it("chat con nombre crea lead y saluda (CONTINUE)", async () => {
    const res = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ message: "Hola, me llamo Ana Prueba" });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("CONTINUE");
    expect(res.body.leadId).toBeTruthy();
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.reply).toContain("Ana");
  });

  it("respuesta con intención + email → HIGH y handoff", async () => {
    const res = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ message: "Quiero unirme y mi email es ana.prueba@correo.com" });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("HIGH");
    expect(res.body.status).toBe("HANDOFF");
    expect(res.body.handoff).toBeTruthy();
  });

  it("mensaje vacío → 400", async () => {
    const res = await request(app).post("/api/public/f/maria-demo/chat").send({ message: " " });
    expect(res.status).toBe(400);
  });
});