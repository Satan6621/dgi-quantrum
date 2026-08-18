import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, seedOrg, authHeader } from "./helpers";
import { prisma } from "../src/lib/prisma";

let seed: any;

beforeAll(async () => {
  await resetDb();
  seed = await seedOrg();
  await prisma.brainItem.createMany({
    data: [
      { orgId: seed.org.id, category: "FAQ", title: "¿Cómo me uno?", content: "Completa el formulario.", keywords: "unirme", active: true },
      { orgId: seed.org.id, category: "PRODUCT", title: "Kit", content: "Productos incluidos.", keywords: "kit", active: true },
    ],
  });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("brain", () => {
  it("lista paginada con búsqueda", async () => {
    const res = await request(app).get("/api/brain?q=unirme&page=1&pageSize=5").set(authHeader(seed.token));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].title).toBe("¿Cómo me uno?");
  });

  it("filtro por categoría", async () => {
    const res = await request(app).get("/api/brain?category=PRODUCT").set(authHeader(seed.token));
    expect(res.body.items.length).toBe(1);
  });

  it("crear con categoría inválida → 400", async () => {
    const res = await request(app)
      .post("/api/brain")
      .set(authHeader(seed.token))
      .send({ category: "INVENTADA", title: "X", content: "Y" });
    expect(res.status).toBe(400);
  });

  it("crear ítem válido → 201", async () => {
    const res = await request(app)
      .post("/api/brain")
      .set(authHeader(seed.token))
      .send({ category: "FAQ", title: "¿Hay soporte?", content: "Sí, 24/7.", keywords: "soporte" });
    expect(res.status).toBe(201);
  });

  it("import CSV crea ítems y marca errores", async () => {
    const csv = "category,title,content,keywords\n" +
      "PRODUCT,Nuevo producto,Descripción del producto,producto\n" +
      "FAQ,Pregunta,Respuesta,\n" +
      "MAL,Inválido,Sin categoría,\n";
    const res = await request(app).post("/api/brain/import").set(authHeader(seed.token)).send({ csv });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(2);
    expect(res.body.errorCount).toBe(1);
  });
});