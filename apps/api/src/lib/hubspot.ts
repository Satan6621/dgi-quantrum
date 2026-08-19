export async function syncLeadToHubSpot(apiKey: string, lead: any) {
  if (!apiKey) return { ok: false, error: "No API key" };
  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        properties: {
          email: lead.email,
          firstname: lead.name?.split(" ")[0] || "",
          lastname: lead.name?.split(" ").slice(1).join(" ") || "",
          phone: lead.phone || "",
          lead_score: String(lead.score || 0),
          lead_source: lead.source || "dgi-quantrum",
        },
      }),
    });
    const data = await res.json();
    return { ok: res.ok, id: data.id };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
