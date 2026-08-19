import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TELEGRAM_API = "https://api.telegram.org/bot";

export interface TelegramConfig {
  botToken: string;
  webhookUrl: string;
}

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  date: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
    };
    message: TelegramMessage;
    data: string;
  };
}

// Set webhook for Telegram bot
export async function setWebhook(config: TelegramConfig): Promise<boolean> {
  const url = `${TELEGRAM_API}${config.botToken}/setWebhook`;
  const body = {
    url: config.webhookUrl,
    allowed_updates: ["message", "callback_query"],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.ok === true;
  } catch (error) {
    console.error("Failed to set Telegram webhook:", error);
    return false;
  }
}

// Send message via Telegram bot
export async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown";
    reply_markup?: any;
  }
): Promise<boolean> {
  const url = `${TELEGRAM_API}${botToken}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: options?.parse_mode || "HTML",
    reply_markup: options?.reply_markup,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.ok === true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

// Send inline keyboard
export async function sendInlineKeyboard(
  botToken: string,
  chatId: number,
  text: string,
  buttons: Array<Array<{ text: string; callback_data: string }>>
): Promise<boolean> {
  return sendTelegramMessage(botToken, chatId, text, {
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

// Process incoming Telegram update
export async function processTelegramUpdate(
  orgId: string,
  update: TelegramUpdate
): Promise<void> {
  const message = update.message || update.callback_query?.message;
  if (!message) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text || update.callback_query?.data;

  if (!text) return;

  // Find or create Telegram lead
  const telegramId = `tg_${userId}`;
  let lead = await prisma.lead.findFirst({
    where: {
      orgId,
      externalId: telegramId,
    },
  });

  if (!lead) {
    // Create new lead from Telegram
    lead = await prisma.lead.create({
      data: {
        orgId,
        externalId: telegramId,
        name: message.from.first_name,
        email: "",
        phone: "",
        source: "telegram",
        status: "new",
        score: 0,
        aiProfile: JSON.stringify({
          telegramUsername: message.from.username,
          telegramFirstName: message.from.first_name,
          telegramLastName: message.from.last_name,
          firstMessage: text,
          firstMessageDate: new Date().toISOString(),
        }),
      },
    });
  }

  // Log conversation
  await prisma.conversation.create({
    data: {
      orgId,
      leadId: lead.id,
      channel: "telegram",
      role: "user",
      content: text,
      metadata: JSON.stringify({
        telegramMessageId: message.message_id,
        telegramChatId: chatId,
      }),
    },
  });

  // Process with AI
  const aiResponse = await processWithAI(lead, text, chatId);

  // Save AI response
  await prisma.conversation.create({
    data: {
      orgId,
      leadId: lead.id,
      channel: "telegram",
      role: "assistant",
      content: aiResponse.text,
      metadata: JSON.stringify({
        intent: aiResponse.intent,
        score: aiResponse.score,
      }),
    },
  });

  // Update lead score
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      score: aiResponse.score,
      status: aiResponse.status as any,
      aiProfile: JSON.stringify({
        ...JSON.parse(lead.aiProfile as string || "{}"),
        lastInteraction: new Date().toISOString(),
        intent: aiResponse.intent,
        objections: aiResponse.objections,
      }),
    },
  });

  // Send response via Telegram
  const botToken = await getBotToken(orgId);
  if (botToken) {
    await sendTelegramMessage(botToken, chatId, aiResponse.text);
  }
}

// Process message with AI
async function processWithAI(
  lead: any,
  message: string,
  chatId: number
): Promise<{
  text: string;
  intent: string;
  score: number;
  status: string;
  objections: string[];
}> {
  const lowerMessage = message.toLowerCase();
  const objections: string[] = [];

  // Detect intent
  let intent = "neutral";
  let score = lead.score || 0;

  if (lowerMessage.includes("interesa") || lowerMessage.includes("quiero")) {
    intent = "interested";
    score += 20;
  } else if (lowerMessage.includes("precio") || lowerMessage.includes("costo")) {
    intent = "price_inquiry";
    score += 15;
  } else if (lowerMessage.includes("no") || lowerMessage.includes("no gracias")) {
    intent = "rejection";
    score -= 10;
    objections.push("no_interest");
  } else if (lowerMessage.includes("duda") || lowerMessage.includes("pregunta")) {
    intent = "question";
    score += 10;
  } else if (lowerMessage.includes("como") || lowerMessage.includes("como funciona")) {
    intent = "how_it_works";
    score += 15;
  }

  // Detect objections
  if (lowerMessage.includes("caro") || lowerMessage.includes("dinero")) {
    objections.push("price_objection");
  }
  if (lowerMessage.includes("tiempo")) {
    objections.push("time_objection");
  }
  if (lowerMessage.includes("no se") || lowerMessage.includes("complicado")) {
    objections.push("complexity_objection");
  }

  // Determine status based on score
  let status = "new";
  if (score >= 70) status = "qualified";
  else if (score >= 40) status = "nurturing";
  else if (score < 20) status = "cold";

  // Generate response based on intent
  let responseText = "";

  switch (intent) {
    case "interested":
      responseText = `¡Excelente! Me alegra que te interese. 🎯\n\n¿Podrías contarme un poco sobre ti?\n- ¿A qué te dedicas?\n- ¿Cuál es tu objetivo principal?\n\nEsto me ayudará a personalizar la mejor propuesta para ti.`;
      break;
    case "price_inquiry":
      responseText = `Entiendo tu preocupación por el costo. 💡\n\nNuestro sistema está diseñado para generarte retorno desde el primer mes. Muchos de nuestros distribuidores reportan recuperar su inversión en las primeras 2-3 semanas.\n\n¿Te gustaría que te muestre cómo funciona y los resultados que hemos generado?`;
      break;
    case "rejection":
      responseText = `No hay problema, lo entiendo. 👍\n\n¿Te gustaría que te enviemos información por si cambias de opinión en el futuro? O si prefieres, puedo contarte brevemente cómo funciona por si le ves utilidad a largo plazo.`;
      break;
    case "question":
      responseText = `¡Buena pregunta! 🤔\n\nDéjame explicarte: [respuesta personalizada]\n\n¿Tienes alguna otra duda?`;
      break;
    case "how_it_works":
      responseText = `¡Claro! Te explico cómo funciona DGI Quantrum:\n\n1️⃣ **Captación Automática** - El sistema busca prospectos cualificados\n2️⃣ **IA Conversacional** - Chatbots cualifican leads 24/7\n3️⃣ **Asignación Inteligente** - Round robin asigna a distribuidores\n4️⃣ **Cierre Asistido** - AI ayuda a cerrar el deal\n\n¿Te gustaría probarlo? 🚀`;
      break;
    default:
      responseText = `¡Hola! 👋 Gracias por escribirnos.\n\n¿En qué puedo ayudarte hoy? Puedo contarte sobre:\n- Cómo funciona el sistema\n- Oportunidades de negocio\n- Demo personalizada\n\n¿Qué te gustaría saber?`;
  }

  // Add objections handling
  if (objections.length > 0) {
    responseText += "\n\n💡 " + handleObjections(objections);
  }

  return {
    text: responseText,
    intent,
    score: Math.min(100, Math.max(0, score)),
    status,
    objections,
  };
}

// Handle common objections
function handleObjections(objections: string[]): string {
  const responses: string[] = [];

  if (objections.includes("price_objection")) {
    responses.push("Entiendo que el costo es importante. Muchos ven resultados desde el primer mes.");
  }
  if (objections.includes("time_objection")) {
    responses.push("El sistema funciona 24/7 automáticamente, no requiere tiempo extra.");
  }
  if (objections.includes("complexity_objection")) {
    responses.push("Es muy fácil de usar, te guiamos en cada paso.");
  }
  if (objections.includes("no_interest")) {
    responses.push("Si en el futuro cambias de opinión, aquí estaremos.");
  }

  return responses.join(" ");
}

// Get bot token for organization
async function getBotToken(orgId: string): Promise<string | null> {
  const org = await prisma.org.findUnique({
    where: { id: orgId },
  });

  if (!org) return null;

  const settings = JSON.parse(org.settings as string || "{}");
  return settings.telegramBotToken || null;
}

// Send notification to distributor when lead is assigned
export async function notifyDistributorOfLead(
  distributorId: string,
  lead: any,
  orgId: string
): Promise<void> {
  const distributor = await prisma.user.findUnique({
    where: { id: distributorId },
  });

  if (!distributor) return;

  const telegramId = distributor.telegramId;
  if (!telegramId) return;

  const botToken = await getBotToken(orgId);
  if (!botToken) return;

  const leadProfile = JSON.parse(lead.aiProfile as string || "{}");

  const message = `
🎯 *Nuevo Lead Asignado*

*Nombre:* ${lead.name}
*Score:* ${lead.score}/100
*Fuente:* ${lead.source}
*Último mensaje:* ${leadProfile.firstMessage || "N/A"}

*Perfil:*
- Intent: ${leadProfile.intent || "N/A"}
- Objeciones: ${leadProfile.objections?.join(", ") || "Ninguna"}

[Ver lead en dashboard]
  `;

  await sendTelegramMessage(botToken, parseInt(telegramId), message, {
    parse_mode: "Markdown",
  });
}
