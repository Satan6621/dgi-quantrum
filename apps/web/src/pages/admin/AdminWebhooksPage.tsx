import { useEffect, useState } from "react";
import { Webhook, Plus, Pencil, Trash2, Zap, Eye, ChevronDown, RefreshCw, MessageCircle, Calendar } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Input, Button, Badge, EmptyState, Spinner, Modal, Field, cn } from "../../components/ui";
import { timeAgo } from "../../lib/format";

interface Hook {
  id: string;
  label: string;
  url: string;
  secret?: string;
  events: string[];
  enabled: boolean;
}

interface WsCfg {
  provider: string;
  distributorSlug: string;
  webhookSecret: string;
  metaVerifyToken: string;
  metaToken: string;
  metaPhoneNumberId: string;
}

interface CalCfg {
  apiKey: string;
  distributorSlug: string;
  webhookSecret: string;
}

const EVENT_LABEL: Record<string, string> = {
  "lead.created": "Lead creado",
  "lead.handoff": "Alta intención",
  "lead.onboarding": "Onboarding",
  "distributor.activated": "Distribuidor activado",
  "commission.paid": "Comisión pagada",
};

export default function AdminWebhooksPage() {
  const [webhooks, setWebhooks] = useState<Hook[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Hook | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Hook>({ id: "", label: "", url: "", secret: "", events: [], enabled: true });
  const [logs, setLogs] = useState<any[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, any>>({});
  const [ws, setWs] = useState<WsCfg>({ provider: "simulate", distributorSlug: "", webhookSecret: "", metaVerifyToken: "", metaToken: "", metaPhoneNumberId: "" });
  const [orgSettings, setOrgSettings] = useState<any>({});
  const [savingWs, setSavingWs] = useState(false);
  const [wsSaved, setWsSaved] = useState(false);
  const [cal, setCal] = useState<CalCfg>({ apiKey: "", distributorSlug: "", webhookSecret: "" });
  const [savingCal, setSavingCal] = useState(false);
  const [calSaved, setCalSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await api("/api/org/outgoing-webhooks");
      setWebhooks(d.webhooks || []);
      setEvents(d.events || []);
      const l = await api("/api/org/webhook-logs?pageSize=15");
      setLogs(l.items || []);
      const o = await api("/api/org");
      setOrgSettings(o.org.settings || {});
      const ch = o.org.settings?.channels?.whatsapp || {};
      setWs({ provider: ch.provider || "simulate", distributorSlug: ch.distributorSlug || "", webhookSecret: ch.webhookSecret || "", metaVerifyToken: ch.metaVerifyToken || "", metaToken: ch.metaToken || "", metaPhoneNumberId: ch.metaPhoneNumberId || "" });
      const cc = o.org.settings?.channels?.calcom || {};
      setCal({ apiKey: cc.apiKey || "", distributorSlug: cc.distributorSlug || "", webhookSecret: cc.webhookSecret || "" });
    } finally {
      setLoading(false);
    }
  }

  async function saveWs() {
    setSavingWs(true);
    setWsSaved(false);
    try {
      const next = { ...orgSettings, channels: { ...(orgSettings.channels || {}), whatsapp: { ...ws } } };
      await api("/api/org", { method: "PUT", body: JSON.stringify({ settings: next }) });
      setOrgSettings(next);
      setWsSaved(true);
    } finally {
      setSavingWs(false);
    }
  }

  async function saveCal() {
    setSavingCal(true);
    setCalSaved(false);
    try {
      const next = { ...orgSettings, channels: { ...(orgSettings.channels || {}), calcom: { ...cal } } };
      await api("/api/org", { method: "PUT", body: JSON.stringify({ settings: next }) });
      setOrgSettings(next);
      setCalSaved(true);
    } finally {
      setSavingCal(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setIsNew(true);
    setEditing({ id: "", label: "", url: "", secret: "", events: ["lead.created"], enabled: true });
    setForm({ id: "", label: "", url: "", secret: "", events: ["lead.created"], enabled: true });
  }

  function openEdit(h: Hook) {
    setIsNew(false);
    setEditing(h);
    setForm({ ...h });
  }

  function toggleEvent(ev: string) {
    setForm((f) => ({ ...f, events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev] }));
  }

  async function save() {
    const list = editing && !isNew ? webhooks.map((w) => (w.id === form.id ? form : w)) : [...webhooks, { ...form, id: form.id || `wh-${Date.now()}` }];
    await api("/api/org/outgoing-webhooks", { method: "PUT", body: JSON.stringify({ webhooks: list }) });
    setEditing(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este webhook?")) return;
    const list = webhooks.filter((w) => w.id !== id);
    await api("/api/org/outgoing-webhooks", { method: "PUT", body: JSON.stringify({ webhooks: list }) });
    await load();
  }

  async function test(id: string) {
    setTesting(id);
    setTestResult({});
    try {
      const r = await api("/api/org/outgoing-webhooks/test", { method: "POST", body: JSON.stringify({ id }) });
      setTestResult((cur) => ({ ...cur, [id]: r }));
    } catch (e: any) {
      setTestResult((cur) => ({ ...cur, [id]: { ok: false, error: e.message } }));
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Webhook className="h-6 w-6 text-brand-400" /> Webhooks de salida</h1>
          <p className="text-sm text-slate-400">Recibe eventos de tu red en tu propio sistema. Cada envío se firma con HMAC-SHA256.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Nuevo webhook</Button>
      </div>

      <Card title="Canal de entrada · WhatsApp" subtitle="El endpoint recibe mensajes reales y la IA responde por el mismo canal.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-slate-400">
            <MessageCircle className="h-4 w-4 text-brand-300" />
            <span>Webhook: <code className="text-slate-200">POST {`/api/webhooks/{orgSlug}/whatsapp`}</code></span>
            {ws.provider === "meta" && <span>· verificación GET (hub.challenge)</span>}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Proveedor">
              <select className="w-full cursor-pointer rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/60" value={ws.provider} onChange={(e) => setWs((w) => ({ ...w, provider: e.target.value }))}>
                <option value="simulate">Simulado (demo)</option>
                <option value="twilio">Twilio · WhatsApp Business</option>
                <option value="meta">Meta · WhatsApp Cloud API</option>
              </select>
            </Field>
            <Field label="Funnel destino (distribuidor)">
              <Input value={ws.distributorSlug} onChange={(e) => setWs((w) => ({ ...w, distributorSlug: e.target.value }))} placeholder="maria-gonzalez" />
            </Field>
            <Field label="Webhook secret / App secret (Meta)" hint="Twilio: cabecera X-Webhook-Secret. Meta: app secret para verificar X-Hub-Signature-256.">
              <Input value={ws.webhookSecret} onChange={(e) => setWs((w) => ({ ...w, webhookSecret: e.target.value }))} placeholder="dejar vacío para permitir sin firma (no recomendado)" />
            </Field>
            {ws.provider === "meta" && (
              <>
                <Field label="Verify token (Meta)">
                  <Input value={ws.metaVerifyToken} onChange={(e) => setWs((w) => ({ ...w, metaVerifyToken: e.target.value }))} placeholder="token de verificación del webhook" />
                </Field>
                <Field label="Token de acceso (Meta)">
                  <Input value={ws.metaToken} onChange={(e) => setWs((w) => ({ ...w, metaToken: e.target.value }))} placeholder="EAAG…" />
                </Field>
                <Field label="Phone Number ID (Meta)">
                  <Input value={ws.metaPhoneNumberId} onChange={(e) => setWs((w) => ({ ...w, metaPhoneNumberId: e.target.value }))} placeholder="1234567890" />
                </Field>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveWs} loading={savingWs}>Guardar canal</Button>
            {wsSaved && <span className="text-xs text-emerald-300">✓ Canal guardado</span>}
          </div>
        </div>
      </Card>

      <Card title="Canal de entrada · Cal.com" subtitle="Una cita agendada empuja el lead a ONBOARDING automáticamente.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-slate-400">
            <Calendar className="h-4 w-4 text-brand-300" />
            <span>Webhook: <code className="text-slate-200">POST {`/api/webhooks/{orgSlug}/calcom`}</code> (evento BOOKING_CREATED)</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Funnel destino (distribuidor)">
              <Input value={cal.distributorSlug} onChange={(e) => setCal((c) => ({ ...c, distributorSlug: e.target.value }))} placeholder="maria-gonzalez" />
            </Field>
            <Field label="Webhook secret" hint="Firma X-Cal-Signature-256. Vacío = se acepta sin firma (no recomendado).">
              <Input value={cal.webhookSecret} onChange={(e) => setCal((c) => ({ ...c, webhookSecret: e.target.value }))} placeholder="secret del webhook de Cal.com" />
            </Field>
            <Field label="API key (reservado)" hint="Para crear citas desde la plataforma en el futuro.">
              <Input value={cal.apiKey} onChange={(e) => setCal((c) => ({ ...c, apiKey: e.target.value }))} placeholder="cal_…" />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveCal} loading={savingCal}>Guardar canal</Button>
            {calSaved && <span className="text-xs text-emerald-300">✓ Canal guardado</span>}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Webhooks de salida</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-400" /></div>
      ) : webhooks.length === 0 ? (
        <Card>
          <EmptyState icon={<Webhook className="h-8 w-8" />} title="Sin webhooks configurados" text="Crea un endpoint para recibir eventos de leads, activaciones y comisiones en tu CRM u otros sistemas." />
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((h) => (
            <Card key={h.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-white">{h.label}</p>
                    <Badge className={h.enabled ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5 text-slate-400"}>
                      {h.enabled ? "Activo" : "Pausado"}
                    </Badge>
                    {h.secret && <Badge className="border-brand-400/30 bg-brand-500/15 text-brand-300">HMAC</Badge>}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{h.url}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {h.events.map((e) => (
                      <Badge key={e} className="border-white/10 bg-white/5 text-slate-300">{EVENT_LABEL[e] || e}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="subtle" onClick={() => test(h.id)} loading={testing === h.id}>
                    <Zap className="h-3.5 w-3.5" /> Probar
                  </Button>
                  <button onClick={() => openEdit(h)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(h.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-rose-400 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {testResult[h.id] && (
                <div className={cn("mt-3 rounded-xl border p-3 text-xs", testResult[h.id].ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-rose-400/30 bg-rose-500/10 text-rose-300")}>
                  {testResult[h.id].ok ? "✓ Entregado correctamente" : `✗ ${testResult[h.id].error || "Falló la entrega"}`}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="p-0">
        <button onClick={() => setLogsOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 cursor-pointer">
          <span className="flex items-center gap-2 text-sm font-bold text-white"><Eye className="h-4 w-4 text-brand-400" /> Log de entregas</span>
          <ChevronDown className={cn("h-4 w-4 text-slate-500 transition", logsOpen && "rotate-180")} />
        </button>
        {logsOpen && (
          <div className="border-t border-white/10">
            {logs.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-slate-500">Sin entregas registradas todavía.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {logs.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{l.provider}</p>
                      <p className="truncate text-[11px] text-slate-500">{JSON.stringify(l.payload).slice(0, 140)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge className={l.status === "delivered" || l.status === "processed" ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" : "border-rose-400/30 bg-rose-500/15 text-rose-300"}>{l.status}</Badge>
                      <span className="text-[10px] text-slate-600">{timeAgo(l.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? "Nuevo webhook" : "Editar webhook"} wide>
        <div className="space-y-4">
          <Field label="Nombre">
            <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ej.: Sincronizar con mi CRM" />
          </Field>
          <Field label="URL del endpoint" hint="Recibirá un POST con JSON y las cabeceras X-NAIO-Event / X-NAIO-Delivery / X-NAIO-Signature">
            <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://mi-sistema.com/hooks/naio" />
          </Field>
          <Field label="Secreto (opcional)" hint="Firma HMAC-SHA256 del body en X-NAIO-Signature. Verifícalo en tu endpoint.">
            <Input value={form.secret || ""} onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))} placeholder="dejar vacío para no firmar" />
          </Field>
          <Field label="Eventos">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {events.map((ev) => (
                <label key={ev} className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2">
                  <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} className="h-3.5 w-3.5 accent-brand-500" />
                  <span className="text-xs font-medium text-slate-200">{EVENT_LABEL[ev] || ev}</span>
                </label>
              ))}
            </div>
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-200">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="h-3.5 w-3.5 accent-brand-500" />
            Activo
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={!form.url || !form.label}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}