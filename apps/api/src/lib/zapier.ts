export async function sendToZapier(webhookUrl: string, data: Record<string, any>) {
  if (!webhookUrl) return { ok: false, error: "No webhook URL" };
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return { ok: res.ok, status: res.status };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export function buildZapierPayload(event: string, lead: any, extra: Record<string, any> = {}) {
  return {
    event,
    timestamp: new Date().toISOString(),
    lead: {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      score: lead.score,
      status: lead.status,
      source: lead.source,
    },
    ...extra,
  };
}
