import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface NotifyInput {
  distributorId?: string | null;
  type?: string;
  title: string;
  body: string;
  link?: string | null;
}

export async function notify(orgId: string, input: NotifyInput) {
  return prisma.notification.create({
    data: {
      orgId,
      distributorId: input.distributorId ?? null,
      type: input.type ?? "info",
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    },
  });
}

export async function notifyOrg(orgId: string, input: Omit<NotifyInput, "distributorId">) {
  return notify(orgId, { ...input, distributorId: null });
}