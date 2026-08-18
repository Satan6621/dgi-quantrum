import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, seedLead } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { generateApiKey, hashKey, keyScopes } from "../src/lib/apikey";

let seed: any;
let key: string;
let brainKey: string;
let revoked: string;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  await seedLead(seed.org.id, { name: "Lead API", email: "api@test.demo" });
  key = generateApiKey(seed.org.slug);
  brainKey = generateApiKey(seed.org.slug);
  revoked = generateApiKey(seed.org.slug);
  await prisma.apiKey.createMany({
    data: [
      { orgId: seed.org.id, name: "leads", keyPrefix: key.slice(0, 12), keyHash: hashKey(key), scopes: keyScopes(["leads:read"]) },
      { orgId: seed.org.id, name: "brain", keyPrefix: brainKey.slice(0, 12), keyHash: hashKey(brainKey), scopes: keyScopes(["brain:read"]) },
      { orgId: seed.org.id, name: "revoked", keyPrefix: revoked.slice(0, 12), keyHash: hashKey(revoked), scopes: keyScopes(["*"]), revoked: true },
    ],
  });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("API pública v1", () => {
  it("sin API key → 401", async () => {
    const res = await request(app).get("/api/v1/leads");
    expect(res.status).toBe(401);
  });

  it("con key de scope leads:read → 200 y paginación", async () => {
    const res = await request(app).get("/api/v1/leads?page=1&pageSize=1").set("X-API-Key", key);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it("key sin el scope necesario → 403", async () => {
    const res = await request(app).get("/api/v1/leads").set("X-API-Key", brainKey);
    expect(res.status).toBe(403);
  });

  it("key revocada → 401", async () => {
    const res = await request(app).get("/api/v1/leads").set("X-API-Key", revoked);
    expect(res.status).toBe(401);
  });

  it("analytics con scope analytics:read → 200", async () => {
    const res = await request(app).get("/api/v1/analytics").set("X-API-Key", key);
    expect(res.status).toBe(403); // la key solo tiene leads:read
  });

  it("brain con key de scope brain:read → 200", async () => {
    const res = await request(app).get("/api/v1/brain").set("X-API-Key", brainKey);
    expect(res.status).toBe(200);
  });
});