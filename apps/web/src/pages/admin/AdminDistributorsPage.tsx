import { useEffect, useState } from "react";
import { Network, Plus, Share2, Power, FlaskConical, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Avatar, Badge, EmptyState, Spinner, Modal, Field, Input, Textarea, Button, cn } from "../../components/ui";
import { scoreChip } from "../../lib/format";

interface Variant {
  id: string;
  name: string;
  tone: string;
  presentation: string;
  color: string;
  weight: number;
}

export default function AdminDistributorsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", presentation: "", whatsapp: "" });
  const [saving, setSaving] = useState(false);

  const [variantFor, setVariantFor] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);

  async function load() {
    setLoading(true);
    try {
      const d = await api("/api/distributors?pageSize=200");
      setItems(d.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setSaving(true);
    try {
      await api("/api/distributors", { method: "POST", body: JSON.stringify(form) });
      setCreating(false);
      setForm({ name: "", email: "", password: "", presentation: "", whatsapp: "" });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleFunnel(d: any) {
    await api(`/api/distributors/${d.id}`, { method: "PATCH", body: JSON.stringify({ funnelEnabled: !d.funnelEnabled }) });
    await load();
  }

  async function openVariants(d: any) {
    setVariantFor(d);
    const existing: Variant[] = Array.isArray(d.variants) ? d.variants : [];
    if (existing.length === 0) {
      setVariants([
        { id: "var-a", name: "Variante A", tone: "cercano y profesional", presentation: `Hola, soy ${d.name}. Te acompaño a conocer esta oportunidad paso a paso.`, color: "#f59e0b", weight: 1 },
        { id: "var-b", name: "Variante B", tone: "directo y motivador", presentation: `Hola, soy ${d.name}. Si buscas crecer, estás en el lugar correcto.`, color: "#10b981", weight: 1 },
      ]);
    } else {
      setVariants(existing);
    }
  }

  function setVariant(i: number, patch: Partial<Variant>) {
    setVariants((cur) => cur.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  async function saveVariants() {
    if (!variantFor) return;
    setSaving(true);
    try {
      const r = await api(`/api/distributors/${variantFor.id}/variants`, { method: "PUT", body: JSON.stringify({ variants }) });
      setVariants(r.variants || []);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Network className="h-6 w-6 text-brand-400" /> Distribuidores</h1>
          <p className="text-sm text-slate-400">Cada distribuidor recibe su propio AI Twin y funnel, conectados al Central Brain.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nuevo distribuidor</Button>
      </div>

      <Card className="p-0">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Network className="h-8 w-8" />} title="Sin distribuidores" text="Crea el primero o activa leads desde Onboarding." />
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Avatar name={d.name} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="rounded-lg bg-white/5 px-2 py-1">{d.leads} leads</span>
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-emerald-300">{d.highIntent} alta intención</span>
                  <span className="rounded-lg bg-white/5 px-2 py-1"><b className="text-white">{d.avgScore}</b> score</span>
                </div>
                <a href={`/f/${d.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-glow-400/40 hover:text-glow-400 cursor-pointer">
                  <Share2 className="h-3.5 w-3.5" /> /f/{d.slug}
                </a>
                <button
                  onClick={() => toggleFunnel(d)}
                  className={cn("flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer", d.funnelEnabled ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-slate-500")}
                  title={d.funnelEnabled ? "Desactivar funnel" : "Activar funnel"}
                >
                  <Power className="h-3.5 w-3.5" /> {d.funnelEnabled ? "Activo" : "Pausado"}
                </button>
                <button
                  onClick={() => openVariants(d)}
                  className="flex items-center gap-1.5 rounded-xl border border-brand-500/30 bg-brand-600/15 px-3 py-1.5 text-xs font-bold text-brand-200 transition hover:bg-brand-600/25 cursor-pointer"
                  title="Variantes A/B del funnel"
                >
                  <FlaskConical className="h-3.5 w-3.5" /> A/B ({Array.isArray(d.variants) ? d.variants.length : 0})
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Crear distribuidor y su AI Twin">
        <div className="space-y-4">
          <Field label="Nombre">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre y apellido" />
          </Field>
          <Field label="Email (acceso a la plataforma)">
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Contraseña temporal">
            <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </Field>
          <Field label="Presentación del AI Twin">
            <Input value={form.presentation} onChange={(e) => setForm((f) => ({ ...f, presentation: e.target.value }))} placeholder="Hola, soy… Te acompaño paso a paso." />
          </Field>
          <Field label="Link de WhatsApp">
            <Input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="https://wa.me/…" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button loading={saving} onClick={create} disabled={!form.name || !form.email || !form.password}>Crear</Button>
          </div>
        </div>
      </Modal>
      <Modal open={variantFor} onClose={() => setVariantFor(null)} title={`Variantes A/B · ${variantFor?.name ?? ""}`} wide>
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Cada visitante nuevo recibe una variante aleatoria (por peso) y la conserva. Se registra en la sesión para medir conversión.
          </p>
          {variants.map((v, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-brand-600/30 px-2 py-1 text-[10px] font-bold text-brand-200">V{i + 1}</span>
                <Input value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} className="flex-1" placeholder="Nombre de la variante" />
                <button onClick={() => setVariants((cur) => cur.filter((_, idx) => idx !== i))} className="rounded-lg p-1.5 text-slate-400 hover:text-rose-300 cursor-pointer" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tono de voz">
                  <Input value={v.tone} onChange={(e) => setVariant(i, { tone: e.target.value })} />
                </Field>
                <Field label="Peso (probabilidad)">
                  <Input type="number" min={0} value={v.weight} onChange={(e) => setVariant(i, { weight: Number(e.target.value) || 0 })} />
                </Field>
              </div>
              <Field label="Presentación (saludo inicial)">
                <Textarea value={v.presentation} onChange={(e) => setVariant(i, { presentation: e.target.value })} />
              </Field>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setVariants((cur) => [...cur, { id: `var-${Date.now().toString(36)}`, name: `Variante ${cur.length + 1}`, tone: "cercano y profesional", presentation: "", color: "#6366f1", weight: 1 }])}>
            <Plus className="h-4 w-4" /> Añadir variante
          </Button>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setVariantFor(null)}>Cerrar</Button>
            <Button loading={saving} onClick={saveVariants}>Guardar variantes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}