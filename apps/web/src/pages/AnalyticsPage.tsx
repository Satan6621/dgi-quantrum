import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, PieChart, Layers, Users, FlaskConical, Timer, Download } from "lucide-react";
import { api, API, getToken } from "../lib/api";
import { Card, Stat, Spinner, EmptyState, cn, Button } from "../components/ui";

export default function AnalyticsPage() {
  const [ov, setOv] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [ts, setTs] = useState<any[]>([]);
  const [dist, setDist] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [vel, setVel] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"conversion" | "leads">("conversion");

  useEffect(() => {
    Promise.all([
      api("/api/analytics/overview"),
      api("/api/analytics/funnel"),
      api("/api/analytics/timeseries"),
      api("/api/analytics/distributors"),
      api("/api/analytics/score-distribution"),
      api("/api/analytics/variants"),
      api("/api/analytics/executive"),
    ])
      .then(([o, f, t, d, b, v, ex]) => {
        setOv(o);
        setFunnel(f.stages);
        setTs(t.buckets);
        setDist(d.items);
        setBuckets(b.buckets);
        setVariants(v.items);
        setVel(ex.velocity);
        setSources(ex.sources.items);
        setCohorts(ex.cohorts.cohorts);
      })
      .finally(() => setLoading(false));
  }, []);

  const funnelData = useMemo(() => {
    const order = ["IN_CONVERSATION", "NUTRITION", "HANDOFF", "ONBOARDING", "DISTRIBUTOR"];
    const map = Object.fromEntries(funnel.map((s) => [s.status, s.count]));
    let prev = ov?.total || 0;
    return order.map((k, i) => {
      const cur = map[k] || 0;
      const conv = prev > 0 ? Math.round((cur / prev) * 100) : 0;
      prev = cur;
      return { label: labelOf(k), count: cur, conv };
    });
  }, [funnel, ov]);

  async function downloadCsv() {
    const token = getToken();
    const res = await fetch(`${API}/api/export/analytics?format=csv`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analitica-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !ov) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-brand-400" /></div>;

  const maxBuckets = Math.max(1, ...buckets.map((b) => b.count));
  const maxTs = Math.max(1, ...ts.map((t) => (mode === "conversion" ? t.conversations : t.leads)));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><BarChart3 className="h-6 w-6 text-brand-400" /> Analítica</h1>
            <p className="text-sm text-slate-400">Mide calidad, intención y conversión — no solo volumen.</p>
          </div>
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Layers className="h-4 w-4" />} label="Leads totales" value={ov.total} sub={`${ov.avgScore} score promedio`} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Conversión" value={`${ov.conversion}%`} sub="hacia activación" accent="text-emerald-400" />
        <Stat icon={<PieChart className="h-4 w-4" />} label="Alta intención" value={ov.high} sub={`${ov.toHandoff} en handoff`} accent="text-glow-400" />
        <Stat icon={<Users className="h-4 w-4" />} label="Follow-ups hoy" value={ov.pendingFollowups} accent="text-amber-300" />
      </div>

      {/* Velocidad del funnel */}
      {vel && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={<Timer className="h-4 w-4" />} label="Tiempo medio a handoff" value={vel.avgTimeToHandoffH > 0 ? `${vel.avgTimeToHandoffH}h` : "—"} sub={`mediana ${vel.medianTimeToHandoffH}h · ${vel.sampleSize} handoffs`} accent="text-violet-300" />
          <Stat icon={<Timer className="h-4 w-4" />} label="Respuesta del distribuidor" value={vel.avgHandoffToActivationH > 0 ? `${vel.avgHandoffToActivationH}h` : "—"} sub="handoff → activación" accent="text-cyan-300" />
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="SLA de handoff" value={`${vel.handoffsSlaCompliance}%`} sub={`${vel.handoffsResolvedWithinSla}/${vel.handoffsResolved} en ≤ ${vel.handoffSlaHours}h`} accent="text-emerald-400" />
          <Stat icon={<BarChart3 className="h-4 w-4" />} label="Latencia IA" value={vel.avgAiReplyMs > 0 ? `${Math.round(vel.avgAiReplyMs / 1000)}s` : "—"} sub="usuario → respuesta" accent="text-amber-300" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel de conversión */}
        <Card title="Funnel de conversión" subtitle="Cuántos pasan de una etapa a la siguiente">
          <div className="space-y-4">
            {funnelData.map((s, i) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">{s.label}</span>
                  <span className="text-slate-400">
                    {s.count} · <b className={cn("font-bold", s.conv >= 40 ? "text-emerald-400" : s.conv >= 15 ? "text-amber-300" : "text-rose-400")}>{s.conv}%</b>
                  </span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/5">
                  <div className={cn("h-full rounded-full bg-gradient-to-r transition-all", i === 0 ? "from-brand-600 to-glow-500" : i >= 4 ? "from-emerald-500 to-teal-400" : "from-violet-600 to-brand-400")} style={{ width: `${Math.max(s.conv, 2)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Distribución de scoring */}
        <Card title="Distribución de scoring" subtitle="Dónde se concentran tus prospectos">
          <div className="flex h-48 items-end gap-3">
            {buckets.map((b, i) => (
              <div key={b.label} className="group flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-bold text-white">{b.count}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-700/60 to-glow-500/70 transition group-hover:brightness-125" style={{ height: `${Math.max((b.count / maxBuckets) * 100, 4)}%` }} />
                <span className={cn("text-[10px] font-semibold", i <= 1 ? "text-rose-300" : i === 2 ? "text-amber-300" : "text-emerald-300")}>{b.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Serie temporal */}
      <Card
        title="Actividad diaria"
        subtitle={mode === "conversion" ? "Conversaciones IA por día" : "Leads capturados por día"}
        action={
          <div className="flex gap-1 rounded-lg bg-ink-800/70 p-0.5">
            {(["conversion", "leads"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={cn("rounded-md px-2.5 py-1 text-[11px] font-bold transition cursor-pointer", mode === m ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200")}>
                {m === "conversion" ? "Conversaciones" : "Leads"}
              </button>
            ))}
          </div>
        }
      >
        <LineChart data={ts.map((t) => (mode === "conversion" ? t.conversations : t.leads))} labels={ts.map((t) => t.label)} max={maxTs} />
      </Card>

      {/* Conversión por canal */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Conversión por canal" subtitle="Dónde llegan tus leads y qué tan lejos llegan">
          {sources.length === 0 ? (
            <EmptyState icon={<Layers className="h-8 w-8" />} title="Sin datos por canal" />
          ) : (
            <div className="space-y-4">
              {sources.map((s) => (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-300">
                      <Layers className="h-3.5 w-3.5 text-brand-300" /> {s.source || "desconocido"}
                    </span>
                    <span className="text-slate-400">{s.total} leads · <b className="text-emerald-400">{s.conversionRate}%</b> act.</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${Math.max(s.conversionRate, 2)}%` }} />
                  </div>
                  <div className="mt-1 flex gap-4 text-[10px] text-slate-500">
                    <span>{s.highIntent} alta intención ({s.highRate}%)</span>
                    <span>{s.onboarded} activados</span>
                    <span>{s.disqualified} no aptos</span>
                    <span>score {s.avgScore}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Cohortes semanales */}
        <Card title="Cohortes semanales" subtitle="Cómo progresan los leads por semana de captura (90 días)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Semana</th>
                  <th className="py-2 pr-3 font-semibold">Creados</th>
                  <th className="py-2 pr-3 font-semibold">Alta intención</th>
                  <th className="py-2 font-semibold">Activados</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.filter((c) => c.created > 0).length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-xs text-slate-500">Sin cohortes todavía</td></tr>
                ) : (
                  cohorts.filter((c) => c.created > 0).map((c) => (
                    <tr key={c.week} className="border-b border-white/5">
                      <td className="py-2.5 pr-3 font-semibold text-white">{c.label}</td>
                      <td className="py-2.5 pr-3 text-slate-300">{c.created}</td>
                      <td className="py-2.5 pr-3 text-amber-300">{c.high} ({c.highRate}%)</td>
                      <td className="py-2.5 text-emerald-300">{c.onboarded} ({c.onboardRate}%)</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Variantes A/B */}
      {variants.length > 0 && (
        <Card title="Variantes A/B" subtitle="Comparativa de conversión por variante del funnel">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Variante</th>
                  <th className="py-2 pr-3 font-semibold">Distribuidor</th>
                  <th className="py-2 pr-3 font-semibold">Sesiones</th>
                  <th className="py-2 pr-3 font-semibold">Alta intención</th>
                  <th className="py-2 pr-3 font-semibold">Conversiones</th>
                  <th className="py-2 font-semibold">Tasa</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2 font-semibold text-white">
                        <FlaskConical className="h-3.5 w-3.5 text-brand-300" /> {v.name}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300">{v.distributorName ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-slate-300">{v.sessions}</td>
                    <td className="py-2.5 pr-3 text-amber-300">{v.highIntent}</td>
                    <td className="py-2.5 pr-3 text-emerald-300">{v.conversions}</td>
                    <td className="py-2.5">
                      <span className={cn("font-extrabold", v.conversionRate >= 30 ? "text-emerald-400" : v.conversionRate >= 10 ? "text-amber-300" : "text-rose-400")}>
                        {v.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Rendimiento por distribuidor */}
      <Card title="Rendimiento por distribuidor" subtitle="Leads, alta intención y score promedio">        {dist.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />} title="Sin datos por distribuidor" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Distribuidor</th>
                  <th className="py-2 pr-3 font-semibold">Leads</th>
                  <th className="py-2 pr-3 font-semibold">Alta intención</th>
                  <th className="py-2 pr-3 font-semibold">Score promedio</th>
                  <th className="py-2 font-semibold">Funnel</th>
                </tr>
              </thead>
              <tbody>
                {dist.map((d) => (
                  <tr key={d.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3 font-semibold text-white">{d.name}</td>
                    <td className="py-2.5 pr-3 text-slate-300">{d.leads}</td>
                    <td className="py-2.5 pr-3 text-emerald-300">{d.highIntent}</td>
                    <td className="py-2.5 pr-3 text-slate-300">{d.avgScore}</td>
                    <td className="py-2.5"><a href={`/f/${d.slug}`} className="text-xs font-bold text-brand-400 hover:text-brand-300 cursor-pointer">/f/{d.slug}</a></td>
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

function labelOf(status: string): string {
  const map: Record<string, string> = {
    IN_CONVERSATION: "En conversación",
    NUTRITION: "Nutrición",
    HANDOFF: "Alta intención",
    ONBOARDING: "Onboarding",
    DISTRIBUTOR: "Activado",
  };
  return map[status] || status;
}

function LineChart({ data, labels, max }: { data: number[]; labels: string[]; max: number }) {
  const w = 720;
  const h = 160;
  const pad = 8;
  const n = data.length;
  if (n === 0) return <EmptyState icon={<TrendingUp className="h-8 w-8" />} title="Sin datos" />;
  const stepX = (w - pad * 2) / (n - 1 || 1);
  const pts = data.map((v, i) => ({ x: pad + i * stepX, y: h - pad - (v / max) * (h - pad * 2) }));
  const area = `M ${pts[0].x} ${h - pad} L ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${pts[n - 1].x} ${h - pad} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad} x2={w - pad} y1={h * f} y2={h * f} stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#lineFill)" />
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#0a1020" stroke="#22d3ee" strokeWidth="2" />
            <title>{`${labels[i]}: ${data[i]}`}</title>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        {labels.filter((_, i) => i % 2 === 0 || i === n - 1).map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
}