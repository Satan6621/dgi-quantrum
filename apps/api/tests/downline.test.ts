import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, seedTwin, authHeader } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;
let maria: any;
let juan: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  maria = await seedTwin(seed.org.id, { name: "María Raíz" });
  juan = await seedTwin(seed.org.id, { name: "Juan Hijo", sponsorId: maria.id });
  await seedTwin(seed.org.id, { name: "Lucía Nieta", sponsorId: juan.id });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("downline", () => {
  it("árbol con raíz y profundidad", async () => {
    const res = await request(app).get("/api/downline/tree").set(authHeader(seed.token));
    expect(res.status).toBe(200);
    expect(res.body.tree.length).toBe(1);
    const root = res.body.tree[0];
    expect(root.id).toBe(maria.id);
    expect(root.children[0].id).toBe(juan.id);
    expect(root.children[0].children[0].id).toBe(res.body.tree[0].children[0].children[0].id);
    expect(root.children[0].children[0].name).toBe("Lucía Nieta");
  });

  it("overview admin muestra distribuidores y leaderboard", async () => {
    const res = await request(app).get("/api/downline/overview").set(authHeader(seed.token));
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("ADMIN");
    expect(res.body.distributors.length).toBe(3);
    expect(res.body.leaderboard).toBeDefined();
  });
});