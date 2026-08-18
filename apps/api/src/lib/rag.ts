export interface Raggable {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string;
}

import { embedCached, cosine } from "./embeddings";

const STOP = new Set([
  "una", "unas", "unos", "uno", "una", "un", "los", "las", "el", "la", "de", "del",
  "para", "con", "por", "que", "qué", "como", "cómo", "mas", "más", "pero", "sin",
  "sobre", "entre", "esta", "este", "estas", "estos", "tu", "tus", "su", "sus",
  "mi", "mis", "se", "es", "son", "ser", "tener", "tengo", "tienes", "cuando",
  "donde", "porque", "también", "bien", "muy", "mucho", "hay", "hacer", "puedo",
]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .trim();
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function overlap(q: Set<string>, doc: string): number {
  let hits = 0;
  for (const t of tokenize(doc)) if (q.has(t)) hits++;
  return hits;
}

/**
 * RAG léxico sin dependencias: relevancia = solapamiento sobre
 * título + keywords + contenido. Suficiente para el MVP; intercambiable
 * por embebidos vectoriales en fase 2.
 */
export function retrieve(
  items: Raggable[],
  query: string,
  limit = 3,
  minScore = 1
): Array<Raggable & { relevance: number }> {
  const q = new Set(tokenize(query));
  if (q.size === 0) return [];
  const scored = items
    .map((it) => {
      const s =
        overlap(q, it.title) * 3 + overlap(q, it.keywords) * 2 + overlap(q, it.content);
      return { ...it, relevance: s };
    })
    .filter((x) => x.relevance >= minScore)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
  return scored;
}

export function bestAnswer(
  items: Raggable[],
  query: string
): (Raggable & { relevance: number }) | null {
  const res = retrieve(items, query, 1, 1);
  return res[0] ?? null;
}

/**
 * RAG híbrido (fase 2): combina el solapamiento léxico normalizado con
 * similitud coseno de embeddings locales. Relevancia final = lexW*lex + semW*sem.
 */
export function hybridRetrieve(
  items: Raggable[],
  query: string,
  opts: { limit?: number; minScore?: number; lexW?: number; semW?: number; dim?: number } = {}
): Array<Raggable & { relevance: number }> {
  const { limit = 3, minScore = 0.35, lexW = 0.55, semW = 0.45, dim = 96 } = opts;
  const q = new Set(tokenize(query));
  const qv = embedCached(query, dim);
  if (q.size === 0 && qv.every((v) => v === 0)) return [];

  const raw = items.map((it) => {
    const lex =
      overlap(q, it.title) * 3 + overlap(q, it.keywords) * 2 + overlap(q, it.content);
    const sem = cosine(qv, embedCached(`${it.title} ${it.keywords} ${it.content}`, dim));
    return { it, lex, sem };
  });

  const maxLex = Math.max(1, ...raw.map((r) => r.lex));
  const scored = raw
    .map(({ it, lex, sem }) => ({
      ...it,
      relevance: (lex / maxLex) * lexW + sem * semW,
    }))
    .filter((x) => x.relevance >= minScore)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
  return scored;
}