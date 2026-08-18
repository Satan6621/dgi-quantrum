import { randomBytes, createHash } from "crypto";
import { prisma } from "./prisma";

const REFRESH_TTL_MS = 14 * 24 * 3600 * 1000;

export function hashRefresh(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken(): string {
  return randomBytes(40).toString("base64url");
}

/** Crea un refresh token persistido y devuelve su valor en claro. */
export async function createRefreshToken(userId: string): Promise<string> {
  const raw = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefresh(raw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return raw;
}

/** Rota el refresh token: revoca el anterior (si es válido) y emite uno nuevo + access token. */
export async function rotateRefreshToken(raw: string, userId: string) {
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefresh(raw) } });
  if (!existing || existing.revokedAt || existing.expiresAt.getTime() < Date.now() || existing.userId !== userId) {
    return null;
  }
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  return createRefreshToken(userId);
}

/** Revoca un refresh token (logout). */
export async function revokeRefreshToken(raw: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefresh(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
