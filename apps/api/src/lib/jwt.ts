import jwt from "jsonwebtoken";
import { env } from "../env";

export interface JwtUser {
  sub: string;
  orgId: string | null;
  role: string;
  name: string;
}

export function signToken(u: JwtUser): string {
  return jwt.sign(u, env.JWT_SECRET, { expiresIn: "15m" });
}

export function signLongToken(u: JwtUser): string {
  return jwt.sign(u, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtUser {
  return jwt.verify(token, env.JWT_SECRET) as JwtUser;
}