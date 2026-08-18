export function timeAgo(d: string | Date): string {
  if (!d) return "—";
  const date = new Date(d);
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "hace un momento";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} d`;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function dateTime(d: string | Date): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name: string): string {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export interface StatusMeta {
  label: string;
  dot: string;
  chip: string;
}

export const STATUS_META: Record<string, StatusMeta> = {
  NEW: { label: "Nuevo", dot: "bg-slate-400", chip: "bg-slate-500/15 text-slate-300 border-slate-400/20" },
  IN_CONVERSATION: { label: "En conversación", dot: "bg-sky-400", chip: "bg-sky-500/15 text-sky-300 border-sky-400/20" },
  NUTRITION: { label: "Nutrición", dot: "bg-amber-400", chip: "bg-amber-500/15 text-amber-300 border-amber-400/20" },
  HANDOFF: { label: "Alta intención", dot: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20" },
  ONBOARDING: { label: "Onboarding", dot: "bg-violet-400", chip: "bg-violet-500/15 text-violet-300 border-violet-400/20" },
  DISTRIBUTOR: { label: "Activado", dot: "bg-cyan-400", chip: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20" },
  DISQUALIFIED: { label: "No apto", dot: "bg-rose-400", chip: "bg-rose-500/15 text-rose-300 border-rose-400/20" },
};

export const OUTCOME_LABEL: Record<string, string> = {
  NO_APTO: "No apto",
  NUTRICION: "Nutrición",
  ALTA_INTENCION: "Alta intención",
  ONBOARDED: "Activado",
  CONTINUE: "En curso",
};

export function scoreColor(score: number): string {
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-teal-300";
  if (score >= 2) return "text-amber-300";
  if (score >= 0) return "text-slate-400";
  return "text-rose-400";
}

export function scoreChip(score: number): string {
  if (score >= 7) return "bg-emerald-500/15 text-emerald-300 border-emerald-400/25";
  if (score >= 5) return "bg-teal-500/15 text-teal-300 border-teal-400/25";
  if (score >= 2) return "bg-amber-500/15 text-amber-300 border-amber-400/25";
  if (score >= 0) return "bg-slate-500/15 text-slate-300 border-slate-400/25";
  return "bg-rose-500/15 text-rose-300 border-rose-400/25";
}

export function srcLabel(src: string): string {
  const map: Record<string, string> = {
    funnel: "Funnel",
    whatsapp: "WhatsApp",
    referral: "Referido",
    widget: "Widget",
    landing: "Landing",
  };
  return map[src] || src;
}