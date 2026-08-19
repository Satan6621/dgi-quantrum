import { prisma } from "./lib/prisma";
import { app } from "./app";
import { env } from "./env";
import { sendEmail } from "./lib/email";
import { processEscalations } from "./lib/sla";
import { checkExpiredPlans } from "./lib/billing";

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
          subject: `DGI Quantrum · ${fu.title}`,
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

const server = app.listen(env.PORT, () => {
  console.log(`\n  DGI Quantrum API  →  http://localhost:${env.PORT}`);
  console.log(`  Motor de IA        →  ${env.OPENAI_API_KEY ? "openai-compatible" : "reglas + RAG (fallback)"}`);
  console.log(`  Docs OpenAPI       →  http://localhost:${env.PORT}/api/docs\n`);
  setInterval(() => {
    void processDueFollowUps();
    void processEscalations();
    void checkExpiredPlans();
  }, 60_000);
});

async function gracefulShutdown(signal: string) {
  console.log(`\n[shutdown] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log("[shutdown] HTTP server closed.");
    await prisma.$disconnect();
    console.log("[shutdown] Prisma disconnected.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("[shutdown] Forced exit after timeout.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
