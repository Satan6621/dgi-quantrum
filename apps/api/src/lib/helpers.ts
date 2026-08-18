import { Request, Response, NextFunction, RequestHandler } from "express";

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function safeParseJson<T = any>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function leadView(l: any) {
  return {
    id: l.id,
    name: l.name ?? "Prospecto anónimo",
    email: l.email,
    phone: l.phone,
    source: l.source,
    status: l.status,
    score: l.score,
    intentLevel: l.intentLevel,
    outcome: l.outcome,
    firstSeen: l.firstSeen,
    lastActivity: l.lastActivity,
    distributorName: l.distributor?.name ?? null,
    tasks: l.tasks,
    followUps: l.followUps,
    sessionCount: l._count?.sessions ?? l.sessions?.length ?? 0,
  };
}

/* ===================== Paginación ===================== */

export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePage(req: any, defaultSize = 20, maxSize = 200): PageParams {
  const rawPage = Number(req.query.page);
  const rawSize = Number(req.query.pageSize);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const pageSize = Number.isInteger(rawSize) && rawSize >= 1 ? Math.min(rawSize, maxSize) : defaultSize;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paged<T>(items: T[], total: number, p: PageParams) {
  return {
    items,
    total,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: total === 0 ? 0 : Math.max(1, Math.ceil(total / p.pageSize)),
  };
}