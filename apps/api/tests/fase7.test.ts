import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, seedTwin, authHeader } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;
let twin: any;

const H = () => authHeader(seed.token);
const DAY = 86400000;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  twin = await seedTwin(seed.org.id, { slug: "maria-demo" });

  const mk = (overrides: any) =>
    prisma.lead.create({
      data: { orgId: seed.org.id, distributorId: twin.id, name: "Lead", source: "funnel", status: "NEW", score: 0, ...overrides },
    });

  await mk({ name: "Ana WhatsApp", source: "whatsapp", status: "DISTRIBUTOR", outcome: "ONBOARDED", score: 8, firstSeen: new Date(Date.now() - 10 * DAY), handoffAt: new Date(Date.now() - 9 * DAY), activatedAt: new Date(Date.now() - 8 * DAY) });
  await mk({ name: "Bruno Funnel", source: "funnel", status: "HANDOFF", outcome: "ALTA_INTENCION", score: 6, firstSeen: new Date(Date.now() - 5 * DAY), handoffAt: new Date(Date.now() - 2 * DAY) });
  await mk({ name: "Carla Referral", source: "referral", status: "NUTRITION", score: 3, firstSeen: new Date(Date.now() - 1 * DAY) });

  const s = await prisma.session.create({
    data: { orgId: seed.org.id, distributorId: twin.id, channel: "chat", variant: "base" },
  });
  const t0 = Date.now();
  await prisma.message.create({ data: { sessionId: s.id, role: "USER", content: "hola", ts: new Date(t0) } });
  await prisma.message.create({ data: { sessionId: s.id, role: "AI", content: "¡Hola!", ts: new Date(t0 + 500) } });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("Fase 7 — analítica avanzada", () => {
  it("velocity: tiempos medios, SLA y latencia de la IA", async () => {
    const res = await request(app).get("/api/analytics/velocity").set(H());
    expect(res.status).toBe(200);
    expect(res.body.avgTimeToHandoffH).toBe(48); // (24 + 72) / 2
    expect(res.body.medianTimeToHandoffH).toBe(48);
    expect(res.body.avgHandoffToActivationH).toBe(24);
    expect(res.body.handoffsResolved).toBe(1);
    expect(res.body.handoffsPending).toBe(1);
    expect(res.body.handoffsSlaCompliance).toBe(100);
    expect(res.body.avgAiReplyMs).toBe(500);
    expect(res.body.sampleSize).toBe(2);
  });

  it("sources: conversión y score por canal", async () => {
    const res = await request(app).get("/api/analytics/sources").set(H());
    expect(res.status).toBe(200);
    const items = res.body.items as any[];
    expect(items.length).toBe(3);
    const whatsapp = items.find((i) => i.source === "whatsapp");
    expect(whatsapp).toMatchObject({ total: 1, onboarded: 1, conversionRate: 100, highIntent: 0 });
    const funnel = items.find((i) => i.source === "funnel");
    expect(funnel).toMatchObject({ total: 1, highIntent: 1, highRate: 100, conversionRate: 0 });
  });

  it("cohorts: progresión semanal por cohorte", async () => {
    const res = await request(app).get("/api/analytics/cohorts").set(H());
    expect(res.status).toBe(200);
    const cohorts = res.body.cohorts as any[];
    expect(cohorts.length).toBe(12);
    const withData = cohorts.filter((c) => c.created > 0);
    expect(withData.length).toBeGreaterThanOrEqual(3);
    const first = withData.find((c) => c.onboarded > 0);
    expect(first).toBeTruthy();
    expect(first!.high).toBe(1);
    expect(first!.onboarded).toBe(1);
  });

  it("executive: todo el panel ejecutivo en una llamada", async () => {
    const res = await request(app).get("/api/analytics/executive").set(H());
    expect(res.status).toBe(200);
    expect(res.body.overview.total).toBe(3);
    expect(res.body.velocity.avgTimeToHandoffH).toBe(48);
    expect(res.body.sources.items.length).toBe(3);
    expect(res.body.cohorts.cohorts.length).toBe(12);
  });

  it("export analytics: CSV con métricas planas", async () => {
    const res = await request(app).get("/api/export/analytics?format=csv").set(H());
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    const body = res.text;
    expect(body).toContain("analytics.total");
    expect(body).toContain("source.whatsapp.created");
    expect(body).toContain("avg_time_to_handoff_h");
  });

  it("el motor marca handoffAt cuando un lead alcanza HANDOFF", async () => {
    const chat = await request(app).post("/api/public/f/maria-demo/chat").send({ message: "Quiero unirme ya y mi email es nuevo@correo.com" });
    expect(chat.body.outcome).toBe("HIGH");
    const lead = await prisma.lead.findUnique({ where: { id: chat.body.leadId } });
    expect(lead!.handoffAt).toBeTruthy();
  });

  it("el acceso es por organización (aislamiento)", async () => {
    const other = await seedOrg();
    const res = await request(app).get("/api/analytics/velocity").set(authHeader(other.token));
    expect(res.status).toBe(200);
    expect(res.body.sampleSize).toBe(0);
  });
});