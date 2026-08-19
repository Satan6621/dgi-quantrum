import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../lib/middleware";
import { asyncHandler, safeParseJson } from "../lib/helpers";
import { syncLeadToHubSpot } from "../lib/hubspot";
import { sendSlackMessage, buildLeadNotification } from "../lib/slack";

const r = Router();

r.use(requireAuth);

/** Sync a lead to HubSpot (admin only) */
r.post(
  "/hubspot/sync",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const { leadId } = req.body || {};
    if (!leadId) return res.status(400).json({ error: "leadId is required" });

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, orgId: req.user!.orgId! },
    });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organization not found" });

    const settings = safeParseJson<any>(org.settings, {});
    const hubspotApiKey = settings.integrations?.hubspotApiKey;
    if (!hubspotApiKey) {
      return res.status(400).json({ error: "HubSpot API key not configured for this organization" });
    }

    const result = await syncLeadToHubSpot(hubspotApiKey, lead);
    res.json(result);
  })
);

/** Send a Slack notification for a lead event (admin only) */
r.post(
  "/slack/notify",
  requireRole("ADMIN", "PLATFORM"),
  asyncHandler(async (req, res) => {
    const { leadId, event } = req.body || {};
    if (!leadId || !event) {
      return res.status(400).json({ error: "leadId and event are required" });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, orgId: req.user!.orgId! },
    });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId! } });
    if (!org) return res.status(404).json({ error: "Organization not found" });

    const settings = safeParseJson<any>(org.settings, {});
    const slackWebhookUrl = settings.channels?.slackWebhookUrl;
    if (!slackWebhookUrl) {
      return res.status(400).json({ error: "Slack webhook URL not configured for this organization" });
    }

    const message = buildLeadNotification(lead, event);
    const result = await sendSlackMessage(slackWebhookUrl, message);
    res.json(result);
  })
);

export default r;
