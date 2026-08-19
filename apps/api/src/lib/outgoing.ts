import { createHmac, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { safeParseJson } from "./helpers";
import { sendSlackMessage, buildLeadNotification } from "./slack";
import { sendToZapier, buildZapierPayload } from "./zapier";

const prisma = new PrismaClient();

export const OUTGOING_EVENTS = [
  "lead.created",
  "lead.handoff",
  "lead.onboarding",
  "distributor.activated",
  "commission.paid",
  "lead.escalated",
] as const;

export type OutgoingEvent = (typeof OUTGOING_EVENTS)[number];

export interface OutgoingWebhook {
  id: string;
  label: string;
  url: string;
  secret?: string;
  events: string[];
  enabled: boolean;
}

export function outgoingWebhooksOf(org: any): OutgoingWebhook[] {
  const settings: any = safeParseJson(org.settings, {});
  const list = (settings.outgoingWebhooks as OutgoingWebhook[]) ?? [];
  return list.filter((w) => w && w.enabled && w.url);
}

/** Dispara un evento a todos los webhooks de salida configurados (fire-and-forget). */
export async function fire(org: any, event: OutgoingEvent, payload: any) {
  const hooks = outgoingWebhooksOf(org);
  for (const hook of hooks) {
    if (!hook.events.includes(event)) continue;
    void deliverNow(org, hook, event, payload);
  }

  // Slack adapter: if org has slackWebhookUrl in channels config, also send there
  const settings: any = safeParseJson(org.settings, {});
  const slackUrl = settings.channels?.slackWebhookUrl;
  if (slackUrl && (event === "lead.created" || event === "lead.handoff" || event === "lead.onboarding")) {
    const message = buildLeadNotification(payload, event);
    void sendSlackMessage(slackUrl, message);
  }

  // Zapier adapter: if org has zapierWebhookUrl in channels config, also send there
  const zapierUrl = settings.channels?.zapierWebhookUrl;
  if (zapierUrl && (event === "lead.created" || event === "lead.handoff" || event === "lead.onboarding")) {
    const zapierPayload = buildZapierPayload(event, payload, {
      org: { id: org.id, slug: org.slug, name: org.name },
    });
    void sendToZapier(zapierUrl, zapierPayload);
  }
}

/** Entrega un evento a un webhook concreto (usado por fire y por el test del panel). */
export async function deliverNow(org: any, hook: OutgoingWebhook, event: OutgoingEvent, payload: any) {
  const body = JSON.stringify({ event, org: { id: org.id, slug: org.slug, name: org.name }, payload, sentAt: new Date().toISOString() });
  const deliveryId = `wh_${randomBytes(6).toString("hex")}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "dgi-quantrum/3",
    "X-NAIO-Event": event,
    "X-NAIO-Delivery": deliveryId,
  };
  if (hook.secret) {
    headers["X-NAIO-Signature"] = createHmac("sha256", hook.secret).update(body).digest("hex");
  }
  let status = "ok";
  let detail = "";
  try {
    const res = await fetch(hook.url, { method: "POST", headers, body });
    if (!res.ok) {
      status = "http_error";
      detail = `HTTP ${res.status}`;
    }
  } catch (e) {
    status = "failed";
    detail = (e as Error).message;
  }
  await prisma.webhookLog.create({
    data: {
      orgId: org.id,
      provider: `outgoing.${event}`,
      payload: JSON.stringify({ deliveryId, url: hook.url, event, status, detail, body: JSON.stringify(payload).slice(0, 3000) }),
      status: status === "ok" ? "delivered" : "failed",
    },
  });
  return { deliveryId, event, status, detail };
}