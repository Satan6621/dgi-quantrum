export async function sendSlackMessage(webhookUrl: string, message: { text: string; blocks?: any[] }) {
  if (!webhookUrl) return { ok: false, error: "No webhook URL" };
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return { ok: res.ok, status: res.status };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export function buildLeadNotification(lead: any, event: string) {
  const emoji = event === "lead.created" ? "🆕" : event === "lead.handoff" ? "🔥" : "✅";
  return {
    text: `${emoji} *${event}*\nLead: ${lead.name || lead.email}\nScore: ${lead.score}\nSource: ${lead.source || "unknown"}`,
  };
}
