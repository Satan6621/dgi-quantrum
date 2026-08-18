import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Card, Button, Badge } from "../../components/ui";
import { getToken } from "../../lib/api";

const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

export default function ExportPage() {
  async function download(type: string, format: string) {
    const token = getToken();
    const res = await fetch(`${API}/api/export/${type}?format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert((data as any).error || `Error ${res.status}`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match ? match[1] : `export-${type}.${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rows = [
    { type: "leads", label: "Leads", desc: "Prospectos con scoring, etapa e intención" },
    { type: "brain", label: "Central AI Brain", desc: "Base de conocimiento de la organización" },
    { type: "distributors", label: "Distribuidores", desc: "Red, puntos, nivel y comisiones" },
    { type: "sessions", label: "Conversaciones", desc: "Sesiones por canal y variante" },
    { type: "commissions", label: "Comisiones", desc: "Historial de compensación" },
    { type: "followups", label: "Follow-ups", desc: "Secuencias y estado de envío" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">Exportar datos</h1>
          <p className="text-sm text-slate-400">Descarga la información de tu organización en CSV o JSON.</p>
        </div>
        <Badge className="bg-white/5 text-slate-300 border-white/10">Administración</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.type} className="flex flex-col">
            <p className="text-sm font-bold text-white">{r.label}</p>
            <p className="mt-0.5 flex-1 text-xs text-slate-400">{r.desc}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => download(r.type, "csv")}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => download(r.type, "json")}>
                <FileJson className="h-3.5 w-3.5" /> JSON
              </Button>
              <Button size="sm" variant="ghost" onClick={() => download(r.type, "csv")}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-[11px] text-slate-600">
        Endpoints: <code className="text-brand-300">GET /api/export/&lt;tipo&gt;?format=csv|json</code>. Los CSV incluyen BOM para abrirse correctamente en Excel.
      </p>
    </div>
  );
}