import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, Phone, MapPin, Clock, Instagram, Facebook, Music2, ChevronDown, ShieldCheck, Sparkles, Star, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import ChatWidget, { FunnelProfile } from "../components/ChatWidget";
import { cn } from "../components/ui";

interface CatalogItem {
  category: string;
  title: string;
  content: string;
}

export default function PublicFunnelPage() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<FunnelProfile | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [faqs, setFaqs] = useState<CatalogItem[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [variantId, setVariantId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`naio_variant_${slug}`);
    const qs = stored ? `?v=${stored}` : "";
    api(`/api/public/f/${slug}${qs}`)
      .then((d) => {
        setProfile(d);
        setCatalog(d.catalog || []);
        setFaqs(d.faqs || []);
        setSteps(d.funnelSteps || []);
        if (d.variant?.id) {
          localStorage.setItem(`naio_variant_${slug}`, d.variant.id);
          setVariantId(d.variant.id);
        } else if (Array.isArray(d.variants) && d.variants.length > 0 && !stored) {
          const list = d.variants as Array<{ id: string; weight?: number }>;
          const total = list.reduce((s, v) => s + (v.weight ?? 1), 0) || 1;
          let r = Math.random() * total;
          let pick = list[0].id;
          for (const v of list) {
            r -= v.weight ?? 1;
            if (r <= 0) {
              pick = v.id;
              break;
            }
          }
          localStorage.setItem(`naio_variant_${slug}`, pick);
          setVariantId(pick);
        }
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-950 text-center">
        <p className="text-2xl">🙈</p>
        <p className="font-bold text-white">Funnel no disponible</p>
        <p className="text-sm text-slate-400">{error}</p>
      </div>
    );
  }

  const twin = profile?.twin;
  const color = profile?.org.primaryColor || "#6d28d9";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-indigo-50/60 to-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-indigo-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: color }}>
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-extrabold tracking-tight">{profile?.org.name || "Cargando…"}</span>
          </div>
          <a href="#chat" className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg sm:flex" style={{ background: color }}>
            <MessageCircleIcon /> Comenzar ahora
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl" style={{ background: color }} />
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" /> Oportunidad verificada · sin cuotas ocultas
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              {twin?.name ? (
                <>
                  Hola, soy <span style={{ color }}>{twin.name}</span>.
                </>
              ) : (
                "Una oportunidad real, con acompañamiento real."
              )}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">{twin?.presentation || "Descubre cómo mejorar tu bienestar y construir ingresos complementarios."}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#chat" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-xl transition hover:brightness-110" style={{ background: color }}>
                Quiero saber más <ArrowRight className="h-4 w-4" />
              </a>
              {twin?.whatsapp && (
                <a href={twin.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100">
                  <Phone className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-4 text-xs text-slate-500">
              {twin?.calendarUrl && (
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Agenda 15 min</span>
              )}
              {twin?.zone && (
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {twin?.zone}</span>
              )}
              {(twin?.availability as any)?.hours && (
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Disponible {(twin?.availability as any).hours}</span>
              )}
            </div>
          </div>

          <div className="relative flex justify-center animate-fade-up">
            <div className="absolute inset-0 -z-10 flex items-center justify-center">
              <div className="h-72 w-72 rounded-full opacity-20 blur-2xl" style={{ background: color }} />
            </div>
            <div className="relative">
              {twin?.avatarUrl ? (
                <img src={twin.avatarUrl} alt={twin.name} className="h-64 w-64 rounded-3xl object-cover shadow-2xl ring-4 ring-white md:h-72 md:w-72" />
              ) : (
                <div className="flex h-64 w-64 flex-col items-center justify-center gap-3 rounded-3xl bg-white shadow-2xl ring-4 ring-white md:h-72 md:w-72">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full text-4xl font-extrabold text-white shadow-xl" style={{ background: color }}>
                    {(twin?.name || "AI").split(" ").slice(0, 2).map((w) => w[0]).join("")}
                  </div>
                  <p className="font-bold">{twin?.name || "Asesora IA"}</p>
                  <div className="flex gap-2">
                    {(twin?.socialLinks as any)?.instagram && <a href={(twin?.socialLinks as any).instagram} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><Instagram className="h-4 w-4" /></a>}
                    {(twin?.socialLinks as any)?.facebook && <a href={(twin?.socialLinks as any).facebook} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><Facebook className="h-4 w-4" /></a>}
                    {(twin?.socialLinks as any)?.tiktok && <a href={(twin?.socialLinks as any).tiktok} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><Music2 className="h-4 w-4" /></a>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo */}
      {catalog.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-12">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-indigo-500">Lo que ofrecemos</p>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight">Productos y valor reales</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((c, i) => (
              <div key={i} className="group rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: color }}>
                  <Star className="h-5 w-5" />
                </div>
                <h3 className="font-bold">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{c.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Proceso */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-indigo-500">Cómo funciona</p>
        <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight">De conocernos a activarte en 4 pasos</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={i} className="relative rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <span className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold text-white shadow" style={{ background: color }}>
                {i + 1}
              </span>
              <p className="mt-2 font-bold">{s}</p>
              <p className="mt-1 text-xs text-slate-500">
                {i === 0 ? "Atraemos visitantes a tu funnel personalizado." : i === 1 ? "La IA educa y responde con información verificada." : i === 2 ? "Autoevaluación, scoring y cualificación automática." : "Onboarding guiado hasta tu activación."}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-5 py-12">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-indigo-500">Preguntas frecuentes</p>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight">Dudas comunes</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold cursor-pointer">
                  {f.title}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", openFaq === i && "rotate-180")} />
                </button>
                {openFaq === i && <p className="border-t border-indigo-50 px-5 py-4 text-sm leading-relaxed text-slate-600">{f.content}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA final */}
      <section id="chat" className="mx-auto max-w-5xl px-5 py-14 text-center">
        <div className="rounded-3xl p-10 text-white shadow-2xl" style={{ background: `linear-gradient(120deg, ${color}, #4f46e5)` }}>
          <h2 className="text-3xl font-extrabold tracking-tight">¿Listo para dar el siguiente paso?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/80">
            Conversa ahora con {twin?.name || "tu asesora IA"}. En menos de 3 minutos sabrás si esta oportunidad encaja contigo.
          </p>
        </div>
      </section>

      <footer className="border-t border-indigo-100 py-6 text-center text-xs text-slate-400">
        {profile?.org.name} · Powered by{" "}
        <a href="https://dguiquantrum.com" target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 transition hover:text-indigo-500">
          DGI Quantrum
        </a>
      </footer>

      <ChatWidget slug={slug!} profile={profile} variantId={variantId} />
    </div>
  );
}

function MessageCircleIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
}