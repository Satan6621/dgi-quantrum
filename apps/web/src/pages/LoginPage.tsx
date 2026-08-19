import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { BrainCircuit, ArrowRight, Lock, Mail, User, Building2, Sparkles, ShieldCheck, Network } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/useAuth";
import { Button, Input, Field, cn } from "../components/ui";

export default function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", orgName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        login(data.token, data.user, data.refreshToken);
        nav("/app");
      } else {
        const data = await api("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(form),
        });
        login(data.token, data.user, data.refreshToken);
        nav("/app/admin/brain");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function fill(email: string, password: string) {
    setMode("login");
    setForm((f) => ({ ...f, email, password }));
    setError("");
  }

  return (
    <div className="flex min-h-screen bg-ink-950">
      {/* Panel izquierdo de marca */}
      <div className="relative hidden w-[46%] overflow-hidden border-r border-white/5 bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900/40 lg:block">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-gradient-shift rounded-full bg-brand-600/25 blur-3xl" style={{ backgroundSize: "200% 200%" }} />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 animate-gradient-shift rounded-full bg-glow-500/20 blur-3xl" style={{ backgroundSize: "200% 200%", animationDelay: "4s" }} />

        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-glow-500 shadow-xl shadow-brand-600/40">
              <BrainCircuit className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-tight text-white">DGI Quantrum</p>
              <p className="text-[11px] uppercase tracking-widest text-brand-300">Crecimiento impulsado por IA</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="animate-slide-up">
              <h1 className="text-4xl font-extrabold leading-tight text-white">
                Un cerebro. <br />
                <span className="text-gradient">Mil distribuidores.</span> <br />
                Un crecimiento infinito.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
                Convierte cada prospecto en un distribuidor activado con conversaciones de IA guiadas por tu
                conocimiento corporativo — y replica el sistema automáticamente para toda tu red.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                { icon: Network, title: "Multi-tenant", text: "Aislamiento total por organización" },
                { icon: Sparkles, title: "AI Twin por distribuidor", text: "Un funnel IA personalizado por cada agente" },
                { icon: ShieldCheck, title: "Compliance integrado", text: "Claims prohibidos y políticas en cada conversación" },
              ].map((f, i) => (
                <div key={f.title} className="animate-slide-up flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                  <f.icon className="h-5 w-5 shrink-0 text-glow-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-xs text-slate-400">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Datos aislados por organización</span>
            <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-400" /> JWT seguro</span>
          </div>
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-extrabold text-white">{mode === "login" ? "Bienvenido de nuevo" : "Crear organización"}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {mode === "login" ? "Accede a tu panel de crecimiento" : "Empieza con tu Central AI Brain y tus distribuidores"}
            </p>
          </div>

          <div className="space-y-4">
            {mode === "signup" && (
              <>
                <Field label="Tu nombre">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input placeholder="Nombre y apellido" className="pl-9" value={form.name} onChange={set("name")} />
                  </div>
                </Field>
                <Field label="Nombre de la organización">
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input placeholder="Ej. Vida Nova" className="pl-9" value={form.orgName} onChange={set("orgName")} />
                  </div>
                </Field>
              </>
            )}

            <Field label="Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input type="email" placeholder="tu@empresa.com" className="pl-9" value={form.email} onChange={set("email")} />
              </div>
            </Field>

            <Field label="Contraseña">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input type="password" placeholder="••••••••" className="pl-9" value={form.password} onChange={set("password")} onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
            </Field>

            {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

            <Button className="w-full" size="lg" loading={loading} onClick={submit}>
              {mode === "login" ? "Entrar al panel" : "Crear organización"}
              <ArrowRight className="h-4 w-4" />
            </Button>

            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className="w-full text-center text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              {mode === "login" ? "¿Nueva empresa? Crear organización" : "¿Ya tienes cuenta? Iniciar sesión"}
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Cuentas demo</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fill("admin@vida-nova.demo", "demo1234")}
                className={cn("rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:border-brand-500/50 cursor-pointer")}
              >
                <p className="text-[11px] font-bold text-white">Admin</p>
                <p className="truncate text-[10px] text-slate-400">admin@vida-nova.demo</p>
              </button>
              <button
                onClick={() => fill("distributor@vida-nova.demo", "demo1234")}
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:border-brand-500/50 cursor-pointer"
              >
                <p className="text-[11px] font-bold text-white">Distribuidor</p>
                <p className="truncate text-[10px] text-slate-400">distributor@vida-nova.demo</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}