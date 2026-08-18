import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AuditEntry {
  orgId?: string | null;
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, any>;
}

/** Registra una acción sensible en el audit log (fire-and-forget, nunca bloquea). */
export function audit(entry: AuditEntry) {
  return prisma.auditLog
    .create({
      data: {
        orgId: entry.orgId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        meta: JSON.stringify(entry.meta ?? {}),
      },
    })
    .catch(() => null);
}
