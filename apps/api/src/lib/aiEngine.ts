import { AI_ENGINE, env } from "../env";
import { Raggable } from "./rag";
import { detectLanguage } from "./scoring";

export interface RuleIntent {
  kind:
    | "greeting"
    | "answer"
    | "screening_question"
    | "handoff"
    | "no_apto"
    | "nutrition"
    | "nurture"
    | "objection"
    | "farewell"
    | "link"
    | "fallback";
  name?: string | null;
  twinName: string;
  tone: string;
  presentation: string;
  whatsapp?: string | null;
  calendarUrl?: string | null;
  answer?: Raggable | null;
  question?: string | null;
  remaining?: number;
}

export interface EngineParams {
  systemPrompt?: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  intent: RuleIntent;
}

function nameOr(name: string | null | undefined): string | null {
  return name && name.trim().length > 0 ? name.trim().split(" ")[0] : null;
}

function renderRule(p: EngineParams): string {
  const it = p.intent;
  const n = nameOr(it.name);
  const lang = detectLanguage(p.history[p.history.length - 1]?.content ?? "");
  const ack = (es: string, en: string, pt: string) => (lang === "en" ? en : lang === "pt" ? pt : es);
  switch (it.kind) {
    case "greeting":
      return (
        `${n ? `¡Hola, ${n}!` : "¡Hola!"} 👋\n\nSoy ${it.twinName}. ${it.presentation}\n\n` +
        (it.question ? `Para orientarte lo mejor posible, te hago una breve autoevaluación. Primero: ${it.question}` : "¿Qué te trae por aquí hoy?")
      );
    case "answer":
      return (
        (it.answer ? `${it.answer.content}\n\n` : ack("Entiendo. 🤔 Cuéntame un poco más, por favor.", "I understand. 🤔 Could you tell me a bit more, please?", "Entendo. 🤔 Pode me contar um pouco mais, por favor?") + "\n\n") +
        (it.question ? ack(`Siguiendo con la autoevaluación: ${it.question}`, `Continuing with the quick assessment: ${it.question}`, `Continuando com a avaliação rápida: ${it.question}`) : "")
      ).trim();
    case "screening_question":
      return `Gracias por compartirlo. 💬\n\n${it.question ?? "¿Algo más que quieras preguntarme?"}`;
    case "nutrition":
      return (
        `Gracias por tu tiempo y tu sinceridad, ${n}. 🙏\n\n` +
        `Con lo que me has compartido, veo que hay una buena base para seguir conociendo la oportunidad con calma. ` +
        `En los próximos días te escribiré para compartirte la formación inicial y resolver cualquier duda. ` +
        `¿Algo más que quieras preguntarme por ahora? 😊`
      );
    case "handoff":
      return (
        `¡Excelente, ${n}! 🎉 Lo que me has compartido encaja perfectamente con lo que buscamos en la comunidad.\n\n` +
        `El siguiente paso es muy sencillo y toma unos minutos:\n\n` +
        (it.calendarUrl ? `1️⃣ Agenda 15 minutos conmigo aquí: ${it.calendarUrl}\n` : "") +
        (it.whatsapp ? `2️⃣ O escríbeme directo por WhatsApp: ${it.whatsapp}\n` : "") +
        `\nTe prepararé tu kit de inicio y tu acceso a la formación inicial. ¡Nos vemos pronto! 🚀`
      );
    case "no_apto":
      return (
        `Gracias por tu honestidad, ${n}. 🙏\n\n` +
        `Por el momento, el perfil que buscas no coincide exactamente con lo que ofrecemos en esta etapa. ` +
        `Si en el futuro tu situación cambia, siempre serás bienvenido a retomar la conversación.\n\n` +
        `Te deseo mucho éxito. 🌟`
      );
    case "nurture":
      return (
        ack(`Te entiendo perfectamente, ${n}. 🙂`, `I completely understand, ${n}. 🙂`, `Entendo perfeitamente, ${n}. 🙂`) +
        "\n\n" +
        ack(
          `Sin prisa: lo importante es que esta decisión se tome con calma. Cuando quieras, seguimos la conversación o te comparto información adicional. Dime cómo prefieres continuar.`,
          `No rush: the important thing is that you decide calmly. Whenever you want, we can continue the conversation or I can share more information. Tell me how you'd like to continue.`,
          `Sem pressa: o importante é que você decida com calma. Quando quiser, seguimos a conversa ou compartilho mais informações. Me diga como prefere continuar.`
        )
      );
    case "objection":
      return (
        ack(`Te entiendo, ${n}, y es una duda completamente válida. 🤝`, `I understand, ${n}, and it's a completely valid concern. 🤝`, `Entendo, ${n}, e é uma dúvida totalmente válida. 🤝`) +
        "\n\n" +
        (it.answer ? `${it.answer.content}\n\n` : ack("Cuéntame un poco más al respecto y te ayudo con gusto.", "Tell me a bit more about it and I'll gladly help you.", "Me conte um pouco mais sobre isso e terei prazer em ajudar.") + "\n\n") +
        (it.question ? ack(`Para seguir orientándote: ${it.question}`, `To keep guiding you: ${it.question}`, `Para continuar te orientando: ${it.question}`) : ack("¿Te ayudo con algo más?", "Anything else I can help you with?", "Posso ajudar em algo mais?"))
      ).trim();
    case "farewell":
      return (
        `Claro, ${n}. 👋\n\n` +
        `Fue un gusto conversar contigo. Si más adelante quieres retomar la conversación o tienes alguna duda, aquí estaré. ¡Mucho éxito!`
      );
    case "link":
      return (
        `¡Gracias por compartirlo, ${n}! 🔗\n\n` +
        `No puedo abrir enlaces desde aquí, pero cuéntame qué viste y te aclaro cualquier duda sobre la oportunidad con gusto.`
      );
    default:
      if (lang === "en")
        return `I want to make sure I understand you correctly. 🤔 Could you rephrase that, please?`;
      if (lang === "pt")
        return `Quero ter certeza de que entendi você. 🤔 Pode reformular, por favor?`;
      return (
        `Claro, ${n}. 🤔 ` +
        (it.question ? `Para seguir orientándote: ${it.question}` : "¿En qué más puedo ayudarte?")
      );
  }
}

async function openAiGenerate(p: EngineParams): Promise<string> {
  const body = {
    model: env.OPENAI_MODEL,
    temperature: 0.6,
    messages: [
      { role: "system", content: p.systemPrompt ?? "Eres un asesor comercial profesional." },
      ...p.history,
    ],
  };
  const res = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`LLM ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as any;
  return (data.choices?.[0]?.message?.content as string) ?? renderRule(p);
}

/** Interfaz única del motor de IA: pluggable. */
export async function generate(p: EngineParams): Promise<string> {
  if (AI_ENGINE === "openai") {
    try {
      return await openAiGenerate(p);
    } catch (e) {
      console.warn("[ai] LLM falló, usando motor de reglas:", (e as Error).message);
      return renderRule(p);
    }
  }
  return renderRule(p);
}