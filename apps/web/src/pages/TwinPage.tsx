import { useEffect, useState } from "react";
import { Sparkles, Save, Share2, Check } from "lucide-react";
import { api } from "../lib/api";
import { Card, Field, Input, Textarea, Button, Spinner, Avatar } from "../components/ui";

const TONES = ["cercano y profesional", "enérgico y motivador", "formal y serio", "amigable y casual", "experto y técnico"];

export default function TwinPage() {
  const [twin, setTwin] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/api/distributors/twin")
      .then((d) => {
        setTwin(d.twin);
        setForm({
          name: d.twin.name,
          avatarUrl: d.twin.avatarUrl || "",
          tone: d.twin.tone,
          presentation: d.twin.presentation,
          language: d.twin.language,
          zone: d.twin.zone || "",
          whatsapp: d.twin.whatsapp || "",
          calendarUrl: d.twin.calendarUrl || "",
          instagram: d.twin.socialLinks?.instagram || "",
          facebook: d.twin.socialLinks?.facebook || "",
          tiktok: d.twin.socialLinks?.tiktok || "",
          hours: d.twin.availability?.hours || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f: any) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        avatarUrl: form.avatarUrl,
        tone: form.tone,
        presentation: form.presentation,
        language: form.language,
        zone: form.zone,
        whatsapp: form.whatsapp,
        calendarUrl: form.calendarUrl,
        socialLinks: { instagram: form.instagram, facebook: form.facebook, tiktok: form.tiktok },
        availability: { hours: form.hours },
      };
      const d = await api("/api/distributors/twin", { method: "PUT", body: JSON.stringify(body) });
      setTwin(d.twin);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-brand-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white">
            <Sparkles className="h-6 w-6 text-brand-400" /> Mi AI Twin
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Tu gemelo IA hereda el cerebro de {twin?.orgName || "la organización"} y lo personaliza con tu identidad y tu funnel.
          </p>
        </div>
        <a href={`/f/${twin?.slug}`} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-glow-400/40 hover:text-glow-400 cursor-pointer">
          <Share2 className="h-4 w-4" /> /f/{twin?.slug}
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vista previa */}
        <Card title="Vista previa del funnel" className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <Avatar name={form.name} url={form.avatarUrl || undefined} size={72} />
            <div>
              <p className="text-lg font-extrabold text-white">{form.name}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Asesora IA · {form.language || "es"}</p>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">{form.presentation}</p>
            <div className="flex gap-2">
              {form.whatsapp && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">WhatsApp</span>}
              {form.calendarUrl && <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[10px] font-bold text-brand-300">Calendario</span>}
              {form.zone && <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-[10px] font-bold text-slate-300">{form.zone}</span>}
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            💡 Cada distribuidor de la red puede tener su propio AI Twin y su propio funnel. El conocimiento, las políticas y el compliance se heredan automáticamente del Central Brain.
          </p>
        </Card>

        {/* Formulario */}
        <div className="space-y-6 lg:col-span-2">
          <Card title="Identidad">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del asesor(a)">
                <Input value={form.name} onChange={set("name")} />
              </Field>
              <Field label="URL de avatar (opcional)">
                <Input placeholder="https://…/foto.jpg" value={form.avatarUrl} onChange={set("avatarUrl")} />
              </Field>
              <Field label="Tono de conversación">
                <select className="w-full cursor-pointer rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/60" value={form.tone} onChange={set("tone")}>
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Idioma">
                <select className="w-full cursor-pointer rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/60" value={form.language} onChange={set("language")}>
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </Field>
              <Field label="Zona / región" className="sm:col-span-2">
                <Input placeholder="Ej. América Latina" value={form.zone} onChange={set("zone")} />
              </Field>
              <Field label="Presentación (lo que la IA dice de ti)" className="sm:col-span-2">
                <Textarea value={form.presentation} onChange={set("presentation")} />
              </Field>
            </div>
          </Card>

          <Card title="Contacto y conversión">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Link de WhatsApp">
                <Input placeholder="https://wa.me/521…" value={form.whatsapp} onChange={set("whatsapp")} />
              </Field>
              <Field label="Link de calendario">
                <Input placeholder="https://cal.com/…" value={form.calendarUrl} onChange={set("calendarUrl")} />
              </Field>
              <Field label="Horario de disponibilidad">
                <Input placeholder="Ej. 09:00-19:00" value={form.hours} onChange={set("hours")} />
              </Field>
              <Field label="Instagram">
                <Input placeholder="https://instagram.com/…" value={form.instagram} onChange={set("instagram")} />
              </Field>
              <Field label="Facebook">
                <Input placeholder="https://facebook.com/…" value={form.facebook} onChange={set("facebook")} />
              </Field>
              <Field label="TikTok">
                <Input placeholder="https://tiktok.com/@…" value={form.tiktok} onChange={set("tiktok")} />
              </Field>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <Button onClick={save} loading={saving} className="min-w-[180px]">
              {saved ? <><Check className="h-4 w-4" /> Guardado</> : <><Save className="h-4 w-4" /> Guardar cambios</>}
            </Button>
            {saved && <p className="text-xs font-semibold text-emerald-400">✓ Tu AI Twin está actualizado</p>}
          </div>
        </div>
      </div>
    </div>
  );
}