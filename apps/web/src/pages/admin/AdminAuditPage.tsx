import { useEffect, useState } from "react";
import { ScrollText, RefreshCw } from "lucide-react";
import { api, q } from "../../lib/api";
import { Card, Select, EmptyState, Spinner, Badge, Pager } from "../../components/ui";
import { timeAgo } from "../../lib/format";

const ACTION_LABEL: Record<string, string> = {
  "auth.login": "Inicio de sesión",
  "auth.login_failed": "Login fallido",
  "auth.refresh": "Renovación de sesión",
  "auth.logout": "Cierre de sesión",
  "org.signup": "Alta de organización",
  "org.settings_update": "Cambio de configuración",
  "team.invite": "Invitación de miembro",
  "team.update": "Actualización de miembro",
  "team.delete": "Eliminación de miembro",
  "billing.plan_change": "Cambio de plan",
  "keys.create": "Clave API creada",
  "keys.delete": "Clave API eliminada",
  "leads.import": "Importación de leads",
  "lead.activate": "Activación de distribuidor",
  "export.run": "Exportación de datos",
  "webhook.test": "Prueba de webhook",
};

export default function AdminAuditPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await api("/api/audit" + q({ page, pageSize: 25, action }));
      setItems(d.items || []);
      setTotal(d.total || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, action]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><ScrollText className="h-6 w-6 text-brand-400" /> Auditoría</h1>
          <p className="text-sm text-slate-400">Registro de acciones sensibles de tu organización.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="w-64">
            <option value="">Todas las acciones</option>
            {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <button onClick={() => load()} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 cursor-pointer" title="Recargar">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card className="p-0">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<ScrollText className="h-8 w-8" />} title="Sin eventos" text="Las acciones sensibles se registrarán aquí." />
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{ACTION_LABEL[l.action] || l.action}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {l.actor || "—"} · {l.entity || ""}{l.entityId ? ` #${String(l.entityId).slice(0, 8)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {l.meta && Object.keys(l.meta).length > 0 && (
                    <code className="hidden max-w-64 truncate rounded-lg bg-white/5 px-2 py-1 text-[10px] text-slate-400 sm:block">
                      {JSON.stringify(l.meta)}
                    </code>
                  )}
                  <Badge className="border-white/10 bg-white/5 text-slate-400">{timeAgo(l.createdAt)}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pager page={page} totalPages={Math.max(1, Math.ceil(total / 25))} total={total} onPage={setPage} />
      </Card>
    </div>
  );
}
