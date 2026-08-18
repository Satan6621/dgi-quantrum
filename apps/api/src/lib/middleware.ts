import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtUser } from "./jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "No autorizado" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "No tienes permisos para esta acción" });
    }
    next();
  };
}

/** Asegura que el usuario tenga una organización (ADMIN/MANAGER/DISTRIBUTOR) */
export function requireOrg(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.orgId) {
    return res.status(403).json({ error: "Tu cuenta no está asociada a una organización" });
  }
  next();
}