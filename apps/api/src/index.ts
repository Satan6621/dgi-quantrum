import { prisma } from "./lib/prisma";
import { app } from "./app";
import { env } from "./env";
import { sendEmail } from "./lib/email";
import { processEscalations } from "./lib/sla";

/** Scheduler de follow-ups: cada 60s envía los vencidos (email/WhatsApp según configuración). */
async function processDueFollowUps() {
  try {
    const due = await prisma.followUp.findMany({
      where: { status: "PENDING", dueAt: { lte: new Date() } },
      include: { lead: true, org: true },
    });
    for (const fu of due) {
      await prisma.followUp.update({ where: { id: fu.id }, data: { status: "SENT", sentAt: new Date() } });
      const session = await prisma.session.findFirst({
        where: { orgId: fu.orgId, leadId: fu.leadId },
        orderBy: { startedAt: "desc" },
      });
      if (session) {
        await prisma.message.create({
          data: { sessionId: session.id, role: "AI", content: `[Follow-up programado] ${fu.content}`, tags: "followup" },
        });
      }
      // Email si el lead tiene correo y el paso es de tipo email (o no hay WhatsApp configurado)
      if (fu.lead.email && (fu.channel === "email" || !fu.lead.phone)) {
        await sendEmail({
          to: fu.lead.email,
          subject: `NETWORK AI OS · ${fu.title}`,
          text: fu.content,
        });
      }
      await prisma.lead.update({
        where: { id: fu.leadId },
        data: { lastActivity: new Date(), status: fu.lead.status === "DISQUALIFIED" ? fu.lead.status : "NUTRITION" },
      });
      console.log(`[followup] Enviado a lead ${fu.leadId} (${fu.title})`);
    }
  } catch (e) {
    console.error("[followup] error:", (e as Error).message);
  }
}

app.listen(env.PORT, () => {
  console.log(`\n  NETWORK AI OS API  →  http://localhost:${env.PORT}`);
  console.log(`  Motor de IA        →  ${env.OPENAI_API_KEY ? "openai-compatible" : "reglas + RAG (fallback)"}`);
  console.log(`  Docs OpenAPI       →  http://localhost:${env.PORT}/api/docs\n`);
  setInterval(() => {
    void processDueFollowUps();
    void processEscalations();
  }, 60_000);
});
