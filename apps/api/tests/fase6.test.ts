import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, seedTwin } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { analyze, detectLanguage, hasUrl } from "../src/lib/scoring";

let seed: any;
let twin: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  twin = await seedTwin(seed.org.id, { slug: "maria-demo" });
  await prisma.brainItem.createMany({
    data: [
      { orgId: seed.org.id, category: "SCREENING", title: "¿Tienes más de 18 años?", content: "Esperar confirmación de edad.", keywords: "edad", active: true },
      { orgId: seed.org.id, category: "OBJECTION", title: "Objeciones de precio", content: "El kit de inicio cuesta 100 USD y no tiene cuotas obligatorias.", keywords: "caro precio costo inversión kit", active: true },
      { orgId: seed.org.id, category: "OBJECTION", title: "Objeciones de confianza", content: "Puedes verificar la información oficial antes de decidir.", keywords: "estafa fraude confianza dudas", active: true },
    ],
  });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("Fase 6 — IA conversacional avanzada", () => {
  it("analyze detecta objeciones, despedidas, URLs y señales", () => {
    expect(analyze("me parece muy caro el kit").signal).toBe("objection");
    expect(analyze("no tengo tiempo esta semana").signal).toBe("objection");
    expect(analyze("es una estafa seguro").signal).toBe("objection");
    expect(analyze("adiós, nos vemos luego").signal).toBe("farewell");
    expect(analyze("quiero unirme ya").signal).toBe("positive");
    expect(analyze("no gracias, no me interesa").signal).toBe("negative");
    expect(analyze("tengo 17 años").signal).toBe("disqualify");
    expect(analyze("mira https://youtube.com/x").url).toBe(true);
    expect(hasUrl("sin enlaces aquí")).toBe(false);
  });

  it("detectLanguage identifica es/en/pt", () => {
    expect(detectLanguage("quiero unirme y empezar ya")).toBe("es");
    expect(detectLanguage("I want to join and start right now")).toBe("en");
    expect(detectLanguage("quero entrar e começar agora")).toBe("pt");
    expect(detectLanguage("xyz abc")).toBe(null);
  });

  it("una objeción se atiende con el contenido OBJECTION y no castiga el score", async () => {
    const first = await request(app).post("/api/public/f/maria-demo/chat").send({ message: "Hola, me llamo Ana Prueba" });
    const s = { sessionId: first.body.sessionId, leadId: first.body.leadId };

    const obj = await request(app).post("/api/public/f/maria-demo/chat").send({ ...s, message: "Me parece muy caro el kit" });
    expect(obj.status).toBe(200);
    expect(obj.body.outcome).toBe("CONTINUE");
    expect(obj.body.reply).toContain("100 USD");
    expect(obj.body.reply).toContain("¿Tienes más de 18 años?");

    const lead = await prisma.lead.findUnique({ where: { id: first.body.leadId } });
    expect(lead!.score).toBe(0);
    expect(lead!.status).toBe("IN_CONVERSATION");
  });

  it("una objeción de confianza usa su propio ítem OBJECTION", async () => {
    const first = await request(app).post("/api/public/f/maria-demo/chat").send({ message: "Me llamo Luis Test" });
    const res = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ sessionId: first.body.sessionId, leadId: first.body.leadId, message: "Esto parece una estafa" });
    expect(res.body.outcome).toBe("CONTINUE");
    expect(res.body.reply).toContain("verificar la información oficial");
  });

  it("una despedida cierra con calidez sin avanzar el screening", async () => {
    const first = await request(app).post("/api/public/f/maria-demo/chat").send({ message: "Hola, soy Sara" });
    const res = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ sessionId: first.body.sessionId, leadId: first.body.leadId, message: "Adiós, gracias por todo" });
    expect(res.body.outcome).toBe("CONTINUE");
    expect(res.body.reply).toContain("Fue un gusto conversar contigo");
  });

  it("un enlace se reconoce y se invita a seguir la conversación", async () => {
    const first = await request(app).post("/api/public/f/maria-demo/chat").send({ message: "Hola, soy Pablo" });
    const res = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ sessionId: first.body.sessionId, leadId: first.body.leadId, message: "Mira este video https://www.youtube.com/watch?v=abc123" });
    expect(res.body.outcome).toBe("CONTINUE");
    expect(res.body.reply).toContain("No puedo abrir enlaces");
  });

  it("un prospecto en otro idioma recibe el reconocimiento en su idioma (nurture EN)", async () => {
    const first = await request(app).post("/api/public/f/maria-demo/chat").send({ message: "Hola, me llamo Ana Prueba" });
    const s = { sessionId: first.body.sessionId, leadId: first.body.leadId };
    await request(app).post("/api/public/f/maria-demo/chat").send({ ...s, message: "Sí, tengo más de 18 años" });

    const res = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ ...s, message: "That's all, thanks for your time" });
    expect(res.body.outcome).toBe("NUTRITION");
    expect(res.body.reply).toContain("I completely understand");
  });

  it("la objeción no bloquea el avance posterior del screening", async () => {
    const first = await request(app).post("/api/public/f/maria-demo/chat").send({ message: "Hola, me llamo Leo" });
    const s = { sessionId: first.body.sessionId, leadId: first.body.leadId };
    await request(app).post("/api/public/f/maria-demo/chat").send({ ...s, message: "El kit me parece muy caro" });
    const next = await request(app)
      .post("/api/public/f/maria-demo/chat")
      .send({ ...s, message: "Sí, tengo más de 18 años" });
    expect(next.body.outcome).toBe("CONTINUE");
    expect(next.body.reply).not.toContain("¿Tienes más de 18 años?");
  });
});