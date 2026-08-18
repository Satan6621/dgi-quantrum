import { useEffect, useState } from "react";
import { ListOrdered, Plus, Trash2, Pencil, Clock } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Input, Button, Badge, EmptyState, Spinner, Modal, Field, cn } from "../../components/ui";

interface Step {
  delayDays: number;
  title: string;
  content: string;
  channel?: string;
}

export default function AdminSequencesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<{ name: string; trigger: string; steps: Step[] }>({ name: "", trigger: "NUTRICION", steps: [] });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await api("/api/org/sequences");
      setItems(d.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing({ id: null });
    setForm({ name: "Nueva secuencia", trigger: "NUTRICION", steps: [{ delayDays: 1, title: "Primer contacto", content: "Hola {name}, continuamos nuestra conversación…", channel: "whatsapp" }] });
  }

  function openEdit(s: any) {
    setEditing(s);
    setForm({ name: s.name, trigger: s.trigger, steps: s.steps || [] });
  }

  function setStep(i: number, k: keyof Step, v: any) {
    setForm((f) => ({ ...f, steps: f.steps.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)) }));
  }

  async function save() {
    setSaving(true);
    try {
      if (editing?.id) {
        await api(`/api/org/sequences/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        await api("/api/org/sequences", { method: "POST", body: JSON.stringify(form) });
      }
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta secuencia?")) return;
    await api(`/api/org/sequences/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><ListOrdered className="h-6 w-6 text-brand-400" /> Secuencias de follow-up</h1>
          <p className="text-sm text-slate-400">Nutrición automatizada: cada lead en NUTRICIÓN recibe estos pasos programados.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Nueva secuencia</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-2 flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-400" /></div>
        ) : items.length === 0 ? (
          <div className="col-span-2"><EmptyState icon={<ListOrdered className="h-8 w-8" />} title="Sin secuencias" /></div>
        ) : (
          items.map((s) => (
            <Card key={s.id} title={s.name} subtitle={`Disparador: ${s.trigger}`}
              action={
                <div className="flex gap-1 text-slate-500">
                  <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white cursor-pointer"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(s.id)} className="rounded-lg p-1.5 hover:bg-white/10 hover:text-rose-400 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                </div>
              }
            >
              <div className="space-y-2.5">
                {(s.steps || []).map((st: Step, i: number) => (
                  <div key={i} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-glow-500 text-xs font-bold text-white">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{st.title}</p>
                        <Badge className="border-white/10 bg-white/5 text-slate-300"><Clock className="h-3 w-3" /> +{st.delayDays}d</Badge>
                        <Badge className="border-white/10 bg-white/5 text-slate-400">{st.channel || "whatsapp"}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{st.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Editar secuencia" : "Nueva secuencia"} wide>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Disparador">
              <select className="w-full cursor-pointer rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/60" value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}>
                <option value="NUTRICION">NUTRICIÓN</option>
                <option value="HIGH_INTENT">ALTA INTENCIÓN</option>
              </select>
            </Field>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pasos ({form.steps.length})</p>
            {form.steps.map((st, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="Días después">
                    <Input type="number" min={0} value={st.delayDays} onChange={(e) => setStep(i, "delayDays", Number(e.target.value))} />
                  </Field>
                  <Field label="Título">
                    <Input value={st.title} onChange={(e) => setStep(i, "title", e.target.value)} />
                  </Field>
                  <Field label="Canal">
                    <select className="w-full cursor-pointer rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/60" value={st.channel || "whatsapp"} onChange={(e) => setStep(i, "channel", e.target.value)}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                    </select>
                  </Field>
                </div>
                <div className="mt-2">
                  <Field label="Mensaje (usa {'{name}'} y {'{twin}'})">
                    <Input value={st.content} onChange={(e) => setStep(i, "content", e.target.value)} />
                  </Field>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, { delayDays: 2, title: "Nuevo paso", content: "", channel: "whatsapp" }] }))}>
              <Plus className="h-4 w-4" /> Añadir paso
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button loading={saving} onClick={save}>{editing?.id ? "Guardar" : "Crear secuencia"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}