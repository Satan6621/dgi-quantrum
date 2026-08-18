import { tokenize } from "./rag";

export type Signal = "positive" | "negative" | "disqualify" | "objection" | "farewell" | "neutral";

export const SIGNALS: Record<Exclude<Signal, "neutral">, string[]> = {
  positive: [
    "me interesa", "quiero unirme", "quiero empezar", "me gustaría", "estoy listo",
    "unirme", "inscribirme", "registrarme", "cómo me uno", "como me uno",
    "cuánto cuesta", "cuanto cuesta", "precio", "costo", "kit de inicio",
    "siguiente paso", "empezar", "adelante", "comprometido", "si quiero",
    "cuando empieza", "formación", "quiero saber más", "sí, quiero", "vamos",
    "dónde firmo", "donde firmo", "me encanta", "excelente", "perfecto", "genial",
  ],
  negative: [
    "no me interesa", "no gracias", "no puedo", "mal momento", "ya tengo otro",
    "no es para mí", "tengo que ver", "no me gusta",
  ],
  disqualify: [
    "tengo 17", "tengo 16", "menor de edad", "soy menor", "tengo 15",
    "quiero enriquecerme rápido", "dinero fácil", "sin esfuerzo",
  ],
  objection: [
    "muy caro", "es caro", "caro", "costoso", "precio alto", "muy costoso",
    "no tengo tiempo", "me falta tiempo", "poco tiempo",
    "es una estafa", "parece estafa", "estafa", "fraude", "scam",
    "no me convence", "desconfío", "me da desconfianza", "dudo", "tengo dudas",
    "déjame pensarlo", "lo voy a pensar", "tengo que pensarlo", "lo pensaré",
    "no me apoyan", "mi pareja no", "mi familia no",
    "es difícil", "muy difícil", "no sé si me conviene",
  ],
  farewell: [
    "adiós", "adios", "hasta luego", "hasta pronto", "nos vemos", "chau",
    "me voy", "cuídate", "cuídate mucho", "que estés bien",
  ],
};

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE_RE = /(\+?\d[\d\s()-]{7,})/;
const URL_RE = /https?:\/\/[^\s]+|www\.[^\s]+/i;

export interface Analysis {
  signal: Signal;
  delta: number;
  hitWord?: string;
  email?: string | null;
  phone?: string | null;
  url?: boolean;
}

export function analyze(text: string): Analysis {
  const lower = text.toLowerCase();
  const t = tokenize(text);

  for (const word of SIGNALS.disqualify) {
    if (lower.includes(word)) return { signal: "disqualify", delta: -6, hitWord: word, email: extractEmail(text), phone: extractPhone(text), url: hasUrl(text) };
  }
  // Las objeciones se atienden (no se castigan): responder la duda antes que nada.
  for (const kind of ["objection", "farewell"] as const) {
    for (const word of SIGNALS[kind]) {
      if (lower.includes(word)) return { signal: kind, delta: 0, hitWord: word, email: extractEmail(text), phone: extractPhone(text), url: hasUrl(text) };
    }
  }
  let best: { kind: Exclude<Signal, "neutral" | "disqualify" | "objection" | "farewell">; word: string } | null = null;
  let bestLen = 0;
  for (const kind of ["positive", "negative"] as const) {
    for (const word of SIGNALS[kind]) {
      if (lower.includes(word) && word.length > bestLen) {
        best = { kind, word };
        bestLen = word.length;
      }
    }
  }
  if (best) {
    return {
      signal: best.kind,
      delta: best.kind === "positive" ? 2 : -1,
      hitWord: best.word,
      email: extractEmail(text),
      phone: extractPhone(text),
      url: hasUrl(text),
    };
  }
  void t;
  return { signal: "neutral", delta: 0, email: extractEmail(text), phone: extractPhone(text), url: hasUrl(text) };
}

export function hasUrl(text: string): boolean {
  return URL_RE.test(text);
}

/** Detección ligera de idioma (es/en/pt) por palabra funcional para el fallback. */
export function detectLanguage(text: string): "es" | "en" | "pt" | null {
  const lower = text.toLowerCase();
  const en = ["i want", "how much", "yes", "please", "really", "price", "join", "good", "ok", "thanks", "tell me", "do you"];
  const pt = ["quero", "quanto", "sim", "por favor", "preço", "quero entrar", "obrigado", "quanto custa", "me conte"];
  const es = ["quiero", "cuánto", "por favor", "gracias", "dime", "cuéntame", "sí"];
  let sEn = 0, sPt = 0, sEs = 0;
  for (const w of en) if (lower.includes(w)) sEn++;
  for (const w of pt) if (lower.includes(w)) sPt++;
  for (const w of es) if (lower.includes(w)) sEs++;
  if (sEn > sEs && sEn > sPt && sEn > 0) return "en";
  if (sPt > sEs && sPt > sEn && sPt > 0) return "pt";
  if (sEs > 0) return "es";
  return null;
}

export function extractEmail(text: string): string | null {
  const m = text.match(EMAIL_RE);
  return m ? m[0] : null;
}

export function extractPhone(text: string): string | null {
  const m = text.match(PHONE_RE);
  return m ? m[0].trim() : null;
}

export type Outcome = "CONTINUE" | "NUTRITION" | "HIGH" | "NO_APTO";

export function classify(score: number, highIntent: number, nutrition: number): Outcome {
  if (score >= highIntent) return "HIGH";
  if (score >= nutrition) return "NUTRITION";
  return "CONTINUE";
}

export function extractName(text: string): string | null {
  const m = text.match(
    /(?:me llamo|mi nombre es|soy|me presento como)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,})?)/i
  );
  if (m) return m[1].trim();
  if (looksLikeName(text)) return text.trim();
  return null;
}

export function looksLikeName(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 2 || clean.length > 32) return false;
  if (/[¿?¡!@0-9]/.test(clean)) return false;
  if (/\s{2,}/.test(clean)) return false;
  const words = clean.split(/\s+/);
  if (words.length > 3) return false;
  return words.every((w) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.]+$/.test(w));
}