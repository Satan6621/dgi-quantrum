import { Router } from "express";
import {
  processTelegramUpdate,
  setWebhook,
  sendTelegramMessage,
  sendInlineKeyboard,
} from "../lib/telegram";
import {
  assignLead,
  getRoundRobinConfig,
  getRoundRobinStats,
  updateRoundRobinConfig,
} from "../lib/roundrobin";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// Telegram webhook endpoint
router.post("/webhooks/telegram/:botToken", async (req, res) => {
  try {
    const { botToken } = req.params;
    const update = req.body;

    // Find organization by bot token
    const org = await prisma.org.findFirst({
      where: {
        settings: {
          contains: botToken,
        },
      },
    });

    if (!org) {
      return res.status(404).json({ error: "Organization not found for this bot token" });
    }

    // Process the update
    await processTelegramUpdate(org.id, update);

    res.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Set webhook for organization
router.post("/telegram/webhook", async (req, res) => {
  try {
    const { orgId, botToken, webhookUrl } = req.body;

    if (!orgId || !botToken || !webhookUrl) {
      return res.status(400).json({ error: "orgId, botToken, and webhookUrl are required" });
    }

    // Verify bot token is valid
    const verifyResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const verifyData = await verifyResponse.json();

    if (!verifyData.ok) {
      return res.status(400).json({ error: "Invalid bot token" });
    }

    // Set webhook
    const success = await setWebhook({ botToken, webhookUrl });

    if (success) {
      // Save bot token to org settings
      const org = await prisma.org.findUnique({ where: { id: orgId } });
      if (org) {
        const settings = JSON.parse(org.settings as string || "{}");
        await prisma.org.update({
          where: { id: orgId },
          data: {
            settings: JSON.stringify({
              ...settings,
              telegramBotToken: botToken,
              telegramBotUsername: verifyData.result.username,
              telegramWebhookUrl: webhookUrl,
            }),
          },
        });
      }

      res.json({ ok: true, bot: verifyData.result });
    } else {
      res.status(500).json({ error: "Failed to set webhook" });
    }
  } catch (error) {
    console.error("Set webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send message via Telegram
router.post("/telegram/send", async (req, res) => {
  try {
    const { orgId, chatId, text, options } = req.body;

    if (!orgId || !chatId || !text) {
      return res.status(400).json({ error: "orgId, chatId, and text are required" });
    }

    // Get bot token from org settings
    const org = await prisma.org.findUnique({ where: { id: orgId } });
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const settings = JSON.parse(org.settings as string || "{}");
    const botToken = settings.telegramBotToken;

    if (!botToken) {
      return res.status(400).json({ error: "Telegram bot not configured" });
    }

    const success = await sendTelegramMessage(botToken, chatId, text, options);

    if (success) {
      res.json({ ok: true });
    } else {
      res.status(500).json({ error: "Failed to send message" });
    }
  } catch (error) {
    console.error("Send Telegram message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Round Robin endpoints

// Get round robin configuration and stats
router.get("/round-robin/status", async (req, res) => {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }

    const stats = await getRoundRobinStats(orgId as string);
    res.json(stats);
  } catch (error) {
    console.error("Get round robin status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update round robin configuration
router.post("/round-robin/config", async (req, res) => {
  try {
    const { orgId, config } = req.body;

    if (!orgId || !config) {
      return res.status(400).json({ error: "orgId and config are required" });
    }

    const updatedConfig = await updateRoundRobinConfig(orgId, config);
    res.json({ ok: true, config: updatedConfig });
  } catch (error) {
    console.error("Update round robin config error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Manually assign lead to distributor
router.post("/round-robin/assign", async (req, res) => {
  try {
    const { orgId, leadId } = req.body;

    if (!orgId || !leadId) {
      return res.status(400).json({ error: "orgId and leadId are required" });
    }

    const result = await assignLead(orgId, leadId);
    res.json(result);
  } catch (error) {
    console.error("Assign lead error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get round robin history
router.get("/round-robin/history", async (req, res) => {
  try {
    const { orgId, limit = 50 } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }

    const assignments = await prisma.lead.findMany({
      where: {
        orgId: orgId as string,
        assignedTo: {
          not: null,
        },
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
      take: parseInt(limit as string),
    });

    res.json(assignments);
  } catch (error) {
    console.error("Get round robin history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Preview conversation
router.get("/telegram/preview/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }

    // Get conversations for this chat
    const conversations = await prisma.conversation.findMany({
      where: {
        orgId: orgId as string,
        metadata: {
          contains: chatId,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(conversations);
  } catch (error) {
    console.error("Get Telegram preview error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
