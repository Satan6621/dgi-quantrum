import { PrismaClient } from "@prisma/client";
import { safeParseJson } from "./helpers";
import { env } from "../env";

const prisma = new PrismaClient();

export interface ChannelSettings {
  whatsapp?: { provider?: string; distributorSlug?: string; webhookSecret?: string };
  calcom?: { apiKey?: string; distributorSlug?: string };
  [k: string]: unknown;
}

export function channelCfg(org: any, channel: string): any {
  const settings: any = safeParseJson(org.settings, {});
  return (settings.channels && (settings.channels[channel] as any)) || {};
}

/** Envía un mensaje por un canal. Twilio real si hay credenciales; si no, simula. */
export async function sendChannelMessage(
  org: any,
  channel: string,
  to: string,
  text: string
): Promise<{ provider: string; ok: boolean; sid?: string }> {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_FROM;
  if (channel === "whatsapp" && sid && token) {
    try {
      const body = new URLSearchParams({ From: from, To: to, Body: text });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          },
          body,
        }
      );
      const data: any = await res.json();
      return { provider: "twilio", ok: res.ok, sid: data?.sid };
    } catch {
      return { provider: "simulate", ok: true };
    }
  }
  await prisma.webhookLog.create({
    data: {
      orgId: org.id,
      provider: `${channel}.simulate`,
      payload: JSON.stringify({ to, text }),
      status: "sent",
    },
  });
  return { provider: "simulate", ok: true };
}