import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createHmac } from "crypto";
import { app } from "../src/app";
import { resetDb, seedOrg, seedTwin, authHeader } from "./helpers";
import { prisma } from "../src/lib/prisma";

const HOST = "test.local";
let seed: any;
let twin: any;

const H = () => authHeader(seed.token);

function twilioSignature(params: Record<string, any>, path: string) {
  const url = `http://${HOST}${path}`;
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}${String(params[k])}`)
    .join("");
  return createHmac("sha1", "test-twilio-token").update(url + canonical).digest("base64");
}

function metaSignature(raw: string) {
  return `sha256=${createHmac("sha256", "meta-app-secret").update(raw).digest("hex")}`;
}

async function configureChannel(cfg: any) {
  const org = await prisma.organization.findUnique({ where: { id: seed.org.id } });
  const settings = JSON.parse(org!.settings || "{}");
  settings.channels = { ...(settings.channels || {}), whatsapp: { ...(settings.channels?.whatsapp || {}), ...cfg } };
  await prisma.organization.update({ where: { id: seed.org.id }, data: { settings: JSON.stringify(settings) } });
}

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  twin = await seedTwin(seed.org.id, { slug: "canal-test" });
  await configureChannel({ provider: "twilio", distributorSlug: twin.slug, webhookSecret: "" });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("webhook de entrada WhatsApp (Twilio)", () => {
  it("GET rechaza verificación de Meta sin token correcto", async () => {
    const res = await request(app).get(`/api/webhooks/${seed.org.slug}/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=CH`);
    expect(res.status).toBe(403);
  });

  it("acepta un mensaje de Twilio con firma válida y crea/atiende el lead", async () => {
    const body = { From: "whatsapp:+5215512345678", Body: "Hola, quiero información", MessageSid: "SM1234" };
    const path = `/api/webhooks/${seed.org.slug}/whatsapp`;
    const res = await request(app)
      .post(path)
      .set("Host", HOST)
      .set("X-Twilio-Signature", twilioSignature(body, path))
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBeDefined();
    expect(res.body.lead.phone).toBe("whatsapp:+5215512345678");

    const lead = await prisma.lead.findFirst({ where: { orgId: seed.org.id, phone: "whatsapp:+5215512345678" } });
    expect(lead).toBeTruthy();
    const log = await prisma.webhookLog.findFirst({ where: { orgId: seed.org.id, provider: "whatsapp" } });
    expect(log).toBeTruthy();
    expect(JSON.parse(log!.payload).sid).toBe("SM1234");
  });

  it("rechaza con 401 una firma de Twilio inválida", async () => {
    const body = { From: "whatsapp:+5215512345678", Body: "hola" };
    const path = `/api/webhooks/${seed.org.slug}/whatsapp`;
    const res = await request(app)
      .post(path)
      .set("Host", HOST)
      .set("X-Twilio-Signature", "bm90LXZhbGlk")
      .send(body);
    expect(res.status).toBe(401);
  });
});

describe("webhook de entrada WhatsApp Cloud API (Meta)", () => {
  it("GET verifica el hub.challenge de Meta", async () => {
    await configureChannel({ provider: "meta", metaVerifyToken: "verify-123", webhookSecret: "meta-app-secret" });
    const res = await request(app).get(
      `/api/webhooks/${seed.org.slug}/whatsapp?hub.mode=subscribe&hub.verify_token=verify-123&hub.challenge=CH123`
    );
    expect(res.status).toBe(200);
    expect(res.text).toBe("CH123");
  });

  it("procesa un mensaje de Meta con firma X-Hub-Signature-256 válida", async () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                messages: [{ from: "5215522223333", id: "wamid-ABC", type: "text", text: { body: "Quiero unirme" } }],
              },
            },
          ],
        },
      ],
    };
    const raw = JSON.stringify(payload);
    const res = await request(app)
      .post(`/api/webhooks/${seed.org.slug}/whatsapp`)
      .set("Host", HOST)
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", metaSignature(raw))
      .send(raw);
    expect(res.status).toBe(200);
    expect(res.body.lead.phone).toBe("5215522223333");
    const log = await prisma.webhookLog.findFirst({ where: { orgId: seed.org.id, payload: { contains: "wamid-ABC" } } });
    expect(log).toBeTruthy();
  });

  it("rechaza con 401 una firma de Meta inválida", async () => {
    const payload = { object: "whatsapp_business_account", entry: [] };
    const res = await request(app)
      .post(`/api/webhooks/${seed.org.slug}/whatsapp`)
      .set("Host", HOST)
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", "sha256=1234")
      .send(JSON.stringify(payload));
    expect(res.status).toBe(401);
  });
});

describe("aislamiento y formato", () => {
  it("devuelve 404 con un slug inexistente", async () => {
    const res = await request(app).post("/api/webhooks/no-existe/whatsapp").send({ From: "x", Body: "y" });
    expect(res.status).toBe(404);
  });

  it("responde 400 si el formato de mensaje no se reconoce", async () => {
    await configureChannel({ provider: "twilio", distributorSlug: twin.slug, webhookSecret: "" });
    const path = `/api/webhooks/${seed.org.slug}/whatsapp`;
    const res = await request(app).post(path).set("Host", HOST).set("X-Twilio-Signature", twilioSignature({}, path)).send({});
    expect(res.status).toBe(400);
  });
});