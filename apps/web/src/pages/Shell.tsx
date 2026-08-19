import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BrainCircuit, LayoutDashboard, MessageSquare, Users, BellRing, Rocket, BarChart3, Settings2, Database, ListOrdered, Network, LogOut, Menu, X, Sparkles, Share2, GitFork, FlaskConical, CreditCard, KeyRound, Download, Bell, CheckCheck, Webhook, UserCog, ScrollText, BookOpen, Megaphone, Send } from "lucide-react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuth, isAdminRole } from "../lib/useAuth";
import { Avatar, cn, Button } from "../components/ui";
import { api } from "../lib/api";
import { timeAgo } from "../lib/format";

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const d = await api("/api/notifications?pageSize=200");
      setItems(d.items || []);
      setUnread(d.unread || 0);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAll() {
    await api("/api/notifications/read-all", { method: "POST" });
    setUnread(0);
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/5 cursor-pointer"
        title="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 animate-pop overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-xs font-bold text-white">Notificaciones</p>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-[10px] font-semibold text-brand-300 hover:text-brand-200 cursor-pointer">
                <CheckCheck className="h-3 w-3" /> Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">Sin notificaciones</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) api(`/api/notifications/${n.id}/read`, { method: "POST" }).then(() => setUnread((u) => Math.max(0, u - 1)));
                    if (n.link) {
                      setOpen(false);
                      window.location.hash = n.link;
                    }
                  }}
                  className={cn("block w-full border-b border-white/5 px-4 py-2.5 text-left transition hover:bg-white/5", !n.read && "bg-brand-600/10")}
                >
                  <p className="text-xs font-bold text-white">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{n.body}</p>
                  <p className="mt-1 text-[9px] text-slate-600">{timeAgo(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Shell() {
  const { user, org, logout, refresh } = useAuth();
  const [mobile, setMobile] = useState(false);
  const admin = isAdminRole(user?.role);

  const mainNav = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/leads", label: "Leads", icon: Users },
    { to: "/app/conversations", label: "Conversaciones", icon: MessageSquare },
    { to: "/app/followups", label: "Follow-ups", icon: BellRing },
    { to: "/app/onboarding", label: "Onboarding", icon: Rocket },
    { to: "/app/campaigns", label: "Campañas", icon: Megaphone },
    { to: "/app/courses", label: "Cursos", icon: BookOpen },
    { to: "/app/analytics", label: "Analítica", icon: BarChart3 },
    { to: "/app/downline", label: "Red", icon: GitFork },
    { to: "/app/simulator", label: "Simulador", icon: FlaskConical },
    { to: "/app/twin", label: "Mi AI Twin", icon: Sparkles },
  ];

  const adminNav = admin
    ? [
        { to: "/app/admin", label: "Organización", icon: Settings2, end: true },
        { to: "/app/admin/brain", label: "Central AI Brain", icon: Database },
        { to: "/app/admin/sequences", label: "Secuencias", icon: ListOrdered },
        { to: "/app/admin/distributors", label: "Distribuidores", icon: Network },
        { to: "/app/admin/team", label: "Equipo", icon: UserCog },
        { to: "/app/admin/billing", label: "Plan y facturación", icon: CreditCard },
        { to: "/app/admin/keys", label: "API Keys", icon: KeyRound },
        { to: "/app/admin/webhooks", label: "Webhooks", icon: Webhook },
        { to: "/app/admin/audit", label: "Auditoría", icon: ScrollText },
        { to: "/app/admin/export", label: "Exportar datos", icon: Download },
      ]
    : [];

  const linkCls = (active: boolean) =>
    cn(
      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
      active
        ? "bg-gradient-to-r from-brand-600/25 to-brand-500/10 text-white glow-ring"
        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
    );

  const twinUrl = user?.distributorSlug ? `/f/${user.distributorSlug}` : null;

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-2 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-glow-500 shadow-lg shadow-brand-600/30">
          <BrainCircuit className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-extrabold tracking-tight text-white">DGI Quantrum</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">{org?.name || "Plataforma"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {mainNav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => linkCls(isActive)} onClick={() => setMobile(false)}>
            <n.icon className="h-4 w-4 shrink-0" />
            {n.label}
          </NavLink>
        ))}
        {adminNav.length > 0 && (
          <>
            <p className="mt-5 px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">Administración</p>
            {adminNav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => linkCls(isActive)} onClick={() => setMobile(false)}>
                <n.icon className="h-4 w-4 shrink-0" />
                {n.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="space-y-2 border-t border-white/5 p-3">
        {twinUrl && (
          <a
            href={twinUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-glow-400/40 hover:text-glow-400"
          >
            <Share2 className="h-3.5 w-3.5" /> Ver mi funnel público
          </a>
        )}
        <a
          href="https://telegram.org/dl"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs font-semibold text-sky-400 transition hover:border-sky-400/40 hover:bg-sky-500/10"
        >
          <Send className="h-3.5 w-3.5" /> Descargar Telegram
        </a>
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5">
          <Avatar name={user?.name} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{user?.name}</p>
            <p className="truncate text-[10px] uppercase tracking-wide text-slate-500">{user?.role}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950">
      <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-ink-900/60 lg:block">{navContent}</aside>

      {mobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobile(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-white/10 bg-ink-900">
            <button onClick={() => setMobile(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/5 bg-ink-900/40 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobile(true)} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/5 lg:hidden cursor-pointer">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-bold text-white">{org?.name || "Cargando…"}</p>
              <p className="text-[11px] text-slate-500">Infraestructura de crecimiento · {user?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => refresh()}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
            >
              Sincronizar
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-grid p-4 lg:p-6">
          <div className="mx-auto max-w-6xl animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}