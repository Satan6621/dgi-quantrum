import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, MessageSquare, Flame, TrendingUp, BellRing, Rocket, Target, ArrowUpRight } from "lucide-react";
import { api, q } from "../lib/api";
import { Card, Stat, StatusPill, EmptyState, Avatar, Badge, cn } from "../components/ui";
import LoadingSpinner from "../components/LoadingSpinner";
import { timeAgo, scoreChip, srcLabel } from "../lib/format";

export default function DashboardPage() {
  const [ov, setOv] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api("/api/analytics/overview"), api("/api/analytics/funnel"), api("/api/leads")])
      .then(([o, f, l]) => {
        setOv(o);
        setFunnel(f.stages);
        setLeads(l.items.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !ov) {
    return <LoadingSpinner size="lg" label="Cargando panel..." className="py-24" />;
  }

  const total = ov.total || 0;
  const maxStage = Math.max(1, ...funnel.map((f) => f.count));

  const stageLabels: Record<string, string> = {
    NEW: "Nuevo",
    IN_CONVERSATION: "En conversación",
    NUTRITION: "Nutrición",
    HANDOFF: "Alta intención",
    ONBOARDING: "Onboarding",
    DISTRIBUTOR: "Activado",
    DISQUALIFIED: "No apto",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Panel de crecimiento</h1>
        <p className="text-sm text-slate-400">Ciclo completo: tráfico → prospectos informados → alta intención → activación.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat icon={<Users className="h-4 w-4" />} label="Leads" value={ov.total} sub={`${ov.inConversation} en conversación`} />
        <Stat icon={<MessageSquare className="h-4 w-4" />} label="Conversaciones" value={ov.conversations} sub="sesiones de IA" />
        <Stat icon={<Flame className="h-4 w-4" />} label="Alta intención" value={ov.high} sub="handoffs generados" accent="text-emerald-400" />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Score promedio" value={ov.avgScore} sub={`${ov.nutrition} en nutrición`} accent="text-glow-400" />
        <Stat icon={<Rocket className="h-4 w-4" />} label="Conversión" value={`${ov.conversion}%`} sub={`${ov.onboarded} activados`} accent="text-violet-400" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Funnel */}
        <Card title="Funnel de conversión" subtitle="Distribución por etapa del pipeline" className="lg:col-span-3">
          <div className="space-y-3">
            {funnel.filter((s) => s.count > 0 || s.status !== "NEW").map((s) => {
              const pct = Math.round((s.count / maxStage) * 100);
              return (
                <div key={s.status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{stageLabels[s.status] || s.status}</span>
                    <span className="text-slate-500">{s.count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r transition-all",
                        s.status === "HANDOFF" || s.status === "ONBOARDING" || s.status === "DISTRIBUTOR" ? "from-emerald-500 to-teal-400" : s.status === "DISQUALIFIED" ? "from-rose-500 to-rose-400" : "from-brand-600 to-glow-500"
                      )}
                      style={{ width: `${Math.max(pct, s.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
            <span className="flex items-center gap-2 text-slate-300"><BellRing className="h-4 w-4 text-amber-300" /> Follow-ups por vencer hoy</span>
            <span className="font-extrabold text-white">{ov.pendingFollowups}</span>
          </div>
        </Card>

        {/* Objetivo del sistema */}
        <Card title="Por qué importa" subtitle="No perseguimos volumen, perseguimos calidad" className="lg:col-span-2">
          <div className="space-y-3">
            {[
              { icon: Target, t: "Prospectos informados", d: "La IA educa antes de cualificar.", c: "text-glow-400" },
              { icon: Flame, t: "Alta intención real", d: "Solo los compatibles llegan a ti.", c: "text-emerald-400" },
              { icon: Rocket, t: "Activación → duplicación", d: "Cada lead activado crea su propio AI Twin.", c: "text-violet-400" },
            ].map((x) => (
              <div key={x.t} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <x.icon className={cn("h-5 w-5 shrink-0", x.c)} />
                <div>
                  <p className="text-sm font-bold text-white">{x.t}</p>
                  <p className="text-xs text-slate-400">{x.d}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/app/analytics" className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/5 cursor-pointer">
            Ver analítica completa <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      {/* Leads recientes */}
      <Card
        title="Leads recientes"
        subtitle="Última actividad de tus prospectos"
        action={<Link to="/app/leads" className="text-xs font-bold text-brand-400 hover:text-brand-300 cursor-pointer">Ver todos →</Link>}
      >
        {leads.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />} title="Sin leads todavía" text="Comparte tu funnel público y la IA empezará a cualificar prospectos." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Prospecto</th>
                  <th className="py-2 pr-3 font-semibold">Score</th>
                  <th className="py-2 pr-3 font-semibold">Estado</th>
                  <th className="py-2 pr-3 font-semibold">Fuente</th>
                  <th className="py-2 pr-3 font-semibold">Actividad</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={l.name} size={30} />
                        <div>
                          <p className="font-semibold text-white">{l.name}</p>
                          {l.email && <p className="text-[11px] text-slate-500">{l.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3"><Badge className={scoreChip(l.score)}>{l.score}</Badge></td>
                    <td className="py-2.5 pr-3"><StatusPill status={l.status} /></td>
                    <td className="py-2.5 pr-3 text-slate-400">{srcLabel(l.source)}</td>
                    <td className="py-2.5 text-slate-400">{timeAgo(l.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}