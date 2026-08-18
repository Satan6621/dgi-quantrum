import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Calendar, Phone, PartyPopper, GraduationCap, ThumbsDown, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { cn } from "./ui";

export interface FunnelProfile {
  org: { name: string; primaryColor: string; logoUrl?: string | null };
  twin: {
    name: string;
    avatarUrl?: string | null;
    presentation: string;
    whatsapp?: string | null;
    calendarUrl?: string | null;
    zone?: string | null;
    socialLinks?: Record<string, string>;
    availability?: Record<string, any>;
  };
  variant?: { id: string; name: string } | null;
  variants?: Array<{ id: string; name: string; weight?: number }>;
}

interface Msg {
  id: number;
  role: "user" | "ai";
  content: string;
}

interface ChatState {
  sessionId?: string;
  leadId?: string;
  outcome?: string;
  status?: string;
  score: number;
  handoff?: { whatsapp?: string | null; calendarUrl?: string | null } | null;
}

export default function ChatWidget({ slug, profile, variantId }: { slug: string; profile?: FunnelProfile | null; variantId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [state, setState] = useState<ChatState>({ score: 0 });
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const bootRef = useRef(false);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, open]);

  function add(role: "user" | "ai", content: string) {
    setMsgs((m) => [...m, { id: idRef.current++, role, content }]);
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || typing) return;
    setInput("");
    setError("");
    add("user", clean);
    setTyping(true);
    try {
      const data = await api(`/api/public/f/${slug}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: clean, sessionId: state.sessionId, leadId: state.leadId, variantId }),
      });
      setState({ sessionId: data.sessionId, leadId: data.leadId, outcome: data.outcome, status: data.status, score: data.score, handoff: data.handoff });
      add("ai", data.reply);
    } catch (e: any) {
      setError(e.message);
      add("ai", "Ups, algo falló. Inténtalo de nuevo en un momento.");
    } finally {
      setTyping(false);
    }
  }

  function bootGreeting() {
    if (bootRef.current) return;
    bootRef.current = true;
    // Simula la apertura del prospecto para que la IA salude con su presentación
    send("Hola");
  }

  const done = state.outcome === "HIGH" || state.outcome === "NUTRITION" || state.outcome === "NO_APTO";

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            bootGreeting();
          }}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-glow-500 px-4 py-3 font-bold text-white shadow-xl shadow-brand-600/40 transition hover:scale-105 cursor-pointer"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="hidden sm:inline">Habla con tu asesora IA</span>
        </button>
      )}

      {/* Panel de chat */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex h-[560px] w-[min(92vw,400px)] animate-pop flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-brand-600/30 to-glow-500/20 px-4 py-3">
            {profile?.twin.avatarUrl ? (
              <img src={profile.twin.avatarUrl} className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20" alt="" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-glow-500 text-sm font-bold text-white">
                {(profile?.twin.name || "AI").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{profile?.twin.name || "Asesora IA"}</p>
              <p className="flex items-center gap-1 text-[11px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> En línea · responde al instante
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", state.score >= 5 ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5 text-slate-400")}>
                score {state.score}
              </span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-300 hover:bg-white/10 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-ink-950/60 p-4">
            {msgs.length === 0 && !typing && (
              <p className="text-center text-xs text-slate-500">Escribe para comenzar la conversación…</p>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-gradient-to-r from-brand-600 to-brand-500 text-white"
                      : "rounded-bl-sm border border-white/10 bg-ink-800 text-slate-200"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/10 bg-ink-800 px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 animate-blink rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}

            {done && (
              <div className="animate-pop space-y-2 border border-white/10 bg-white/5 p-3.5">
                {state.outcome === "HIGH" && (
                  <>
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-300"><PartyPopper className="h-4 w-4" /> ¡Excelente! Estás en el siguiente paso.</p>
                    {state.handoff?.calendarUrl && (
                      <a href={state.handoff.calendarUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-glow-500 px-3 py-2 text-xs font-bold text-white">
                        <Calendar className="h-4 w-4" /> Agendar 15 minutos
                      </a>
                    )}
                    {state.handoff?.whatsapp && (
                      <a href={state.handoff.whatsapp} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
                        <Phone className="h-4 w-4" /> Escribir por WhatsApp
                      </a>
                    )}
                  </>
                )}
                {state.outcome === "NUTRITION" && (
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                    <GraduationCap className="h-4 w-4" /> Te contactaremos con material educativo en los próximos días.
                  </p>
                )}
                {state.outcome === "NO_APTO" && (
                  <p className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                    <ThumbsDown className="h-4 w-4" /> Gracias por tu honestidad. Siempre puedes volver a conversar.
                  </p>
                )}
              </div>
            )}

            {error && <p className="text-center text-[11px] text-rose-400">{error}</p>}
          </div>

          {/* Input */}
          <div className="border-t border-white/10 bg-ink-900 p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Escribe tu mensaje…"
                disabled={typing}
                className="flex-1 rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-brand-500/60"
              />
              <button
                onClick={() => send(input)}
                disabled={typing || !input.trim()}
                className="rounded-xl bg-gradient-to-r from-brand-600 to-glow-500 p-2.5 text-white transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
              <Sparkles className="h-3 w-3" /> Asistente guiado por el conocimiento oficial de {profile?.org.name || "la empresa"}.
            </p>
          </div>
        </div>
      )}
    </>
  );
}