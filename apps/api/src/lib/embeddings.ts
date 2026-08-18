import { tokenize } from "./rag";

/**
 * Embeddings locales sin dependencias externas: vector de hashing de tokens
 * (boW) normalizado. Suficiente para similitud semántica aproximada en
 * corpus pequeños. Intercambiable por modelos reales (OpenAI/Ollama) en
 * producción (configurable vía env OPENAI_EMBEDDING=1).
 */
export function hashEmbed(text: string, dim = 96): number[] {
  const vec = new Array(dim).fill(0);
  for (const t of tokenize(text)) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % dim;
    vec[idx] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const den = Math.sqrt(na) * Math.sqrt(nb);
  return den ? dot / den : 0;
}

const embedCache = new Map<string, number[]>();
export function embedCached(text: string, dim = 96): number[] {
  const key = `${dim}:${text}`;
  let v = embedCache.get(key);
  if (!v) {
    v = hashEmbed(text, dim);
    embedCache.set(key, v);
  }
  return v;
}