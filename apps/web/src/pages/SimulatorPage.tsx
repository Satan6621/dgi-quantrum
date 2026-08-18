import { useEffect, useState } from "react";
import { MessageCircle, CalendarClock, Send, Phone, FlaskConical } from "lucide-react";
import { api } from "../lib/api";
import { Card, Field, Input, Select, Textarea, Button, Badge, Spinner } from "../components/ui";

export default function SimulatorPage() {
  const [channel, setChannel] = useState("whatsapp");
  const [twinSlug, setTwinSlug] = useState("maria-gonzalez");
  const [from, setFrom] = useState("+5215512340001");
  const [text, setText] = useState("Hola, quiero saber cuánto cuesta el kit de inicio");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  useEffect(() => {
    api("/api/org")
      .then((o) => setOrgSlug(o.org?.slug || ""))
      .catch(() => {});
  }, []);

  async function send() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await api(`/api/webhooks/simulate/${orgSlug}/${channel}`, {
        method: "POST",
        body: JSON.stringify({ distributorSlug: twinSlug || null, from, text }),
      });
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white">Simulador de canales</h1>
        <p className="text-sm text-slate-400">Prueba los webhooks de WhatsApp y Cal.com sin enviar mensajes reales.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Enviar mensaje entrante" subtitle="Simula un prospecto escribiendo por un canal">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Canal">
                <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="whatsapp">WhatsApp (Twilio/Meta)</option>
                  <option value="generic">HTTP genérico</option>
                </Select>
              </Field>
              <Field label="AI Twin (funnel)">
                <Input value={twinSlug} onChange={(e) => setTwinSlug(e.target.value)} placeholder="slug-del-twin" />
              </Field>
            </div>
            <Field label="Número / remitente">
              <Input value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Mensaje">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
            <Button onClick={send} loading={busy}>
              <Send className="h-4 w-4" /> Enviar simulado
            </Button>
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </div>
        </Card>

        <div className="space-y-4">
          {result ? (
            <Card title="Respuesta del sistema" subtitle="El funnel procesó el mensaje como un webhook real">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={result.outcome === "HIGH" ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" : "bg-amber-500/15 text-amber-300 border-amber-400/30"}>
                    outcome: {result.outcome}
                  </Badge>
                  <Badge className="bg-white/5 text-slate-300 border-white/10">score {result.score}</Badge>
                  <Badge className="bg-white/5 text-slate-300 border-white/10">status: {result.status}</Badge>
                </div>
                <div className="rounded-xl border border-white/10 bg-ink-800 p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <MessageCircle className="h-3 w-3" /> Respuesta enviada ({result.sent?.provider})
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{result.reply}</p>
                </div>
                {result.handoff?.calendarUrl && (
                  <p className="flex items-center gap-1.5 text-xs text-slate-400"><CalendarClock className="h-3.5 w-3.5" /> CTA de agenda: {result.handoff.calendarUrl}</p>
                )}
                <p className="text-[11px] text-slate-500">Lead #{result.leadId?.slice(-6)} · {result.lead?.phone} · session {result.sessionId?.slice(-6)}</p>
              </div>
            </Card>
          ) : (
            <Card title="Cómo funciona" subtitle="Flujo de un mensaje entrante">
              <ol className="space-y-2.5 text-xs leading-relaxed text-slate-400">
                <li className="flex gap-2"><Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" /> El canal recibe el mensaje con el slug de la organización.</li>
                <li className="flex gap-2"><MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" /> Se busca o crea el lead por número de teléfono.</li>
                <li className="flex gap-2"><FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" /> La IA ejecuta el funnel (saludo, RAG, screening y scoring).</li>
                <li className="flex gap-2"><Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" /> La respuesta se envía por el canal (Twilio real o simulado).</li>
              </ol>
              <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-slate-500">
                En producción se apunta el webhook de Twilio/Meta a <code className="text-brand-300">POST /api/webhooks/&lt;slug-org&gt;/whatsapp</code>. El simulador usa la misma ruta autenticada.
              </p>
            </Card>
          )}
        </div>
      </div>

      {!result && busy && <div className="flex justify-center"><Spinner className="h-6 w-6 text-brand-400" /></div>}
    </div>
  );
}