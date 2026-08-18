import { PrismaClient } from "@prisma/client";
import { runChat } from "./conversation";
import { sendChannelMessage, channelCfg } from "./channels";
import { safeParseJson } from "./helpers";

const prisma = new PrismaClient();

export interface InboundParams {
  org: any;
  channel: string;
  distributorSlug?: string | null;
  from: string;
  text: string;
  sid?: string;
}

/** Resuelve org y distribuidor destino, encuentra/crea el lead y ejecuta el funnel. */
export async function inboundMessage(p: InboundParams) {
  const cfg = channelCfg(p.org, p.channel);
  const slug = p.distributorSlug || cfg?.distributorSlug;
  if (!slug) throw new Error(`No se configuró un funnel para el canal ${p.channel}`);

  const twin = await prisma.distributor.findFirst({
    where: { orgId: p.org.id, slug, status: "ACTIVE", funnelEnabled: true },
  });
  if (!twin) throw new Error("Distribuidor no encontrado para este canal");

  const phone = String(p.from || "").trim().replace(/\s+/g, "");
  let lead = await prisma.lead.findFirst({ where: { orgId: p.org.id, phone } });
  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        orgId: p.org.id,
        distributorId: twin.id,
        source: p.channel,
        phone,
        status: "IN_CONVERSATION",
      },
    });
  }

  const lastSession = await prisma.session.findFirst({
    where: { orgId: p.org.id, leadId: lead.id },
    orderBy: { startedAt: "desc" },
  });

  const result = await runChat({
    slug,
    userText: p.text,
    sessionId: lastSession?.id ?? null,
    leadId: lead.id,
    channel: p.channel,
  });

  const sent = await sendChannelMessage(p.org, p.channel, phone, result.reply);

  await prisma.webhookLog.create({
    data: {
      orgId: p.org.id,
      provider: p.channel,
      payload: JSON.stringify({ from: phone, text: p.text, reply: result.reply, sid: p.sid ?? null }),
      status: sent.ok ? "processed" : "failed",
    },
  });

  return { ...result, sent, lead: { id: lead.id, phone } };
}