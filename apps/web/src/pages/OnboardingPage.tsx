import { useEffect, useState } from "react";
import { Rocket, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { Card, Avatar, Badge, EmptyState, Spinner, Button } from "../components/ui";
import { scoreChip } from "../lib/format";

export default function OnboardingPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  async function load() {
    setLoading(true);
    try {
      const d = await api("/api/leads?status=ONBOARDING");
      const activated = await api("/api/leads?status=DISTRIBUTOR");
      setLeads([...d.items, ...activated.items]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleTask(leadId: string, taskId: string) {
    await api(`/api/leads/${leadId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({}) });
    await load();
  }

  async function activate(lead: any) {
    setActivating(lead.id);
    try {
      const f = form[lead.id] || {};
      const r = await api(`/api/leads/${lead.id}/activate`, {
        method: "POST",
        body: JSON.stringify({
          name: f.name || lead.name,
          email: f.email || lead.email,
          password: f.password || "demo1234",
        }),
      });
      setResult(r);
      await load();
    } finally {
      setActivating(null);
    }
  }

  const onboarding = leads.filter((l) => l.status === "ONBOARDING");
  const activated = leads.filter((l) => l.status === "DISTRIBUTOR");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Rocket className="h-6 w-6 text-brand-400" /> Onboarding y duplicación</h1>
        <p className="text-sm text-slate-400">Convierte leads de alta intención en nuevos distribuidores con su propio AI Twin.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">En onboarding · {onboarding.length}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {onboarding.length === 0 && (
            <Card className="lg:col-span-2"><EmptyState icon={<Rocket className="h-8 w-8" />} title="Sin leads en onboarding" text="Acepta los handoffs de alta intención en Leads para iniciar el proceso." /></Card>
          )}
          {onboarding.map((l) => {
            const done = l.tasks?.filter((t: any) => t.completed).length || 0;
            const total = l.tasks?.length || 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const f = form[l.id] || {};
            return (
              <Card key={l.id} title={l.name} subtitle={`score ${l.score} · ${l.email || "sin email"}`} className="animate-pop">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] text-slate-400"><span>Progreso</span><span>{done}/{total} tareas · {pct}%</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-glow-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {l.tasks?.map((t: any) => (
                    <button key={t.id} onClick={() => toggleTask(l.id, t.id)} className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:bg-white/10 cursor-pointer">
                      {t.completed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="h-4 w-4 shrink-0 text-slate-500" />}
                      <span className={t.completed ? "text-xs text-slate-500 line-through" : "text-xs text-slate-200"}>{t.title}</span>
                    </button>
                  ))}
                </div>
                {pct === 100 && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="Nombre" className="col-span-3 rounded-lg border border-white/10 bg-ink-800 px-2.5 py-2 text-xs outline-none focus:border-brand-500/60" value={f.name ?? l.name} onChange={(e) => setForm((m) => ({ ...m, [l.id]: { ...f, name: e.target.value } }))} />
                      <input placeholder="Email" className="col-span-3 rounded-lg border border-white/10 bg-ink-800 px-2.5 py-2 text-xs outline-none focus:border-brand-500/60" value={f.email ?? l.email ?? ""} onChange={(e) => setForm((m) => ({ ...m, [l.id]: { ...f, email: e.target.value } }))} />
                    </div>
                    <Button className="w-full" size="sm" loading={activating === l.id} onClick={() => activate(l)}>
                      <Rocket className="h-4 w-4" /> Activar → nuevo distribuidor
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Duplicados recientes · {activated.length}</h2>
        <Card className="p-0">
          {activated.length === 0 ? (
            <EmptyState icon={<ArrowRight className="h-8 w-8" />} title="Aún no hay distribuidores activados" />
          ) : (
            <div className="divide-y divide-white/5">
              {activated.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Avatar name={l.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{l.name}</p>
                    <p className="text-xs text-slate-400">{l.email}</p>
                  </div>
                  <Badge className={scoreChip(l.score)}>{l.score}</Badge>
                  <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-300">Nuevo distribuidor 🎉</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {result && (
        <div className="animate-pop rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
          <p className="font-bold text-emerald-300">🎉 Activación completa: {result.newDistributor?.name} ya tiene su propio AI Twin.</p>
          <p className="mt-1 text-sm text-slate-300">
            Su funnel público: <a href={`/f/${result.newDistributor?.slug}`} target="_blank" rel="noreferrer" className="font-bold text-glow-400 hover:underline cursor-pointer">/f/{result.newDistributor?.slug}</a> · Credenciales: {result.newDistributor?.email}
          </p>
        </div>
      )}
    </div>
  );
}