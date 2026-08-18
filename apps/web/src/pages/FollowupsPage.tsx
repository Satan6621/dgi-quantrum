import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Clock } from "lucide-react";
import { api } from "../lib/api";
import { Card, Badge, EmptyState, Spinner, Avatar } from "../components/ui";
import { dateTime, timeAgo } from "../lib/format";

export default function FollowupsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  async function load(f = filter) {
    setLoading(true);
    try {
      const d = await api("/api/followups?pageSize=200" + (f ? `&status=${f}` : ""));
      setItems(d.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = items.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><BellRing className="h-6 w-6 text-brand-400" /> Follow-ups</h1>
          <p className="text-sm text-slate-400">Nutrición automatizada para leads en espera de maduración.</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-ink-800/60 p-1">
          {["", "PENDING", "SENT"].map((f) => (
            <button
              key={f || "all"}
              onClick={() => { setFilter(f); load(f); }}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer", filter === f ? "bg-brand-600/80 text-white" : "text-slate-400 hover:text-slate-200")}
            >
              {f === "" ? "Todos" : f === "PENDING" ? "Pendientes" : "Enviados"}
            </button>
          ))}
        </div>
      </div>

      {!loading && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm">
          <Clock className="h-4 w-4 text-amber-300" />
          <span className="text-slate-300"><b className="text-white">{pending}</b> follow-ups pendientes.</span>
        </div>
      )}

      <Card className="p-0">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<BellRing className="h-8 w-8" />} title="Sin follow-ups" text="Cuando la IA clasifica un prospecto en NUTRICIÓN, se programa la secuencia automáticamente." />
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((f) => (
              <div key={f.id} className="flex items-start gap-4 px-5 py-4">
                <Avatar name={f.lead?.name || "Lead"} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{f.title}</p>
                    <Badge className={f.status === "SENT" ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" : "border-amber-400/30 bg-amber-500/15 text-amber-300"}>
                      {f.status === "SENT" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {f.status === "SENT" ? "Enviado" : "Pendiente"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">Para <b className="text-slate-200">{f.lead?.name || "—"}</b> · {f.channel}</p>
                  <p className="mt-1 whitespace-pre-line rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs text-slate-300">{f.content}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {f.status === "SENT" ? `Enviado ${timeAgo(f.sentAt)}` : `Programado para ${dateTime(f.dueAt)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

import { cn } from "../components/ui";