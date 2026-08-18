import { useEffect, useState, type ChangeEvent } from "react";
import { Users, Search, Filter, MessageSquare, Phone, Calendar, CheckCircle2, Rocket, ArrowUpRight, BellRing, Upload, FileText } from "lucide-react";
import { api, q } from "../lib/api";
import { Card, Input, Select, Button, Badge, StatusPill, Avatar, EmptyState, Spinner, Modal, cn, Tabs, Pager } from "../components/ui";
import { timeAgo, dateTime, scoreChip, srcLabel, OUTCOME_LABEL, initials } from "../lib/format";

const STATUSES = ["NEW", "IN_CONVERSATION", "NUTRITION", "HANDOFF", "ONBOARDING", "DISTRIBUTOR", "DISQUALIFIED"];
const SOURCES = ["funnel", "whatsapp", "referral", "widget"];
const PAGE_SIZE = 20;

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ status: string; source: string; q: string }>({ status: "", source: "", q: "" });
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showImport, setShowImport] = useState(false);

  async function load(f = filters, p = page) {
    setLoading(true);
    try {
      const d = await api("/api/leads" + q({ ...f, page: p, pageSize: PAGE_SIZE }));
      setLeads(d.items);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(filters, 1); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  useEffect(() => {
    setPage(1);
    load(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.source]);

  async function openDetail(l: any) {
    setSelected(l);
    const d = await api(`/api/leads/${l.id}`);
    setDetail(d.lead);
  }

  async function act(path: string, body: any) {
    const r = await api(path, { method: "POST", body: JSON.stringify(body) });
    await reload();
    return r;
  }

  async function reload() {
    await load(filters, page);
    if (selected) openDetail(selected);
  }

  async function patchStatus(status: string) {
    if (!selected) return;
    await api(`/api/leads/${selected.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await reload();
  }

  async function toggleTask(taskId: string) {
    if (!selected) return;
    await api(`/api/leads/${selected.id}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({}) });
    await reload();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Users className="h-6 w-6 text-brand-400" /> Leads</h1>
          <p className="text-sm text-slate-400">Prospectos cualificados por tus AI conversations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" /> Importar CSV
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input placeholder="Buscar…" className="w-56 pl-9" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
          </div>
          <Select className="w-40" value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); load({ ...filters, status: e.target.value }, 1); }}>
            <option value="">Estado: todos</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select className="w-36" value={filters.source} onChange={(e) => { setFilters((f) => ({ ...f, source: e.target.value })); load({ ...filters, source: e.target.value }, 1); }}>
            <option value="">Fuente: todas</option>
            {SOURCES.map((s) => <option key={s} value={s}>{srcLabel(s)}</option>)}
          </Select>
        </div>
      </div>

      <Card className="p-0">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-400" /></div>
        ) : leads.length === 0 ? (
          <EmptyState icon={<Filter className="h-8 w-8" />} title="No hay leads con esos filtros" text="Ajusta los filtros o comparte tu funnel para atraer prospectos." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Prospecto</th>
                    <th className="px-3 py-3 font-semibold">Score</th>
                    <th className="px-3 py-3 font-semibold">Intención</th>
                    <th className="px-3 py-3 font-semibold">Estado</th>
                    <th className="px-3 py-3 font-semibold">Fuente</th>
                    <th className="px-3 py-3 font-semibold">Actividad</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} onClick={() => openDetail(l)} className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={l.name} size={32} />
                          <div>
                            <p className="font-semibold text-white">{l.name}</p>
                            <p className="text-[11px] text-slate-500">{l.email || "sin email"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3"><Badge className={scoreChip(l.score)}>{l.score}</Badge></td>
                      <td className="px-3 py-3">
                        <span className={cn("text-xs font-bold", l.intentLevel === "HIGH" ? "text-emerald-400" : l.intentLevel === "LOW" ? "text-rose-400" : "text-slate-400")}>
                          {l.intentLevel || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3"><StatusPill status={l.status} /></td>
                      <td className="px-3 py-3 text-slate-400">{srcLabel(l.source)}</td>
                      <td className="px-3 py-3 text-slate-400">{timeAgo(l.lastActivity)}</td>
                      <td className="px-3 py-3 text-right text-slate-500"><ArrowUpRight className="ml-auto h-4 w-4" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} totalPages={totalPages} total={total} onPage={(p) => { setPage(p); load(filters, p); }} />
          </>
        )}
      </Card>

      <ImportLeadsModal open={showImport} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(filters, 1); }} />

      <LeadDetail
        selected={selected}
        detail={detail}
        onClose={() => { setSelected(null); setDetail(null); }}
        onPatch={patchStatus}
        onAct={act}
        onToggleTask={toggleTask}
      />
    </div>
  );
}

function ImportLeadsModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState("");
  const [source, setSource] = useState("import");
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
      const r = await api("/api/leads/import", { method: "POST", body: JSON.stringify({ csv, source }) });
      setResult(r);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar leads desde CSV" wide>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Columnas: <code className="rounded bg-white/10 px-1 py-0.5 text-brand-300">name,email,phone,source,distributor_slug</code>.
          La primera fila debe ser el encabezado. Se omiten los duplicados por email o teléfono.
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Archivo CSV</label>
          <input type="file" accept=".csv,text/csv" onChange={readFile} className="block w-full text-xs text-slate-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-600/80 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Fuente por defecto</label>
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="import">import</option>
            <option value="funnel">funnel</option>
            <option value="whatsapp">whatsapp</option>
            <option value="referral">referral</option>
            <option value="widget">widget</option>
          </Select>
        </div>
        {csv && (
          <div className="rounded-xl border border-white/10 bg-ink-800/60 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><FileText className="h-3.5 w-3.5" /> Vista previa</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-400">{csv.slice(0, 800)}{csv.length > 800 ? "…" : ""}</pre>
          </div>
        )}
        {result && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">
            <p className="font-semibold text-emerald-300">✓ {result.created} creados · {result.skippedCount} omitidos · {result.errorCount} con error</p>
            {result.skipped?.length > 0 && <p className="mt-1 text-[11px] text-slate-400">{result.skipped.slice(0, 3).join(" · ")}</p>}
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

function LeadDetail({ selected, detail, onClose, onPatch, onAct, onToggleTask }: any) {
  const [tab, setTab] = useState("conversacion");
  const [activateForm, setActivateForm] = useState({ name: "", email: "", password: "" });
  const [showActivate, setShowActivate] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    setTab("conversacion");
    setResult(null);
    setActivateForm({ name: detail?.name || "", email: detail?.email || "", password: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id]);

  if (!detail) return null;

  const sessions = detail.sessions || [];
  const followUps = detail.followUps || [];
  const tasks = detail.tasks || [];
  const isAdminLike = true;

  return (
    <Modal open={!!detail} onClose={onClose} title={`Lead: ${detail.name}`} wide>
      <div className="space-y-5">
        {/* Resumen */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <Avatar name={detail.name} size={44} />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-white">{detail.name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              {detail.email && <span>{detail.email}</span>}
              {detail.phone && <span>{detail.phone}</span>}
              <span>{srcLabel(detail.source)} · {timeAgo(detail.lastActivity)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={scoreChip(detail.score)}>score {detail.score}</Badge>
            <StatusPill status={detail.status} />
            {detail.outcome && <Badge className="border-white/10 bg-white/5 text-slate-300">{OUTCOME_LABEL[detail.outcome] || detail.outcome}</Badge>}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value="" className="w-48 text-xs" onChange={(e) => e.target.value && onPatch(e.target.value)}>
            <option value="">Cambiar estado…</option>
            {["IN_CONVERSATION", "NUTRITION", "HANDOFF", "ONBOARDING", "DISQUALIFIED"].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          {detail.status === "HANDOFF" && (
            <Button size="sm" onClick={() => onAct(`/api/leads/${detail.id}/accept-handoff`, {})}>
              <CheckCircle2 className="h-4 w-4" /> Aceptar handoff → Onboarding
            </Button>
          )}
          {(detail.status === "ONBOARDING" || detail.status === "HANDOFF") && (
            <Button size="sm" variant="outline" onClick={() => setShowActivate(true)}>
              <Rocket className="h-4 w-4" /> Activar como distribuidor
            </Button>
          )}
          {detail.distributor?.whatsapp && (
            <a href={detail.distributor.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300">
              <Phone className="h-3.5 w-3.5" /> WhatsApp del asesor
            </a>
          )}
          {detail.distributor?.calendarUrl && (
            <a href={detail.distributor.calendarUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/15 px-3 py-1.5 text-xs font-bold text-brand-300">
              <Calendar className="h-3.5 w-3.5" /> Calendario
            </a>
          )}
        </div>

        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "conversacion", label: "Conversación", count: sessions.length },
            { id: "seguimientos", label: "Seguimientos", count: followUps.length },
            { id: "onboarding", label: "Onboarding", count: tasks.length },
          ]}
        />

        {tab === "conversacion" && (
          <div className="space-y-3">
            {sessions.length === 0 && <EmptyState icon={<MessageSquare className="h-7 w-7" />} title="Sin conversaciones" />}
            {sessions.map((s: any) => (
              <div key={s.id} className="rounded-2xl border border-white/10 bg-ink-800/50 p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{dateTime(s.startedAt)} · {s.channel}</p>
                <div className="space-y-2">
                  {(s.messages || []).map((m: any) => (
                    <div key={m.id} className={cn("flex", m.role === "USER" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] whitespace-pre-line rounded-xl px-3 py-2 text-xs leading-relaxed", m.role === "USER" ? "bg-brand-600/80 text-white" : "bg-white/5 text-slate-300")}>
                        {m.content}
                        {m.score != null && m.role === "USER" && <span className="ml-2 text-[10px] text-white/60">+{m.score}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "seguimientos" && (
          <div className="space-y-2">
            {followUps.length === 0 && <EmptyState icon={<BellRing className="h-7 w-7" />} title="Sin follow-ups programados" />}
            {followUps.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{f.title}</p>
                  <p className="truncate text-xs text-slate-400">{f.content}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{f.channel} · vence {dateTime(f.dueAt)}</p>
                </div>
                <Badge className={f.status === "SENT" ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" : "border-amber-400/30 bg-amber-500/15 text-amber-300"}>
                  {f.status === "SENT" ? "Enviado" : "Pendiente"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {tab === "onboarding" && (
          <div className="space-y-2">
            {tasks.length === 0 && (
              <EmptyState icon={<Rocket className="h-7 w-7" />} title="Sin tareas de onboarding" text="Acepta el handoff para generar el checklist." />
            )}
            {tasks.map((t: any) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={() => onToggleTask(t.id)}
                  className="h-4 w-4 accent-brand-500"
                />
                <span className={cn("text-sm", t.completed ? "text-slate-500 line-through" : "text-slate-200")}>{t.title}</span>
              </label>
            ))}
            {tasks.length > 0 && tasks.every((t: any) => t.completed) && (
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
                ✓ Checklist completo — ya puedes activar a este lead como nuevo distribuidor.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal de activación */}
      <Modal open={showActivate} onClose={() => setShowActivate(false)} title="Activar → Nuevo distribuidor (duplicación)">
        {result ? (
          <div className="space-y-3">
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">
              🎉 ¡Activación completa! {result.newDistributor?.name} ya tiene su propio AI Twin.
            </p>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <p className="text-slate-400">Funnel del nuevo distribuidor:</p>
              <a href={`/f/${result.newDistributor?.slug}`} target="_blank" rel="noreferrer" className="font-bold text-brand-300 hover:underline cursor-pointer">/f/{result.newDistributor?.slug}</a>
              <p className="mt-1 text-xs text-slate-500">Email: {result.newDistributor?.email}</p>
            </div>
            <Button className="w-full" onClick={() => { setShowActivate(false); onClose(); }}>Entendido</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              El lead se convierte en un distribuidor con acceso a la plataforma y recibe su propio AI Twin que hereda el cerebro de la organización.
            </p>
            {["name", "email", "password"].map((k) => (
              <div key={k}>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k === "password" ? "Contraseña temporal" : k}</label>
                <Input
                  type={k === "password" ? "password" : "text"}
                  value={(activateForm as any)[k]}
                  placeholder={k === "password" ? "demo1234" : ""}
                  onChange={(e) => setActivateForm((f: any) => ({ ...f, [k]: e.target.value }))}
                />
              </div>
            ))}
            <Button
              className="w-full"
              onClick={async () => {
                const r = await onAct(`/api/leads/${detail.id}/activate`, activateForm);
                setResult(r || { newDistributor: { name: activateForm.name, slug: activateForm.name.toLowerCase().replace(/\s+/g, "-") } });
              }}
            >
              <Rocket className="h-4 w-4" /> Activar distribuidor
            </Button>
          </div>
        )}
      </Modal>
    </Modal>
  );
}