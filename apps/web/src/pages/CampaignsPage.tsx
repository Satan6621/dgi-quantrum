import { useState } from "react";
import { Megaphone, Plus, Eye, Copy, TrendingUp, Users, MousePointerClick, DollarSign, Calendar, Target, BarChart3, ChevronRight, Play, Pause, CheckCircle, Clock, Sparkles, Zap, Filter } from "lucide-react";
import { cn, Button } from "../components/ui";

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: "Facebook" | "Instagram" | "Google" | "TikTok" | "Email" | "WhatsApp";
  status: "active" | "paused" | "completed" | "draft";
  budget: string;
  spent: string;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  ctr: number;
  cpl: number;
  startDate: string;
  endDate: string;
  image?: string;
}

const campaignTemplates = [
  {
    id: "lead-gen",
    name: "Generación de Leads",
    description: "Captura leads qualificados con ofertas de valor",
    icon: Users,
    color: "from-brand-500 to-blue-600",
    platforms: ["Facebook", "Instagram", "Google"],
    metrics: { avgLeads: 150, avgCost: "$2.50", avgCtr: "3.2%" },
  },
  {
    id: "webinar",
    name: "Promoción de Webinar",
    description: "Atrae asistentes a tu webinar automatizado",
    icon: Play,
    color: "from-glow-500 to-amber-600",
    platforms: ["Facebook", "Instagram", "Email"],
    metrics: { avgLeads: 200, avgCost: "$1.80", avgCtr: "4.1%" },
  },
  {
    id: "retargeting",
    name: "Retargeting Inteligente",
    description: "Re-engaga visitantes que no convirtieron",
    icon: Target,
    color: "from-rose-500 to-pink-600",
    platforms: ["Facebook", "Google"],
    metrics: { avgLeads: 80, avgCost: "$1.20", avgCtr: "5.8%" },
  },
  {
    id: "contenido",
    name: "Distribución de Contenido",
    description: "Promociona tu blog, videos y recursos",
    icon: Sparkles,
    color: "from-emerald-500 to-teal-600",
    platforms: ["Facebook", "Instagram", "TikTok"],
    metrics: { avgLeads: 100, avgCost: "$0.80", avgCtr: "2.9%" },
  },
  {
    id: "oferta",
    name: "Oferta de Producto",
    description: "Promociona tu producto o servicio principal",
    icon: DollarSign,
    color: "from-violet-500 to-purple-600",
    platforms: ["Facebook", "Instagram", "Google", "TikTok"],
    metrics: { avgLeads: 120, avgCost: "$3.20", avgCtr: "2.5%" },
  },
  {
    id: "referidos",
    name: "Programa de Referidos",
    description: "Invita a otros a unirse a tu red",
    icon: Users,
    color: "from-cyan-500 to-blue-600",
    platforms: ["WhatsApp", "Email"],
    metrics: { avgLeads: 50, avgCost: "$0.50", avgCtr: "8.2%" },
  },
];

const sampleCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Campaña Verano 2024",
    description: "Promoción de productos de bienestar para el verano",
    type: "Facebook",
    status: "active",
    budget: "$500",
    spent: "$320",
    impressions: 45000,
    clicks: 2340,
    leads: 156,
    conversions: 23,
    ctr: 5.2,
    cpl: 2.05,
    startDate: "2024-01-15",
    endDate: "2024-03-31",
  },
  {
    id: "2",
    name: "Webinar Gratuito",
    description: "Inscripción al webinar de marketing digital",
    type: "Instagram",
    status: "active",
    budget: "$300",
    spent: "$180",
    impressions: 32000,
    clicks: 1890,
    leads: 234,
    conversions: 45,
    ctr: 5.9,
    cpl: 0.77,
    startDate: "2024-02-01",
    endDate: "2024-02-15",
  },
  {
    id: "3",
    name: "Retargeting Visitantes",
    description: "Re-engagement de visitantes del sitio web",
    type: "Google",
    status: "paused",
    budget: "$200",
    spent: "$95",
    impressions: 18000,
    clicks: 980,
    leads: 67,
    conversions: 12,
    ctr: 5.4,
    cpl: 1.42,
    startDate: "2024-01-20",
    endDate: "2024-02-20",
  },
  {
    id: "4",
    name: "Email Nurture",
    description: "Secuencia de nurturing para leads fríos",
    type: "Email",
    status: "completed",
    budget: "$50",
    spent: "$50",
    impressions: 5000,
    clicks: 890,
    leads: 0,
    conversions: 34,
    ctr: 17.8,
    cpl: 1.47,
    startDate: "2024-01-10",
    endDate: "2024-01-31",
  },
];

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "templates" | "create">("active");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-emerald-400 bg-emerald-400/10";
      case "paused": return "text-amber-400 bg-amber-400/10";
      case "completed": return "text-slate-400 bg-slate-400/10";
      case "draft": return "text-blue-400 bg-blue-400/10";
      default: return "text-slate-400 bg-slate-400/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <Play className="h-3 w-3" />;
      case "paused": return <Pause className="h-3 w-3" />;
      case "completed": return <CheckCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Facebook": return "📘";
      case "Instagram": return "📸";
      case "Google": return "🔍";
      case "TikTok": return "🎵";
      case "Email": return "📧";
      case "WhatsApp": return "💬";
      default: return "📢";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Campañas</h1>
          <p className="text-sm text-slate-400">Gestiona y crea campañas de marketing multicanal.</p>
        </div>
        <Button onClick={() => setActiveTab("create")}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Campaña
        </Button>
      </div>

      <div className="flex gap-2">
        {[
          { id: "active" as const, label: "Mis Campañas", count: sampleCampaigns.length },
          { id: "templates" as const, label: "Plantillas", count: campaignTemplates.length },
          { id: "create" as const, label: "Crear", count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer", activeTab === tab.id ? "bg-brand-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "active" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Campañas Activas", value: "2", icon: Play, color: "text-emerald-400" },
              { label: "Leads Totales", value: "457", icon: Users, color: "text-brand-400" },
              { label: "Gasto Total", value: "$645", icon: DollarSign, color: "text-amber-400" },
              { label: "CTR Promedio", value: "5.8%", icon: MousePointerClick, color: "text-glow-400" },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                  <span className="text-xs">{stat.label}</span>
                </div>
                <p className={cn("mt-1 text-2xl font-extrabold", stat.color)}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {sampleCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                onClick={() => setSelectedCampaign(campaign)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-brand-500/30 hover:bg-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{getTypeIcon(campaign.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{campaign.name}</h3>
                      <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", getStatusColor(campaign.status))}>
                        {getStatusIcon(campaign.status)} {campaign.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{campaign.description}</p>
                  </div>
                  <div className="hidden md:grid grid-cols-4 gap-8 text-center">
                    <div>
                      <p className="text-xs text-slate-500">Impresiones</p>
                      <p className="text-sm font-bold text-white">{campaign.impressions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Clicks</p>
                      <p className="text-sm font-bold text-white">{campaign.clicks.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Leads</p>
                      <p className="text-sm font-bold text-brand-400">{campaign.leads}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">CPL</p>
                      <p className="text-sm font-bold text-emerald-400">{campaign.cpl}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-gradient-to-r from-brand-600/20 to-glow-600/10 p-6">
            <h2 className="text-lg font-bold text-white">Plantillas de Campañas</h2>
            <p className="text-sm text-slate-300">Elige una plantilla predefinida y personalízala para tu negocio.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaignTemplates.map((template) => (
              <div key={template.id} className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 transition-all hover:border-brand-500/30 hover:bg-white/10">
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white", template.color)}>
                  <template.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">{template.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{template.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.platforms.map((p) => (
                    <span key={p} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">{p}</span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-[10px] text-slate-500">Leads/prom</p>
                    <p className="text-xs font-bold text-brand-400">{template.metrics.avgLeads}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-[10px] text-slate-500">Costo/lead</p>
                    <p className="text-xs font-bold text-emerald-400">{template.metrics.avgCost}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-[10px] text-slate-500">CTR</p>
                    <p className="text-xs font-bold text-glow-400">{template.metrics.avgCtr}</p>
                  </div>
                </div>
                <Button className="mt-4 w-full" variant="outline" size="sm">
                  <Copy className="h-3 w-3 mr-2" /> Usar Plantilla
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "create" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Crear Nueva Campaña</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Nombre de la Campaña</label>
                <input type="text" placeholder="Ej: Campaña Verano 2024" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Plataforma</label>
                <select className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none">
                  <option>Facebook</option>
                  <option>Instagram</option>
                  <option>Google</option>
                  <option>TikTok</option>
                  <option>Email</option>
                  <option>WhatsApp</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-2">Descripción</label>
                <textarea rows={3} placeholder="Describe el objetivo de tu campaña..." className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Presupuesto Diario</label>
                <input type="text" placeholder="$50" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Duración</label>
                <select className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none">
                  <option>7 días</option>
                  <option>14 días</option>
                  <option>30 días</option>
                  <option>Sin límite</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-2">Público Objetivo</label>
                <div className="flex flex-wrap gap-2">
                  {["25-34", "35-44", "45-54", "Emprendedores", "Marketing", "Ventas", "Salud", "Finanzas"].map((tag) => (
                    <button key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-500/30 hover:bg-white/10 cursor-pointer transition">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button>
                <Zap className="h-4 w-4 mr-2" /> Crear Campaña
              </Button>
              <Button variant="outline">Guardar Borrador</Button>
            </div>
          </div>
        </div>
      )}

      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCampaign(null)}>
          <div className="mx-4 w-full max-w-2xl rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold text-white">{selectedCampaign.name}</h2>
              <button onClick={() => setSelectedCampaign(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { label: "Impresiones", value: selectedCampaign.impressions.toLocaleString(), icon: Eye },
                { label: "Clicks", value: selectedCampaign.clicks.toLocaleString(), icon: MousePointerClick },
                { label: "Leads", value: selectedCampaign.leads.toString(), icon: Users },
                { label: "Conversiones", value: selectedCampaign.conversions.toString(), icon: TrendingUp },
                { label: "CTR", value: `${selectedCampaign.ctr}%`, icon: BarChart3 },
                { label: "Costo/Lead", value: `$${selectedCampaign.cpl}`, icon: DollarSign },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <stat.icon className="h-3 w-3" /> {stat.label}
                  </div>
                  <p className="text-lg font-bold text-white mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button className="flex-1">
                {selectedCampaign.status === "active" ? <><Pause className="h-4 w-4 mr-2" /> Pausar</> : <><Play className="h-4 w-4 mr-2" /> Activar</>}
              </Button>
              <Button variant="outline">
                <Copy className="h-4 w-4 mr-2" /> Duplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
