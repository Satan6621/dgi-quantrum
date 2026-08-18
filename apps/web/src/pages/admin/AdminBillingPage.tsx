import { useEffect, useState } from "react";
import { Check, Receipt, ShieldCheck, KeyRound, Copy } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Button, Badge, Spinner, cn } from "../../components/ui";
import { timeAgo } from "../../lib/format";

export default function AdminBillingPage() {
  const [billing, setBilling] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([api("/api/billing"), api("/api/billing/plans")])
      .then(([b, p]) => {
        setBilling(b.billing);
        setPlans(p.plans);
      })
      .finally(() => setLoading(false));
  }, []);

  async function checkout(planId: string) {
    setBusyPlan(planId);
    setMsg("");
    try {
      const r = await api("/api/billing/checkout", { method: "POST", body: JSON.stringify({ planId }) });
      if (r.url) window.location.href = r.url;
      else {
        setMsg(`Plan ${planId} activado (modo simulado, sin pasarela).`);
        const b = await api("/api/billing");
        setBilling(b.billing);
      }
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusyPlan(null);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-brand-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white">Plan y facturación</h1>
        <p className="text-sm text-slate-400">Gestiona tu suscripción y los límites de tu organización.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge className="bg-brand-600/20 text-brand-200 border-brand-500/30">Plan actual: {billing?.planName} (${billing?.price}/mes)</Badge>
        <Badge className={billing?.expired ? "bg-rose-500/15 text-rose-300 border-rose-400/30" : billing?.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" : "bg-amber-500/15 text-amber-300 border-amber-400/30"}>
          {billing?.expired ? "VENCIDO" : billing?.status}
        </Badge>
        {billing?.periodEnd && !billing?.expired && (
          <Badge className="bg-white/5 text-slate-300 border-white/10">Renovación: {new Date(billing.periodEnd).toLocaleDateString()}</Badge>
        )}
        <Badge className="bg-white/5 text-slate-300 border-white/10">
          Pago: {billing?.mode === "stripe" ? "Stripe" : billing?.mode === "simulate" ? "Simulado (demo)" : "—"}
        </Badge>
        <Badge className="bg-white/5 text-slate-300 border-white/10">
          Uso: {billing?.usage.distributors}/{billing?.limits.distributors === Infinity ? "∞" : billing?.limits.distributors} distribuidores · {billing?.usage.leads}/{billing?.limits.leads === Infinity ? "∞" : billing?.limits.leads} leads · {billing?.usage.brain}/{billing?.limits.brain === Infinity ? "∞" : billing?.limits.brain} brain
        </Badge>
      </div>

      {billing?.expired && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
          Tu suscripción venció. Tu cuenta está en Prueba gratuita: suscríbete de nuevo para recuperar el plan.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => {
          const current = p.id === billing?.plan;
          return (
            <Card key={p.id} className={cn("relative flex flex-col", current && "border-brand-500/50 glow-ring")} title={p.name} subtitle={`$${p.price}/mes`}>
              {current && <span className="absolute right-4 top-4"><Badge className="bg-brand-600/20 text-brand-200 border-brand-500/30">Actual</Badge></span>}
              <ul className="flex-1 space-y-2">
                {p.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> {f}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-xs text-slate-300">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> {p.distributors === Infinity ? "Distribuidores ilimitados" : `Hasta ${p.distributors} distribuidores`}
                </li>
              </ul>
              <Button className="mt-4 w-full" variant={current ? "outline" : "primary"} disabled={current} loading={busyPlan === p.id} onClick={() => checkout(p.id)}>
                {current ? "Plan actual" : p.id === "STARTER" ? "Cambiar a Starter" : "Suscribirme"}
              </Button>
            </Card>
          );
        })}
      </div>

      {msg && <p className="rounded-xl border border-brand-500/30 bg-brand-600/10 px-4 py-2.5 text-xs text-brand-200">{msg}</p>}

      <Card title="Facturas" subtitle="Historial de cobros">
        {billing?.invoices?.length ? (
          <div className="space-y-2">
            {billing.invoices.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-400"><Receipt className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs font-bold text-white">{i.description}</p>
                    <p className="text-[10px] text-slate-500">{timeAgo(i.createdAt)} · {i.plan}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={i.status === "PAID" ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" : "bg-amber-500/15 text-amber-300 border-amber-400/30"}>{i.status}</Badge>
                  <span className="text-sm font-extrabold text-white">${i.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Sin facturas todavía.</p>
        )}
      </Card>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
        <ShieldCheck className="h-3.5 w-3.5" /> Si se supera un límite del plan, la plataforma responde 402 y te invita a actualizar. Con Stripe configurado, el pago se confirma por webhook firmado (<code className="text-slate-500">/api/billing/webhook</code>); sin tarjeta (demo) el checkout es simulado.
      </p>
    </div>
  );
}