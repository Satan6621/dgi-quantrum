import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import http from "http";
import { createHmac } from "crypto";
import { app } from "../src/app";
import { resetDb, seedOrg, authHeader } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;
let server: http.Server;
let received: any = null;
let port = 0;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  received = null;
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received = { url: req.url, headers: req.headers, body };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as any).port;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});

describe("webhooks de salida", () => {
  it("configura un webhook con firma", async () => {
    const res = await request(app)
      .put("/api/org/outgoing-webhooks")
      .set(authHeader(seed.token))
      .send({
        webhooks: [
          {
            id: "wh-test",
            label: "Listener",
            url: `http://127.0.0.1:${port}/hooks`,
            secret: "clave-secreta",
            events: ["lead.created", "lead.handoff"],
            enabled: true,
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.webhooks.length).toBe(1);
    expect(res.body.events).toContain("lead.created");
  });

  it("dispara el evento de prueba y el receptor recibe la firma correcta", async () => {
    const res = await request(app)
      .post("/api/org/outgoing-webhooks/test")
      .set(authHeader(seed.token))
      .send({ id: "wh-test" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // esperar la entrega asíncrona
    await new Promise((r) => setTimeout(r, 300));
    expect(received).not.toBeNull();
    expect(received.url).toBe("/hooks");
    expect(received.headers["x-naio-event"]).toBe("lead.created");
    const sig = received.headers["x-naio-signature"];
    expect(sig).toBeTruthy();
    const expected = createHmac("sha256", "clave-secreta").update(received.body).digest("hex");
    expect(sig).toBe(expected);
  });

  it("el log de entregas registra el evento como entregado", async () => {
    const res = await request(app).get("/api/org/webhook-logs?provider=outgoing").set(authHeader(seed.token));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    const last = res.body.items[0];
    expect(last.status).toBe("delivered");
  });
});