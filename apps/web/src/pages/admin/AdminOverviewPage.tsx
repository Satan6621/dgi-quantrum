import { useEffect, useState } from "react";
import { Settings2, Database, ListOrdered, Network, Save, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Field, Input, Textarea, Button, Spinner } from "../../components/ui";

export default function AdminOverviewPage() {
  const [org, setOrg] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/api/org").then((d) => {
      setOrg(d.org);
      const s = d.org.settings || {};
      setForm({
        name: d.org.name,
        slug: d.org.slug,
        primaryColor: d.org.primaryColor || "#6366f1",
        logoUrl: d.org.logoUrl || "",
        highIntent: s?.thresholds?.highIntent ?? 5,
        nutrition: s?.thresholds?.nutrition ?? 2,
        slaHours: s?.slaHours ?? 24,
        checklist: (s?.onboardingChecklist || []).join("\n"),
      });
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const prev = org?.settings || {};
      const body = {
        name: form.name,
        slug: form.slug,
        primaryColor: form.primaryColor,
        logoUrl: form.logoUrl,
        settings: {
          ...prev,
          thresholds: { highIntent: Number(form.highIntent), nutrition: Number(form.nutrition) },
          slaHours: Number(form.slaHours),
          onboardingChecklist: form.checklist.split("\n").map((s: string) => s.trim()).filter(Boolean),
        },
      };
      const d = await api("/api/org", { method: "PUT", body: JSON.stringify(body) });
      setOrg(d.org);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));

  if (loading || !org) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-brand-400" /></div>;

  const cards = [
    { to: "/app/admin/brain", icon: Database, title: "Central AI Brain", desc: `${org._count?.brainItems ?? 0} ítems de conocimiento`, color: "from-brand-600 to-glow-500" },
    { to: "/app/admin/sequences", icon: ListOrdered, title: "Secuencias", desc: "Follow-ups y nutrícion", color: "from-violet-600 to-brand-400" },
    { to: "/app/admin/distributors", icon: Network, title: "Distribuidores", desc: `${org._count?.distributors ?? 0} AI Twins`, color: "from-emerald-600 to-teal-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Settings2 className="h-6 w-6 text-brand-400" /> Organización</h1>
        <p className="text-sm text-slate-400">Configura la empresa central, el scoring y el checklist de onboarding.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-brand-500/40 hover:bg-white/[0.07] cursor-pointer">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <p className="font-bold text-white">{c.title}</p>
            <p className="text-xs text-slate-400">{c.desc}</p>
          </Link>
        ))}
      </div>

      <Card title="Configuración de la empresa">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <Input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Slug (identificador)">
            <Input value={form.slug} onChange={set("slug")} />
          </Field>
          <Field label="Color primario">
            <div className="flex gap-2">
              <Input type="color" className="w-16 p-1" value={form.primaryColor} onChange={set("primaryColor")} />
              <Input value={form.primaryColor} onChange={set("primaryColor")} />
            </div>
          </Field>
          <Field label="Logo URL">
            <Input placeholder="https://…/logo.png" value={form.logoUrl} onChange={set("logoUrl")} />
          </Field>
        </div>
      </Card>

      <Card title="Umbrales de scoring" subtitle="Definen cuándo un prospecto pasa a NUTRICIÓN o ALTA INTENCIÓN">
        <div className="grid max-w-md gap-4 sm:grid-cols-3">
          <Field label="Alta intención (score ≥)">
            <Input type="number" value={form.highIntent} onChange={set("highIntent")} />
          </Field>
          <Field label="Nutrición (score ≥)">
            <Input type="number" value={form.nutrition} onChange={set("nutrition")} />
          </Field>
          <Field label="SLA handoff (horas)">
            <Input type="number" min={1} value={form.slaHours} onChange={set("slaHours")} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-500">Si un handoff no se atiende en <span className="font-semibold text-amber-300">{form.slaHours}h</span>, el sistema escala el lead a admins/managers y dispara el evento <code className="rounded bg-white/10 px-1 py-0.5 text-[11px]">lead.escalated</code>.</p>
      </Card>

      <Card title="Checklist de onboarding" subtitle="Un paso por línea — se aplica a cada lead que acepta el handoff">
        <Textarea value={form.checklist} onChange={set("checklist")} className="min-h-[140px] font-mono text-xs" />
      </Card>

      <div className="flex items-center justify-between">
        <Button onClick={save} loading={saving} className="min-w-[180px]">
          {saved ? <><Check className="h-4 w-4" /> Guardado</> : <><Save className="h-4 w-4" /> Guardar configuración</>}
        </Button>
        <span className="text-[11px] text-slate-500">Los cambios aplican a todos los AI Twins de la red.</span>
      </div>
    </div>
  );
}