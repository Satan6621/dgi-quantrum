import { prisma } from "./prisma";
import { safeParseJson } from "./helpers";
import { notifyOrg } from "./notify";
import { fire } from "./outgoing";

/**
 * Escalamiento por SLA: si un lead en handoff no se atiende en `slaHours`
 * (org.settings.slaHours, por defecto 24), se notifica a admins/managers y se
 * dispara el evento `lead.escalated`. Cada lead se escala una sola vez.
 */
export async function processEscalations() {
  const orgs = await prisma.organization.findMany();
  for (const org of orgs) {
    const settings: any = safeParseJson(org.settings, {});
    const slaHours = Number(settings.slaHours ?? 24);
    if (!(slaHours > 0)) continue;
    const cutoff = new Date(Date.now() - slaHours * 3600 * 1000);

    const leads = await prisma.lead.findMany({
      where: { orgId: org.id, status: "HANDOFF", lastActivity: { lte: cutoff } },
    });

    for (const lead of leads) {
      const meta: any = safeParseJson(lead.meta, {});
      if (meta.escalatedAt) continue;

      await prisma.lead.update({
        where: { id: lead.id },
        data: { meta: JSON.stringify({ ...meta, escalatedAt: new Date().toISOString() }) },
      });

      await notifyOrg(org.id, {
        type: "escalation",
        title: "Handoff sin atender ⏰",
        body: `El lead ${lead.name || "sin nombre"} lleva más de ${slaHours}h sin respuesta en el handoff. Revísalo y responde a tiempo.`,
        link: "/app/leads",
      });

      await fire(org, "lead.escalated", {
        leadId: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        slaHours,
      });

      console.log(`[sla] Escalado lead ${lead.id} (${slaHours}h sin atender)`);
    }
  }
}