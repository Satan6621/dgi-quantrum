# DGI Quantrum 🧠

Infraestructura de crecimiento **SaaS B2B** basada en IA para empresas con redes de distribuidores,
representantes, afiliados o agentes. Una sola configuración central y **AI Twins** replicados
automáticamente para cada distribuidor.

> **TRÁFICO → PROSPECTOS INFORMADOS → PROSPECTOS COMPATIBLES → ALTA INTENCIÓN → ONBOARDING → ACTIVACIÓN → DUPLICACIÓN**

Documentación completa de arquitectura y roadmap: [`PLAN.md`](./PLAN.md)

---

## ✨ Qué incluye

| Módulo | Descripción |
|---|---|
| 🧠 **Central AI Brain** | Base de conocimiento configurable sin código (productos, políticas, FAQs, eligibility, claims prohibidos, screening, escalamiento…). Fuente única de verdad para toda la red. |
| 👤 **Distributor AI Twin** | Cada distribuidor hereda el cerebro central y personaliza nombre, avatar, tono, enlaces, WhatsApp, calendario, idioma y su funnel público `/f/:slug`. |
| 💬 **Conversación IA** | Funnel público con widget de chat: RAG sobre el cerebro + preguntas de screening + scoring en tiempo real. Motor **pluggable**: OpenAI-compatible si configuras clave, o motor de reglas determinista (sin claves). |
| 🎯 **Qualification** | Clasificación automática: `NO APTO` → salida · `NUTRICIÓN` → follow-ups programados · `ALTA INTENCIÓN` → handoff humano (WhatsApp + calendario). |
| 📈 **Follow-ups** | Secuencias editables que se programan automáticamente para leads en nutrición (scheduler interno). |
| 🚀 **Onboarding → Duplicación** | Checklist guiado y activación: el lead se convierte en **nuevo distribuidor con su propio AI Twin** — el ciclo se replica solo. |
| 📊 **Analítica** | Funnel de conversión, distribución de scoring, serie temporal, rendimiento por distribuidor y **comparativa de variantes A/B**. |
| 🔒 **Multi-tenant** | Aislamiento total de datos por organización (verificado en pruebas). |
| 🔎 **RAG híbrido** | Recuperación del cerebro combinando solapamiento léxico + **embeddings locales** (sin dependencias ni coste). |
| 🔔 **Webhooks + canales** | WhatsApp/Twilio/Meta y Cal.com con entrada real, salida Twilio o **simulada**, log por evento y **simulador** en el panel. |
| 📅 **Notificaciones** | Campana in-app con polling: leads nuevos, handoff, comisiones, bookings y gamificación. |
| 💳 **Billing** | Planes STARTER/GROWTH/SCALE con límites (crear sobre el límite → **402**); checkout **Stripe real** confirmado por **webhook firmado** (o simulado en demo), facturación idempotente, pago rechazado y degradación automática de planes vencidos. |
| 🌳 **Red (downline)** | Árbol de patrocinio, **compensación en 3 niveles** y gamificación (puntos, niveles y badges). |
| 🧪 **A/B testing** | Variantes de tono/presentación por funnel con asignación estable por visitante y métricas por variante. |
| 🔑 **API pública** | Claves con scopes + rate-limit, endpoints `/api/v1` y **exportación** CSV/JSON con BOM. |
| 📋 **Import CSV** | Sube leads y ítems del cerebro en CSV con dedupe, validación por fila y resumen de resultados. |
| 🔄 **Webhooks de salida** | Recibe eventos de tu red (leads, handoffs, activaciones, comisiones) con **firma HMAC-SHA256**, botón de prueba y log de entregas. |
| ✉️ **Email** | Follow-ups y bienvenidas por SMTP (nodemailer) cuando lo configuras. |
| 🛡️ **Hardening** | Helmet, rate-limiting global y en login, límite de body, sin `x-powered-by`. |
| 📚 **Docs API** | OpenAPI 3.0 + Swagger UI en `/api/docs`. |
| 🧪 **Tests** | 100 tests automatizados (vitest + supertest) contra BD aislada. |
| 🐳 **Docker + CI** | Dockerfiles multi-stage, `docker-compose.yml` y CI en GitHub Actions. |
| 🧑‍💼 **Equipo** | Invita miembros con roles, contraseña temporal, activar/desactivar y eliminar. |
| 🔑 **Sesión robusta** | Access token corto + **refresh rotativo** revocable; renovación automática en el frontend. |
| 🚪 **Registro self-serve** | Crea tu organización con plan TRIAL, brain + secuencias + AI Twin provisionados automáticamente. |
| 🧾 **Auditoría** | Registro consultable de acciones sensibles (login, equipo, plan, export, activaciones…). |
| 🧠 **Memoria multi-turno** | Un lead que ya pasó el funnel y **vuelve a escribir** recibe respuesta con historial + RAG; solo re-escala si vuelve con intención clara. |
| ⏰ **SLA de handoff** | Si un handoff no se atiende en `slaHours` (configurable, 24 h por defecto), el sistema **escala solo** a admins/managers (una vez) y dispara `lead.escalated`. |
| 🧪 **Playground IA** | Prueba qué respondería la IA con tu cerebro actual (`/api/brain/test` + botón *Probar IA* en el panel). |
| 🗣️ **Objeciones** | Categoría `OBJECTION` en el cerebro: la IA reconoce y responde objeciones de precio, tiempo, confianza e indecisión sin castigar el score. |
| 👋 **Despedidas y enlaces** | Detecta cierres (adiós, hasta luego…) con respuesta cálida, y URLs invitan a seguir la conversación. |
| 🌐 **Idioma** | Detección es/en/pt: los reconocimientos sin respuesta se devuelven en el idioma del prospecto. |
| ⚡ **Analítica avanzada** | Velocidad del funnel (tiempo a handoff, respuesta del distribuidor, SLA, latencia IA), **conversión por canal**, **cohortes semanales**, panel **ejecutivo** agregado y export CSV. |
| 📲 **WhatsApp real** | Webhook de entrada con **firma verificada** (Twilio `X-Twilio-Signature` o Meta `X-Hub-Signature-256`) y salida por Twilio o **Meta WhatsApp Cloud API**; configuración desde el panel. |

---

## 🚀 Arranque rápido

Requisitos: **Node.js 18+**.

```bash
# 1) Dependencias
npm install                                # raíz (concurrently)
cd apps/api && npm install
cd apps/web && npm install

# 2) Base de datos (SQLite) + demo
cd apps/api
npm run prisma:generate
npm run db:push
npm run db:seed

# 3) Ejecutar todo
cd ../..
npm run dev        # API → http://localhost:4000 · Web → http://localhost:5173
```

### Tests

```bash
cd apps/api && npm test        # prepara BD de test (test.db) y ejecuta los 100 tests
```

### Docker (producción)

```bash
docker compose up --build      # API → http://localhost:4000 · Web → http://localhost:8080
```

> La API documenta sus endpoints en **Swagger UI**: `http://localhost:4000/api/docs` (spec en `/api/v1/openapi.json`).

### Cuentas demo

| Rol | Email | Password |
|---|---|---|
| Admin (Vida Nova) | `admin@vida-nova.demo` | `demo1234` |
| Distribuidor | `distributor@vida-nova.demo` | `demo1234` |
| Distribuidores demo (red) | `juan@vida-nova.demo` / `pedro@vida-nova.demo` / `lucia@vida-nova.demo` / `andres@vida-nova.demo` | `demo1234` |
| Funnel público | `http://localhost:5173/f/maria-gonzalez` | — |

### Prueba el ciclo completo

1. Entra al **funnel público** y conversa con la IA (dile tu nombre, que tienes >18, tu motivación, tu disponibilidad y un email).
2. Verás el scoring en vivo y, al alcanzar **alta intención**, el handoff con WhatsApp + calendario.
3. Entra como **admin** → *Leads* → abre ese lead → *Aceptar handoff* → completa el checklist → *Activar como distribuidor*.
4. El nuevo distribuidor aparece en *Onboarding* con su **propio funnel** `/f/su-slug` y su AI Twin.
5. Revisa **Red** → el nuevo distribuidor quedó patrocinado y se pagaron **comisiones** a 3 niveles; verás
   notificaciones y puntos en el leaderboard.
6. En *Distribuidores* (admin) prueba **A/B**: crea variantes de tono, abre el funnel público y mira la
   comparativa en *Analítica*.
7. En *Simulador* escribe un mensaje entrante de WhatsApp y observa al sistema crear el lead, responder y
   guardar el `WebhookLog`.
8. En *API Keys* crea una clave y prueba `GET http://localhost:4000/api/v1/leads` con el header `X-API-Key`.
9. En *Plan y facturación* cambia de plan: con `STRIPE_SECRET_KEY` configurado te lleva a **Stripe Checkout**
   y el pago se confirma por webhook (`STRIPE_WEBHOOK_SECRET` en `POST /api/billing/webhook`); sin clave es simulado.
   En *Exportar datos* descarga CSV/JSON.
10. En *Admin → Central AI Brain → Probar IA* escribe una pregunta y observa la respuesta con sus fuentes (RAG).
    Luego en *Organización* baja el **SLA de handoff** y deja un lead en handoff sin atender: en unos minutos verás la notificación de **escalado**.
11. En *Analítica* mira los nuevos KPIs de **velocidad** (tiempo medio a handoff, respuesta del distribuidor, SLA y latencia IA),
    la **conversión por canal** (funnel vs WhatsApp vs referidos) y las **cohortes semanales**; descarga el **CSV ejecutivo**.
12. En *Admin → Webhooks* configura el **canal de WhatsApp** (Twilio o Meta): conecta tu cuenta, apunta el webhook
    `POST /api/webhooks/{orgSlug}/whatsapp` y escribe un mensaje real — la IA lo atiende y responde por el mismo canal.

---

## 🔌 Integración con LLM real (opcional)

Sin configuración, la IA usa un **motor de reglas + RAG** (funciona offline). Para usar un LLM
OpenAI-compatible (OpenAI, Azure, Groq, Ollama, etc.) edita `apps/api/.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

Al reiniciar la API verás `Motor de IA → openai-compatible`. Si falla, vuelve automáticamente al motor de reglas.

---

## 🧱 Stack

- **API**: Node.js + TypeScript + Express + Prisma (SQLite en MVP, migrable a PostgreSQL)
- **Web**: React 19 + Vite + Tailwind CSS v4 + react-router + lucide-react
- **IA**: Motor pluggable (LLM OpenAI-compatible / fallback de reglas + RAG léxico)

## 📁 Estructura

```
dgi-quantrum/
├── apps/
│   ├── api/                  # Backend Express + Prisma
│   │   ├── prisma/           # schema + seed demo
│   │   ├── scripts/          # pretest.mjs (BD de test + vitest)
│   │   ├── tests/            # suite vitest + supertest (100 tests)
│   │   ├── Dockerfile        # imagen multi-stage de la API
│   │   └── src/
│   │       ├── app.ts        # app Express (hardening, rate-limit, docs)
│   │       ├── index.ts      # bootstrap + scheduler (follow-ups + SLA)
│   │       ├── routes/       # auth(+refresh/signup), team, audit, public(funnel), brain(+playground), org, distributors, leads, followups,
│   │       │                 # analytics, webhooks(+simulador), downline, billing, keys, export, notifications, v1 (API pública)
│       │   └── lib/          # aiEngine (pluggable + objeciones/despedidas/enlaces/idioma), rag, embeddings, scoring,
│       │                         # conversation (memoria multi-turno), gamify, downline, channels, whatsapp (firmas Twilio/Meta),
│       │                         # inbound, billing, apikey, notify, export, csv, email, outgoing (webhooks salida con HMAC),
│       │                         # openapi, refresh, audit, provision, sla
│   └── web/                  # Frontend React (dashboard dark + funnel público claro)
│       ├── Dockerfile        # build + nginx (proxy /api)
│       ├── nginx.conf
│       └── src/pages/        # login(+registro), funnel, dashboard, twin, leads, conversaciones, follow-ups, onboarding,
│                             # analítica(+variantes), red(downline), simulador, admin(brain/sequences/
│                             # distribuidores/team/billing/keys/webhooks/audit/export)
├── docker-compose.yml        # API :4000 + Web :8080 con volumen SQLite
├── .github/workflows/ci.yml  # CI: install, prisma, build, tests
├── PLAN.md                   # Plan de producto y arquitectura
└── package.json              # scripts: setup:db, dev, build
```

---

## 🔒 Seguridad

- Passwords con `bcryptjs`, sesiones **JWT** con rol y `orgId`.
- **Aislamiento multi-tenant**: cada query se filtra por la organización del token (probado en tests).
- Claims prohibidos de compliance inyectados en cada conversación de IA.
- `.env` ignorado: no hay secretos en el repo.