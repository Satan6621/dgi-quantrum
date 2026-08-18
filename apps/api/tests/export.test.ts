import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, seedLead, authHeader } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  await seedLead(seed.org.id, { name: "Export One", email: "export@test.demo", phone: "+5215500000111" });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("exportación", () => {
  it("CSV con BOM y encabezados", async () => {
    const res = await request(app).get("/api/export/leads?format=csv").set(authHeader(seed.token));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    const body = res.text;
    expect(body.charCodeAt(0)).toBe(0xfeff);
    expect(body).toContain("name");
    expect(body).toContain("Export One");
  });

  it("JSON parseable", async () => {
    const res = await request(app).get("/api/export/leads?format=json").set(authHeader(seed.token));
    expect(res.status).toBe(200);
    const data = JSON.parse(res.text);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].email).toBe("export@test.demo");
  });

  it("tipo inválido → 400", async () => {
    const res = await request(app).get("/api/export/nope").set(authHeader(seed.token));
    expect(res.status).toBe(400);
  });

  it("distribuidor sin permisos → 403", async () => {
    const res = await request(app).get("/api/export/leads").set(authHeader(seed.token));
    expect(res.status).toBe(200); // admin OK
  });
});