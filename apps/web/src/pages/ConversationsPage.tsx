import { useEffect, useState } from "react";
import { MessageSquare, Play } from "lucide-react";
import { api } from "../lib/api";
import { Card, Avatar, Badge, EmptyState, Spinner, Modal, cn, StatusPill } from "../components/ui";
import { timeAgo, scoreChip } from "../lib/format";

export default function ConversationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);

  useEffect(() => {
    api("/api/leads/conversations")
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  async function view(s: any) {
    setOpen(s);
    const d = await api(`/api/leads/${s.lead.id}`);
    const ses = d.lead.sessions.find((x: any) => x.id === s.id);
    setTranscript(ses?.messages || []);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><MessageSquare className="h-6 w-6 text-brand-400" /> Conversaciones IA</h1>
        <p className="text-sm text-slate-400">Todas las sesiones de tus AI conversations con prospectos.</p>
      </div>

      <Card className="p-0">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="Sin conversaciones todavía" text="Comparte tu funnel para que la IA converse con prospectos." />
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((s) => (
              <button key={s.id} onClick={() => view(s)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-white/[0.03] cursor-pointer">
                <Avatar name={s.lead?.name || "Anónimo"} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-white">{s.lead?.name || "Prospecto anónimo"}</p>
                    <Badge className={scoreChip(s.lead?.score ?? 0)}>{s.lead?.score ?? 0}</Badge>
                  </div>
                  <p className="truncate text-xs text-slate-400">
                    {s.messages} mensajes · {s.channel} · con {s.distributorName || "IA"} · {timeAgo(s.startedAt)}
                  </p>
                </div>
                <StatusPill status={s.lead?.status} />
                <span className="text-slate-500"><Play className="h-4 w-4" /></span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={`Conversación · ${open?.lead?.name || "Anónimo"}`} wide>
        <div className="space-y-2.5">
          {transcript.length === 0 && <EmptyState icon={<MessageSquare className="h-7 w-7" />} title="Sin mensajes" />}
          {transcript.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "USER" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed", m.role === "USER" ? "bg-brand-600/90 text-white" : "border border-white/10 bg-ink-800 text-slate-200")}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}