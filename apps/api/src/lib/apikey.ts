import { createHash, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(orgSlug: string): string {
  const slug = orgSlug.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
  return `naio_${slug}_${randomBytes(18).toString("base64url")}`;
}

export function keyScopes(scopes: string[]): string {
  return JSON.stringify(scopes);
}

/** Comprueba la API key (header X-API-Key o query api_key). */
export async function authApiKey(req: any): Promise<{ orgId: string; scopes: string[] } | null> {
  const raw = (req.headers["x-api-key"] as string) || req.query.api_key;
  if (!raw) return null;
  const keyHash = hashKey(raw);
  const k = await prisma.apiKey.findFirst({ where: { keyHash, revoked: false } });
  if (!k) return null;
  await prisma.apiKey.update({ where: { id: k.id }, data: { lastUsedAt: new Date() } });
  return { orgId: k.orgId, scopes: JSON.parse(k.scopes || "[]") };
}

/** Rate limit simple en memoria por clave. */
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs = 60000): { ok: boolean; remaining: number; reset: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return { ok: b.count <= max, remaining: Math.max(0, max - b.count), reset: b.reset };
}