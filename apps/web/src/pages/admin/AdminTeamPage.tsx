import { useEffect, useState } from "react";
import { Users, UserPlus, Power, Pencil, Trash2, Copy, Check } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Input, Button, Select, Badge, EmptyState, Spinner, Modal, Field, Avatar, cn } from "../../components/ui";
import { timeAgo } from "../../lib/format";
import { useAuth } from "../../lib/useAuth";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  DISTRIBUTOR: "Distribuidor",
  PLATFORM: "Plataforma",
};

export default function AdminTeamPage() {
  const { user: me } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "DISTRIBUTOR", password: "" });
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await api("/api/team");
      setMembers(d.members || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function invite() {
    setBusy(true);
    setError("");
    setInviteResult(null);
    try {
      const r = await api("/api/team/invite", { method: "POST", body: JSON.stringify(form) });
      setInviteResult(r);
      setForm({ email: "", name: "", role: "DISTRIBUTOR", password: "" });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, data: any) {
    await api(`/api/team/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar a este miembro? Se perderán su acceso y su distribuidor.")) return;
    await api(`/api/team/${id}`, { method: "DELETE" });
    await load();
  }

  function copyPassword(pw: string) {
    navigator.clipboard?.writeText(pw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Users className="h-6 w-6 text-brand-400" /> Equipo</h1>
          <p className="text-sm text-slate-400">Gestiona quién accede a tu organización y con qué rol.</p>
        </div>
        <Button onClick={() => { setInviteResult(null); setError(""); setShowInvite(true); }}>
          <UserPlus className="h-4 w-4" /> Invitar miembro
        </Button>
      </div>

      <Card className="p-0">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-400" /></div>
        ) : members.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />} title="Sin miembros" text="Invita a tu primer colaborador." />
        ) : (
          <div className="divide-y divide-white/5">
            {members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Avatar name={m.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold", m.active ? "text-white" : "text-slate-500 line-through")}>
                    {m.name} {m.id === me?.id && <span className="text-[10px] font-bold text-brand-300">(tú)</span>}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{m.email} · se unió {timeAgo(m.createdAt)}</p>
                  {m.distributorSlug && <p className="text-[10px] text-slate-600">funnel: /f/{m.distributorSlug}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className={m.active ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5 text-slate-500"}>
                    {m.active ? "Activo" : "Desactivado"}
                  </Badge>
                  <Select value={m.role} disabled={m.id === me?.id} onChange={(e) => patch(m.id, { role: e.target.value })} className="w-auto !py-1 text-xs">
                    {Object.keys(ROLE_LABEL).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </Select>
                  <button
                    onClick={() => patch(m.id, { active: !m.active })}
                    disabled={m.id === me?.id}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-emerald-400 disabled:opacity-30 cursor-pointer"
                    title={m.active ? "Desactivar" : "Activar"}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    disabled={m.id === me?.id}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title={inviteResult ? "Miembro invitado" : "Invitar miembro"} wide>
        {inviteResult ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm">
              <p className="font-semibold text-emerald-300">✓ {inviteResult.member.name} fue añadido como {ROLE_LABEL[inviteResult.member.role]}</p>
              <p className="mt-1 text-xs text-slate-400">Email: {inviteResult.member.email}</p>
              {inviteResult.tempPassword && (
                <div className="mt-3 rounded-xl border border-white/10 bg-ink-900 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contraseña temporal (cópiala, no se mostrará de nuevo)</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-white/5 px-3 py-2 font-mono text-sm text-brand-300">{inviteResult.tempPassword}</code>
                    <Button size="sm" variant="subtle" onClick={() => copyPassword(inviteResult.tempPassword)}>
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setInviteResult(null); setShowInvite(false); }}>Listo</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="compañero@empresa.com" />
            </Field>
            <Field label="Nombre">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre y apellido" />
            </Field>
            <Field label="Rol">
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="DISTRIBUTOR">Distribuidor</option>
                <option value="MANAGER">Manager</option>
              </Select>
            </Field>
            <Field label="Contraseña (opcional)" hint="Si la dejas vacía se generará una contraseña temporal aleatoria.">
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </Field>
            {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
              <Button loading={busy} onClick={invite} disabled={!form.email || !form.name}>
                <UserPlus className="h-4 w-4" /> Invitar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
