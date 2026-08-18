import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, seedTwin, authHeader } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { processEscalations } from "../src/lib/sla";

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

describe("Fase 5 — IA operativa", () => {
  it("memoria multi-turno: un lead que vuelve a escribir recibe respuesta RAG", async () => {
    const first = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ message: "Hola, me llamo Ana Prueba y quiero información" });
    expect(first.body.sessionId).toBeTruthy();

    const screening = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ sessionId: first.body.sessionId, leadId: first.body.leadId, message: "Sí, tengo más de 18 años" });
    expect(screening.body.outcome).toBe("CONTINUE");

    const returning = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ sessionId: first.body.sessionId, leadId: first.body.leadId, message: "¿Cuánto cuesta el kit de inicio?" });
    expect(returning.status).toBe(200);
    expect(returning.body.outcome).toBe("CONTINUE");
    expect(returning.body.reply).toContain("100 USD");
    expect(returning.body.reply).not.toContain("más de 18");
  });

  it("re-engagement: un lead en nutrición que vuelve con intención + contacto se re-escala a HIGH", async () => {
    const first = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ message: "Me interesa el negocio, soy Luis" });
    await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ sessionId: first.body.sessionId, leadId: first.body.leadId, message: "Sí, tengo más de 18 años" });

    const res = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ sessionId: first.body.sessionId, leadId: first.body.leadId, message: "Quiero unirme ya, mi email es luis@correo.com" });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("HIGH");
    expect(res.body.status).toBe("HANDOFF");
  });

  it("playground: POST /api/brain/test responde con RAG del contenido actual", async () => {
    const res = await request(app)
      .post("/api/brain/test")
      .set(authHeader(seed.token))
      .send({ text: "¿Cuánto cuesta el kit de inicio?" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("100 USD");
    expect(res.body.sources.length).toBeGreaterThanOrEqual(1);
    expect(res.body.sources[0]).toHaveProperty("title");
  });

  it("playground: pregunta vacía → 400", async () => {
    const res = await request(app).post("/api/brain/test").set(authHeader(seed.token)).send({ text: "  " });
    expect(res.status).toBe(400);
  });

  it("escalamiento SLA: handoff sin atender escala una vez y notifica", async () => {
    const s2 = await seedOrg({ settings: { slaHours: 1 } });
    const lead = await prisma.lead.create({
      data: {
        orgId: s2.org.id,
        name: "Lead Atrasado",
        email: "atrasado@correo.com",
        source: "test",
        status: "HANDOFF",
        score: 8,
        lastActivity: new Date(Date.now() - 2 * 3600 * 1000),
      },
    });

    await processEscalations();

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    const meta = JSON.parse(updated!.meta);
    expect(meta.escalatedAt).toBeTruthy();

    const notifs = await prisma.notification.findMany({ where: { orgId: s2.org.id, type: "escalation" } });
    expect(notifs.length).toBe(1);
    expect(notifs[0].title).toContain("Handoff sin atender");

    await processEscalations();
    const notifs2 = await prisma.notification.findMany({ where: { orgId: s2.org.id, type: "escalation" } });
    expect(notifs2.length).toBe(1);
  });

  it("escalamiento SLA: no escala leads aún dentro del SLA", async () => {
    const s3 = await seedOrg({ settings: { slaHours: 24 } });
    const lead = await prisma.lead.create({
      data: {
        orgId: s3.org.id,
        name: "Lead Reciente",
        source: "test",
        status: "HANDOFF",
        score: 8,
        lastActivity: new Date(),
      },
    });
    await processEscalations();
    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(JSON.parse(updated!.meta).escalatedAt).toBeUndefined();
  });
});