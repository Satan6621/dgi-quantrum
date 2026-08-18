import { useEffect, useState, type ChangeEvent } from "react";
import { Database, Plus, Pencil, Trash2, Search, Upload, FileText, Bot } from "lucide-react";
import { api, q } from "../../lib/api";
import { Card, Input, Select, Textarea, Button, Badge, EmptyState, Spinner, Modal, Field, cn } from "../../components/ui";
import { timeAgo } from "../../lib/format";

const CATEGORY_LABEL: Record<string, { label: string; color: string }> = {
  CORPORATE: { label: "Corporativo", color: "bg-slate-500/15 text-slate-300 border-slate-400/25" },
  PRODUCT: { label: "Productos", color: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25" },
  VALUE_PROP: { label: "Propuesta de valor", color: "bg-cyan-500/15 text-cyan-300 border-cyan-400/25" },
  POLICY: { label: "Políticas", color: "bg-amber-500/15 text-amber-300 border-amber-400/25" },
  FAQ: { label: "FAQ", color: "bg-sky-500/15 text-sky-300 border-sky-400/25" },
  ELIGIBILITY: { label: "Elegibilidad", color: "bg-teal-500/15 text-teal-300 border-teal-400/25" },
  DISQUALIFICATION: { label: "Descalificación", color: "bg-rose-500/15 text-rose-300 border-rose-400/25" },
  SCREENING: { label: "Screening", color: "bg-violet-500/15 text-violet-300 border-violet-400/25" },
  ARGUMENT: { label: "Argumentos", color: "bg-indigo-500/15 text-indigo-300 border-indigo-400/25" },
  PROHIBITED_CLAIM: { label: "Claims prohibidos", color: "bg-red-500/15 text-red-300 border-red-400/25" },
  PROCESS: { label: "Procesos", color: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/25" },
  FOLLOW_UP: { label: "Follow-up", color: "bg-orange-500/15 text-orange-300 border-orange-400/25" },
  ESCALATION: { label: "Escalamiento", color: "bg-lime-500/15 text-lime-300 border-lime-400/25" },
  OBJECTION: { label: "Objeciones", color: "bg-yellow-500/15 text-yellow-300 border-yellow-400/25" },
};

const CATEGORIES = Object.keys(CATEGORY_LABEL);

export default function AdminBrainPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cat, setCat] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ category: "FAQ", title: "", content: "", keywords: "" });
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTest, setShowTest] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: any = { pageSize: 200 };
      if (cat) params.category = cat;
      if (search) params.q = search;
      const d = await api("/api/brain" + q(params));
      setItems(d.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api("/api/brain/categories").then((d) => setCategories(d.categories));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, search]);

  function openNew() {
    setEditing({ id: null });
    setForm({ category: cat || "FAQ", title: "", content: "", keywords: "" });
  }

  function openEdit(item: any) {
    setEditing(item);
    setForm({ category: item.category, title: item.title, content: item.content, keywords: item.keywords || "" });
  }

  async function save() {
    setSaving(true);
    try {
      if (editing?.id) {
        await api(`/api/brain/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        await api("/api/brain", { method: "POST", body: JSON.stringify(form) });
      }
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este ítem de conocimiento?")) return;
    await api(`/api/brain/${id}`, { method: "DELETE" });
    await load();
  }

  async function toggleActive(item: any) {
    await api(`/api/brain/${item.id}`, { method: "PATCH", body: JSON.stringify({ active: !item.active }) });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Database className="h-6 w-6 text-brand-400" /> Central AI Brain</h1>
          <p className="text-sm text-slate-400">El conocimiento oficial que toda la red hereda. La IA usa esto como su única fuente de verdad.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowTest(true)}>
            <Bot className="h-4 w-4" /> Probar IA
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" /> Importar CSV
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Nuevo ítem</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input placeholder="Buscar en el cerebro…" className="w-64 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setCat("")} className={cn("rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer", !cat ? "bg-brand-600 text-white" : "bg-white/5 text-slate-400 hover:text-white")}>
            Todos
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c === cat ? "" : c)} className={cn("rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer", cat === c ? "bg-brand-600 text-white" : "bg-white/5 text-slate-400 hover:text-white")}>
              {CATEGORY_LABEL[c].label}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Database className="h-8 w-8" />} title="No hay ítems en el cerebro" text="Crea el primer ítem de conocimiento para que la IA pueda responder." />
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((it) => (
              <div key={it.id} className="flex items-start gap-4 px-5 py-3.5">
                <Badge className={CATEGORY_LABEL[it.category]?.color || "bg-white/5 text-slate-300"}>{CATEGORY_LABEL[it.category]?.label || it.category}</Badge>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold", it.active ? "text-white" : "text-slate-500 line-through")}>{it.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{it.content}</p>
                  {it.keywords && <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-600">keywords: {it.keywords}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1 text-slate-500">
                  <button onClick={() => toggleActive(it)} className="rounded-lg p-1.5 hover:bg-white/10 cursor-pointer" title={it.active ? "Desactivar" : "Activar"}>
                    <span className={cn("h-2 w-2 rounded-full", it.active ? "bg-emerald-400" : "bg-slate-600")} />
                  </button>
                  <button onClick={() => openEdit(it)} className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white cursor-pointer"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(it.id)} className="rounded-lg p-1.5 hover:bg-white/10 hover:text-rose-400 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Editar ítem" : "Nuevo ítem de conocimiento"} wide>
        <div className="space-y-4">
          <Field label="Categoría">
            <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]?.label || c}</option>)}
            </Select>
          </Field>
          <Field label="Título (o pregunta)">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Contenido">
            <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} className="min-h-[140px]" />
          </Field>
          <Field label="Keywords (para la búsqueda RAG, separadas por coma)" hint="Ej.: precio, kit, membresía, costo">
            <Input value={form.keywords} onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button loading={saving} onClick={save}>{editing?.id ? "Guardar cambios" : "Crear ítem"}</Button>
          </div>
        </div>
      </Modal>

      <ImportBrainModal open={showImport} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} />
      <BrainTestModal open={showTest} onClose={() => setShowTest(false)} />
    </div>
  );
}

function BrainTestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await api("/api/brain/test", { method: "POST", body: JSON.stringify({ text }) });
      setResult(r);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Playground — Probar la IA" wide>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Escribe lo que un prospecto preguntaría y mira cómo respondería la IA usando solo el contenido actual de tu cerebro (RAG híbrido + reglas).
        </p>
        <Field label="Pregunta del prospecto">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej.: ¿Cuánto cuesta el kit de inicio?" className="min-h-[90px]" />
        </Field>
        {result && (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-ink-800/60 p-4">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-300"><Bot className="h-3.5 w-3.5" /> Respuesta de la IA</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{result.reply}</p>
            </div>
            {result.sources?.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fuentes usadas ({result.sources.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.sources.map((s: any) => (
                    <span key={s.id} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
                      {CATEGORY_LABEL[s.category]?.label || s.category} · {s.title} <span className="text-slate-500">({s.relevance})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button onClick={submit} loading={busy} disabled={!text.trim()}>
            <Bot className="h-4 w-4" /> Probar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ImportBrainModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function readFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ""));
    reader.readAsText(f);
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = await api("/api/brain/import", { method: "POST", body: JSON.stringify({ csv }) });
      setResult(r);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar ítems de conocimiento (CSV)" wide>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Columnas: <code className="rounded bg-white/10 px-1 py-0.5 text-brand-300">category,title,content,keywords,active</code>.
          Categorías válidas: {CATEGORIES.join(", ")}.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={readFile} className="block w-full text-xs text-slate-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-600/80 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" />
        {csv && (
          <div className="rounded-xl border border-white/10 bg-ink-800/60 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><FileText className="h-3.5 w-3.5" /> Vista previa</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-400">{csv.slice(0, 800)}{csv.length > 800 ? "…" : ""}</pre>
          </div>
        )}
        {result && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">
            <p className="font-semibold text-emerald-300">✓ {result.created} creados · {result.errorCount} con error</p>
            {result.errors?.length > 0 && <p className="mt-1 text-[11px] text-slate-400">{result.errors.slice(0, 3).join(" · ")}</p>}
          </div>
        )}
        {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} loading={busy} disabled={!csv.trim()}>
            <Upload className="h-4 w-4" /> Importar
          </Button>
        </div>
      </div>
    </Modal>
  );
}