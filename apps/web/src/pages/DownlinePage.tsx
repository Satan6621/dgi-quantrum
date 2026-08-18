import { useEffect, useState } from "react";
import { Users, Trophy, Coins, Zap, ChevronRight, Award, TrendingUp } from "lucide-react";
import { api } from "../lib/api";
import { Card, Stat, Badge, Spinner, EmptyState, Avatar, cn } from "../components/ui";
import { timeAgo } from "../lib/format";

const LEVEL_META: Record<string, { label: string; chip: string }> = {
  BRONZE: { label: "Bronce", chip: "bg-amber-600/20 text-amber-300 border-amber-500/30" },
  SILVER: { label: "Plata", chip: "bg-slate-300/15 text-slate-200 border-slate-400/30" },
  GOLD: { label: "Oro", chip: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  PLATINUM: { label: "Platino", chip: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30" },
};

interface TreeNode {
  id: string;
  name: string;
  slug: string;
  level: string;
  points: number;
  depth: number;
  children: TreeNode[];
}

export default function DownlinePage() {
  const [overview, setOverview] = useState<any>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api("/api/downline/overview"), api("/api/downline/tree")])
      .then(([o, t]) => {
        setOverview(o);
        setTree(t.tree || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-brand-400" /></div>;

  const isAdmin = overview?.role === "ADMIN";

  function renderNode(n: TreeNode) {
    const lvl = LEVEL_META[n.level] ?? LEVEL_META.BRONZE;
    return (
      <div key={n.id} className="ml-4 border-l border-white/10 pl-4 pt-2">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <Avatar name={n.name} size={26} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{n.name}</p>
            <p className="text-[10px] text-slate-500">/f/{n.slug} · {n.points} pts</p>
          </div>
          <Badge className={lvl.chip}>{lvl.label}</Badge>
        </div>
        {n.children.map(renderNode)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white">Red y compensación</h1>
        <p className="text-sm text-slate-400">Tu equipo, tus puntos y tus comisiones.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <Stat icon={<Users className="h-4 w-4" />} label="Distribuidores" value={overview.distributors?.length ?? 0} />
            <Stat icon={<Zap className="h-4 w-4" />} label="Activaciones" value={overview.activations ?? 0} />
            <Stat icon={<Coins className="h-4 w-4" />} label="Comisiones pagadas" value={`$${(overview.commissionsTotal ?? 0).toFixed(2)}`} accent="text-emerald-300" />
            <Stat icon={<Trophy className="h-4 w-4" />} label="Líder en puntos" value={overview.leaderboard?.[0]?.name ?? "—"} sub={overview.leaderboard?.[0] ? `${overview.leaderboard[0].points} pts` : undefined} />
          </>
        ) : (
          <>
            <Stat icon={<Users className="h-4 w-4" />} label="Equipo directo" value={overview.stats?.direct ?? 0} />
            <Stat icon={<Users className="h-4 w-4" />} label="Red total" value={overview.stats?.teamSize ?? 0} />
            <Stat icon={<Coins className="h-4 w-4" />} label="Saldo comisiones" value={`$${(overview.stats?.me?.commissionBalance ?? 0).toFixed(2)}`} accent="text-emerald-300" />
            <Stat icon={<Award className="h-4 w-4" />} label="Nivel" value={overview.stats?.me?.level ?? "BRONZE"} sub={`${overview.stats?.me?.points ?? 0} puntos`} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Árbol de red" subtitle="Patrocinadores y patrocinados">
          {tree.length === 0 ? (
            <EmptyState icon={<Users className="h-8 w-8" />} title="Aún no hay red" text="Al activar leads con tu patrocinio, aparecerán aquí." />
          ) : (
            <div className="space-y-1">{tree.map(renderNode)}</div>
          )}
        </Card>

        <Card title={isAdmin ? "Leaderboard de puntos" : "Comisiones recientes"} subtitle={isAdmin ? "Gamificación por actividad" : "Historial de tus comisiones"}>
          {isAdmin ? (
            overview.leaderboard?.length ? (
              <div className="space-y-2">
                {overview.leaderboard.map((l: any, i: number) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold", i === 0 ? "bg-yellow-500/20 text-yellow-300" : i === 1 ? "bg-slate-300/15 text-slate-200" : i === 2 ? "bg-amber-600/20 text-amber-300" : "bg-white/5 text-slate-400")}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white">{l.name}</p>
                      <Badge className={(LEVEL_META[l.level] ?? LEVEL_META.BRONZE).chip}>{l.level}</Badge>
                    </div>
                    <span className="text-sm font-extrabold text-white">{l.points} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Trophy className="h-8 w-8" />} title="Sin datos" />
            )
          ) : overview.commissions?.length ? (
            <div className="space-y-2">
              {overview.commissions.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">{c.description}</p>
                    <p className="text-[10px] text-slate-500">{timeAgo(c.createdAt)} · {c.type}</p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold text-emerald-300">+${c.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Coins className="h-8 w-8" />} title="Sin comisiones aún" />
          )}
        </Card>
      </div>

      <Card title="Cómo ganar puntos y comisiones" subtitle="Compensación del plan actual">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: <TrendingUp className="h-4 w-4" />, title: "+10 pts por lead", text: "Cada conversación nueva en tu funnel suma puntos." },
            { icon: <Zap className="h-4 w-4" />, title: "+25 pts por alta intención", text: "Prospectos que completan el funnel con intención alta." },
            { icon: <Coins className="h-4 w-4" />, title: "Comisión por activación", text: "Directa + niveles 1 y 2 según la configuración de la organización." },
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600/30 text-brand-300">{t.icon}</div>
              <div>
                <p className="text-xs font-bold text-white">{t.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {!isAdmin && (
        <p className="flex items-center gap-1 text-[11px] text-slate-600"><ChevronRight className="h-3 w-3" /> Los subniveles se otorgan automáticamente cuando un lead que patrocinas se activa.</p>
      )}
    </div>
  );
}