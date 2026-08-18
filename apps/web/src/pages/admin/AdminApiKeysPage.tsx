import { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, Copy, CheckCircle2, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Button, Field, Input, Select, Badge, Spinner, Modal, EmptyState, cn } from "../../components/ui";
import { timeAgo } from "../../lib/format";

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["leads:read", "analytics:read"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const SCOPE_OPTS = ["leads:read", "analytics:read", "brain:read", "*"];

  async function load() {
    setLoading(true);
    try {
      const d = await api("/api/keys");
      setKeys(d.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    setMsg("");
    try {
      const d = await api("/api/keys", { method: "POST", body: JSON.stringify({ name, scopes }) });
      setCreatedKey(d.rawKey);
      setShowCreate(false);
      setName("");
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function revoke(id: string) {
    await api(`/api/keys/${id}/revoke`, { method: "PATCH" });
    load();
  }

  async function remove(id: string) {
    await api(`/api/keys/${id}`, { method: "DELETE" });
    load();
  }

  function toggleScope(s: string) {
    setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">API Keys</h1>
          <p className="text-sm text-slate-400">Claves para integrar tu organización con sistemas externos (REST v1).</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nueva clave
        </Button>
      </div>

      {msg && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">{msg}</p>}

      {createdKey && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> ¡Clave creada! Cópiala ahora: no volverá a mostrarse.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded-xl border border-white/10 bg-ink-950 px-3 py-2 font-mono text-xs text-emerald-200">{createdKey}</code>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(createdKey); setMsg(""); }}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-brand-400" /></div>
      ) : keys.length === 0 ? (
        <Card>
          <EmptyState icon={<KeyRound className="h-8 w-8" />} title="Sin claves API" text="Crea una clave para usar los endpoints /api/v1 con tu organización." />
        </Card>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-bold text-white">{k.name}</p>
                  {k.revoked && <Badge className="bg-rose-500/15 text-rose-300 border-rose-400/30">revocada</Badge>}
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">{k.keyPrefix}••••••••</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {JSON.parse(k.scopes || "[]").map((s: string) => (
                    <span key={s} className="rounded-md bg-brand-600/20 px-1.5 py-0.5 font-mono text-[10px] text-brand-200">{s}</span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[10px] text-slate-500">{k.lastUsedAt ? `usada ${timeAgo(k.lastUsedAt)}` : "sin uso"}</span>
                <div className="flex gap-1.5">
                  {!k.revoked && (
                    <Button variant="outline" size="sm" onClick={() => revoke(k.id)}>Revocar</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => remove(k.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
        <ShieldCheck className="h-3.5 w-3.5" /> Se guarda el hash SHA-256, nunca la clave en claro. Las claves se usan con el header <code className="text-brand-300">X-API-Key</code> contra <code className="text-brand-300">/api/v1</code>, con rate-limit de 60 req/min.
      </p>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva API Key">
        <div className="space-y-4">
          <Field label="Nombre de la clave">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="p.ej. Integración CRM" />
          </Field>
          <Field label="Scopes">
            <div className="flex flex-wrap gap-2">
              {SCOPE_OPTS.map((s) => (
                <button key={s} onClick={() => toggleScope(s)} className={cn("rounded-full border px-3 py-1.5 font-mono text-[11px] transition cursor-pointer", scopes.includes(s) ? "border-brand-500/50 bg-brand-600/30 text-brand-100" : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200")}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={create} disabled={!name.trim() || scopes.length === 0}>Crear clave</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}