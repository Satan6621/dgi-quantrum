# NETWORK AI OS — Plan de Producto y Arquitectura

> Infraestructura de crecimiento basada en IA para empresas con redes de distribuidores.
> Una empresa central configura **un cerebro**, y cada distribuidor recibe **un gemelo IA** que
> replica automáticamente el conocimiento, las políticas y los workflows, manteniendo el ciclo:
> **TRÁFICO → PROSPECTOS INFORMADOS → COMPATIBLES → ALTA INTENCIÓN → ONBOARDING → ACTIVACIÓN → DUPLICACIÓN.**

---

## 1. Principio fundamental

No se optimiza volumen de leads. Se optimiza calidad, intención, transparencia, conversión y
productividad:

```
TRÁFICO → PROSPECTOS INFORMADOS → PROSPECTOS COMPATIBLES
        → CONVERSACIONES DE ALTA INTENCIÓN → INCORPORACIÓN → ACTIVACIÓN → DUPLICACIÓN
```

Cada etapa está **medida** en el panel de analítica (funnel de conversión).

---

## 2. Arquitectura conceptual

```
EMPRESA
  └── AI CENTRAL BRAIN  (conocimiento, reglas, políticas, productos, compliance)
        └── REGLAS + CONOCIMIENTO + POLÍTICAS + PRODUCTOS
              └── DISTRIBUTOR AI INSTANCES (gemelos IA por distribuidor)
                    └── TRÁFICO → PROSPECTO → AI CONVERSATION → EDUCACIÓN
                          → AUTOEVALUACIÓN → SCORING → QUALIFICATION → ELIGIBILITY
                                └── NO APTO (salida)
                                └── NUTRICIÓN (follow-up)
                                └── ALTA INTENCIÓN (handoff humano)
                                      └── ONBOARDING → NUEVO DISTRIBUIDOR
                                            └── NUEVA IA PERSONAL → DUPLICACIÓN
```

---

## 3. Multi-tenancy

Jerarquía estricta por organización con **aislamiento total de datos**:

```
PLATFORM
  └── ORGANIZATION
        ├── ADMIN / MANAGERS
        └── DISTRIBUTORS
              ├── AI INSTANCE   (twin)
              ├── FUNNEL        (página pública /f/:slug)
              ├── LEADS
              ├── CONVERSATIONS
              ├── CONTENT
              └── ANALYTICS
        └── DOWNLINE / NETWORK
```

- Cada `User`, `Lead`, `Session`, `Message`, `BrainItem`, `Distributor` lleva `orgId`.
- **Toda** query del API se filtra por `orgId` del token JWT (middleware obligatorio).
- No existe ruta que devuelva datos de otra organización.

---

## 4. Central AI Brain

Base de conocimiento editable **sin código** por el administrador (CRUD + búsqueda).

Categorías del cerebro:
- `CORPORATE` — información corporativa, misión, valores
- `PRODUCT` — productos / servicios
- `VALUE_PROP` — propuesta de valor
- `POLICY` — políticas y condiciones
- `FAQ` — preguntas frecuentes
- `ELIGIBILITY` — criterios de elegibilidad
- `DISQUALIFICATION` — criterios de descalificación
- `SCREENING` — preguntas de autoevaluación (guían la conversación)
- `ARGUMENT` — argumentos comerciales permitidos
- `PROHIBITED_CLAIM` — claims prohibidos (compliance)
- `PROCESS` — procesos / pasos para unirse
- `FOLLOW_UP` — guiones de seguimiento
- `ESCALATION` — reglas de escalamiento humano
- `OBJECTION` — respuestas a objeciones de precio, tiempo, confianza e indecisión

## 5. Distributor AI Twin

El gemelo **hereda** del cerebro central y **personaliza**:
- nombre, avatar, tono, presentación, idioma, zona
- enlaces (WhatsApp, calendario, redes sociales), disponibilidad
- su funnel público propio `/f/:slug`

---

## 6. Motor de IA (pluggable)

Interfaz única `AIEngine` con dos implementaciones intercambiables por variable de entorno:

| Implementación | Cuándo | Descripción |
|---|---|---|
| `openai-compatible` | si `OPENAI_API_KEY` existe | LLM real (OpenAI, Azure, Groq, Ollama…) con RAG en el prompt |
| `rule-engine` (fallback) | por defecto | Motor determinista: RAG por coincidencia de tokens + guión de screening + scoring |

- **RAG**: recuperación híbrida = solapamiento léxico normalizado + similitud coseno de
  *embeddings locales* (hashing de tokens, sin dependencias ni coste). Intercambiable por
  modelos reales de embedding en producción.
- **Scoring**: señales positivas/negativas + preguntas de screening + reglas de descalificación.
- **Clasificación**: `NO_APTO` / `NUTRICIÓN` / `ALTA_INTENCIÓN`.

## 7. Pipeline de conversación (estado por sesión)

```
GREETING → INTRO → SCREENING → SCORING → CLASSIFY → OUTCOME
```
Estados por sesión guardados en `Session.meta`. Los mensajes se persisten en `Message`.

## 8. Seguridad

- Passwords con `bcryptjs`.
- JWT firmado (`HS256`) con rol y `orgId`.
- Roles: `PLATFORM`, `ADMIN`, `MANAGER`, `DISTRIBUTOR`.
- Validación de entrada básica; sin secretos en el repo (`.env` ignorado).

---

## 9. Stack técnico

| Capa | Tecnología |
|---|---|
| API | Node.js + TypeScript + Express |
| ORM | Prisma (SQLite en MVP, migrable a PostgreSQL) |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Rutas front | react-router-dom v6 |
| Iconos | lucide-react |
| IA | Motor pluggable (OpenAI-compatible / fallback de reglas + RAG) |

## 10. Módulos / Endpoints principales

| Módulo | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/signup` (self-serve con provisión) |
| Brain (admin) | CRUD `/api/brain` + `GET /api/brain/categories` + `POST /api/brain/import` (CSV) + `POST /api/brain/test` (playground) (límite del plan → 402) |
| Org (admin) | `GET/PUT /api/org` (settings, thresholds, checklist, compensación, canales, webhooks de salida) + `POST /api/org/outgoing-webhooks/test` + `GET /api/org/webhook-logs` |
| Twin | `GET/PUT /api/twin`; admin: `GET/POST/PUT /api/distributors` + `PUT /api/distributors/:id/variants` |
| Leads | `GET /api/leads` (paginado + filtros), `POST /api/leads/import` (CSV), `GET/PATCH /api/leads/:id`, handoff, activación (sponsor + comisiones + email de bienvenida) |
| Follow-ups | `GET /api/followups` (paginado; scheduler interno con email opcional) |
| Onboarding | tareas por lead + duplicación (`POST /api/leads/:id/activate`) |
| Analítica | `GET /api/analytics/overview`, `/funnel`, `/timeseries`, `/score-distribution`, `/distributors`, `/variants`, `/velocity`, `/sources`, `/cohorts`, `/executive` |
| Webhooks | `POST /api/webhooks/:orgSlug/whatsapp` (Twilio con `X-Twilio-Signature` o Meta con `X-Hub-Signature-256` + verificación GET), `/generic`, `/calcom`, `POST /api/webhooks/simulate/:orgSlug/:channel` |
| Red (downline) | `GET /api/downline/overview`, `GET /api/downline/tree` |
| Billing | `GET /api/billing`, `GET /api/billing/plans`, `POST /api/billing/checkout`, `POST /api/billing/webhook` (Stripe firmado) |
| API Keys | CRUD `/api/keys` |
| Equipo | `GET /api/team`, `POST /api/team/invite`, `PATCH /api/team/:id`, `DELETE /api/team/:id` |
| Auditoría | `GET /api/audit` (paginado + filtro por acción) |
| Notificaciones | `GET /api/notifications` (paginado + `unreadOnly`), `POST /:id/read`, `POST /read-all` |
| Export | `GET /api/export/:type?format=csv\|json` |
| API pública | `GET /api/v1/leads` (paginado), `/analytics`, `/brain` (header `X-API-Key`, rate-limit 60/min) |
| Docs API | Swagger UI en `GET /api/docs` + spec OpenAPI en `GET /api/v1/openapi.json` |
| Público | `GET /api/public/f/:slug` (variantes), `POST /api/public/f/:slug/chat` |

---

## 11. Roadmap

### MVP (este build)
- [x] Multi-tenant + auth por roles
- [x] Central AI Brain CRUD
- [x] Distributor AI Twin configurable
- [x] Funnel público + widget de chat IA (RAG + screening + scoring)
- [x] Clasificación NO APTO / NUTRICIÓN / ALTA INTENCIÓN
- [x] Handoff humano (WhatsApp + calendario) y onboarding con tareas
- [x] Duplicación: lead activado → nuevo distribuidor con su propio gemelo
- [x] Analítica de funnel, distribuidores, scoring y series temporales
- [x] UI atractiva (dark dashboard + funnel público claro)

### Fase 2
- [x] Embebidos vectoriales + RAG híbrido (hashing local, sin dependencias; intercambiable por pgvector/sqlite-vec)
- [x] Integración WhatsApp Business API / Twilio / webhooks + simulador
- [x] Calendario real (Cal.com / Google) y notificaciones (in-app con polling)
- [x] Pago/billing por organización (Stripe real o simulado) con límites y código 402
- [x] Downline: árbol de red, compensación y gamificación
- [x] A/B testing de funnels y tonos (variantes por twin + analítica por variante)
- [x] Exportación de datos (CSV/JSON) y API pública con claves (`/api/v1` + rate-limit)

### Fase 2 — detalles
- **RAG híbrido**: `hybridRetrieve` combina léxico normalizado + `cosine` sobre embeddings locales
  (`hashEmbed`, dim 96, cache en memoria). Umbral y pesos configurables.
- **Webhooks**: entrada para WhatsApp/Twilio/Meta y Cal.com (booking → ONBOARDING automático) con
  `X-Webhook-Secret` opcional; salida con adaptador Twilio real o simulado; todo en `WebhookLog`.
- **Notificaciones**: eventos de lead, handoff, comisión, booking y gamificación; campana con polling (30s).
- **Billing**: planes STARTER/GROWTH/SCALE con límites por recurso; crear recurso sobre el límite → `402`;
  checkout Stripe real si `STRIPE_SECRET_KEY`, si no factura simulada (demo) que actualiza el plan.
- **Downline / compensación**: `Distributor.sponsorId` (árbol `SponsorTree`); al activar un lead se asigna
  patrocinador y se paga `direct/level1/level2 %` sobre `base`; puntos, niveles (BRONCE→PLATINO) y badges.
- **A/B**: `variants` por twin (tone, presentation, color, weight); el visitante recibe una variante
  estable (localStorage) que se registra en `Session.variant` y se mide en `/api/analytics/variants`.
- **API pública**: claves `naio_<org>_…` (hash SHA-256, scopes, revocación) + `/api/v1` con rate-limit
  en memoria (60 req/min) y códigos 401/403/429.
- **Export**: `GET /api/export/:type?format=csv|json` con BOM para Excel (leads, brain, distributors,
  sessions, commissions, followups).

### Fase 3 — De demo a producción
- [x] **Tests automatizados**: suite `vitest` + `supertest` (43 tests / 9 archivos) contra BD
      SQLite aislada (`file:./test.db`), reset automático por test. `npm test` = push schema + run.
- [x] **Paginación + búsqueda** en todas las listas (`?page&pageSize` con `total/totalPages`),
      filtros en leads (status, source, outcome, distributor, q incl. teléfono), búsqueda en
      brain/distribuidores y paginado en notificaciones y follow-ups.
- [x] **Importación CSV** de leads (dedupe por email/teléfono, columna `source`, eventos y
      resumen `{created, skippedCount, errorCount}`) y de ítems del cerebro
      (`category,title,content,keywords,active` con validación por fila).
- [x] **Webhooks de salida** (eventos `lead.created`, `lead.handoff`, `lead.onboarding`,
      `distributor.activated`, `commission.paid`): endpoints configurables por org, firma
      **HMAC-SHA256** (`X-NAIO-Signature`, `X-NAIO-Event`, `X-NAIO-Delivery`), botón de
      prueba y **log de entregas** persistido.
- [x] **Email SMTP** (nodemailer): follow-ups por email y email de bienvenida al activar un
      distribuidor; si no hay SMTP configurado, se registra en log (modo demo).
- [x] **Hardening**: helmet (cabeceras seguras), rate-limit global `/api` y en login,
      `express.json({limit})`, manejadores de 404/error, eliminación de `x-powered-by`.
- [x] **Docs API**: OpenAPI 3.0 (spec en `GET /api/v1/openapi.json`) + Swagger UI en
      `GET /api/docs`.
- [x] **Docker + CI**: Dockerfiles multi-stage (API + Web con nginx), `docker-compose.yml`
      (API :4000 + Web :8080, volumen para SQLite) y CI en GitHub Actions (install, prisma
      generate, build, tests).

### Fase 4 — Operaciones de plataforma (SaaS self-serve)
- [x] **Registro self-serve completo**: `POST /api/auth/signup` crea la organización (slug único,
      plan **TRIAL**) y **provisiona** contenido de arranque: brain genérico, secuencia de nutrición
      y un **AI Twin** para el admin con su funnel público ya funcional.
- [x] **Auth robusta**: access token corto (15 min) + **refresh token rotativo** persistido
      (hash SHA-256, 14 días, revocable). `POST /api/auth/refresh` rota y `POST /api/auth/logout`
      revoca; el frontend renueva la sesión automáticamente en cada 401.
- [x] **Gestión de equipo**: `GET/POST/PATCH/DELETE /api/team` — invitar (con contraseña temporal
      o propia), cambiar rol, activar/desactivar y eliminar miembros, con protecciones (último admin,
      auto-desactivación) y control por rol (ADMIN/PLATFORM). UI en *Admin → Equipo*.
- [x] **Audit log**: `AuditLog` persiste acciones sensibles (login, signup, refresh, team, plan,
      keys, import/activación de leads, export, webhook test). Consultable paginado y filtrable en
      *Admin → Auditoría*.

### Fase 5 — IA operativa: el sistema conversa y escala solo
- [x] **Memoria multi-turno**: cuando un lead que ya pasó el funnel (nutrición, handoff o screening
      completo) vuelve a escribir por cualquier canal, la IA **responde sus dudas con el historial
      completo + RAG** (en vez de repetir el guión de nutrición) y solo **re-escala a handoff** si
      vuelve con intención clara y datos de contacto.
- [x] **Re-engagement inteligente**: la respuesta de un lead a los follow-ups entra por el mismo
      motor, de modo que cada interacción posterior se atiende con contexto y scoring acumulado.
- [x] **Escalamiento por SLA**: `org.settings.slaHours` (por defecto 24) — si un lead en handoff no
      se atiende en ese plazo, el scheduler notifica a admins/managers (tipo `escalation`), marca
      `Lead.meta.escalatedAt` (se escala **una sola vez**) y dispara el evento de salida
      `lead.escalated`.
- [x] **Playground del brain**: `POST /api/brain/test` devuelve la respuesta que daría la IA con el
      contenido actual (RAG híbrido + reglas) y las fuentes usadas; UI en *Admin → Central AI Brain
      → Probar IA*.
- [x] **71 tests** (14 archivos) y E2E en vivo que verifica la escalación real por el scheduler.

### Fase 6 — IA conversacional avanzada
- [x] **Manejo de objeciones**: nueva categoría `OBJECTION` en el cerebro (precio, tiempo, confianza,
      indecisión). `analyze` reconoce señales de objeción (antes de castigar el score) y la IA responde
      con el ítem OBJECTION más relevante (RAG), validando la preocupación y **sin** forzar la siguiente
      pregunta de screening en ese turno ni empujar a nutrición.
- [x] **Coherencia en el screening**: tras responder una pregunta de autoevaluación, la IA pregunta la
      **siguiente** (ya no repite la misma).
- [x] **Cierre / despedida**: la IA detecta despedidas (adiós, hasta luego, nos vemos…) y cierra con
      calidez, sin avanzar el screening ni descalificar.
- [x] **Enlaces**: si el prospecto comparte una URL, la IA reconoce que no puede abrirla e invita a
      contar qué encontraron, sin interrumpir la conversación.
- [x] **Idioma (fallback)**: detección ligera es/en/pt; los reconocimientos sin respuesta de RAG se
      responden en el idioma del prospecto.
- [x] **79 tests** (15 archivos) + E2E en vivo (objeciones, despedida, enlace e inglés verificados).

### Fase 7 — Analítica avanzada (velocidad y conversión por canal)
- [x] **Timestamps del ciclo de vida**: `Lead.handoffAt` (primer paso a HANDOFF, seteado por el motor
      y por el PATCH de estado) y `Lead.activatedAt` (activación). Fuente única para métricas de tiempo.
- [x] **Velocidad del funnel** (`/api/analytics/velocity`): tiempo medio/mediana de captura→handoff,
      tiempo medio de respuesta del distribuidor (handoff→activación), cumplimiento de SLA
      (`slaHours`), handoffs pendientes y latencia del motor IA (usuario→respuesta, últimos 30 días).
- [x] **Conversión por canal** (`/api/analytics/sources`): por `source` — total, alta intención,
      activados, descalificados, tasa de conversión y score promedio.
- [x] **Cohortes semanales** (`/api/analytics/cohorts`): 12 semanas (captura → alta intención →
      activación) con tasas de progresión por semana.
- [x] **Panel ejecutivo** (`/api/analytics/executive`): overview + velocidad + canales + cohortes en
      una sola llamada para el dashboard.
- [x] **Export `analytics`**: CSV/JSON plano con totales, velocidad y desglose por fuente y semana.
- [x] **UI en *Analítica***: KPIs de velocidad (tiempo a handoff, respuesta del distribuidor, SLA,
      latencia IA), tabla "Conversión por canal" con barras, tabla "Cohortes semanales" y botón
      "Exportar CSV".
- [x] **86 tests** (16 archivos) + E2E en vivo (executive, velocity con datos del seed, canales,
      cohortes, export CSV y handoff marcado por el motor).

### Fase 8 — Integración real de WhatsApp (Twilio y Meta Cloud API)
- [x] **Verificación de firmas entrantes**: `X-Twilio-Signature` (HMAC-SHA1 base64 sobre la URL +
      params ordenados) y `X-Hub-Signature-256` de Meta (HMAC-SHA256 sobre el raw del body). Payloads
      con firma inválida → **401**. Meta requiere también la verificación GET del `hub.challenge`.
- [x] **Adaptador de salida Meta**: si el canal usa `provider: "meta"`, las respuestas de la IA se
      envían por WhatsApp Cloud API (`graph.facebook.com/v19.0`) con `metaToken`/`metaPhoneNumberId`;
      Twilio sigue usando las credenciales de entorno; sin credenciales → simulado.
- [x] **Mensajes entrantes reales**: se persiste el `sid` (Twilio) / `wamid` (Meta) en el `WebhookLog`
      y el `MessageSid` se mapea para trazabilidad.
- [x] **UI en *Admin → Webhooks***: tarjeta "Canal de entrada · WhatsApp" con proveedor
      (simulado/Twilio/Meta), funnel destino, secret y credenciales de Meta, guardando los settings
      sin pisar el resto de la configuración.
- [x] **94 tests** (17 archivos) + E2E en vivo (firmas válidas/inválidas de Twilio y Meta, hub.challenge).

### Fase 9 — Stripe real (pagos confirmados por webhook)
- [x] **Checkout real**: `POST /api/billing/checkout` crea una sesión de Stripe Checkout (subscription)
      con `metadata[orgId]`/`metadata[plan]`; si no hay clave sigue el modo simulado (demo).
- [x] **Webhook firmado**: `POST /api/billing/webhook` (público, montado antes del router autenticado)
      verifica `Stripe-Signature` (`t=...,v1=hmac-sha256(secret, ts + "." + rawBody)`) → 401 si es inválida,
      503 si no hay `STRIPE_WEBHOOK_SECRET`.
- [x] **Eventos procesados**: `checkout.session.completed` (activa el plan, guarda `stripeCustomerId`/
      `stripeSubscriptionId`/`periodEnd`, crea la factura con `stripeId` **idempotente** y notifica),
      `invoice.payment_failed` (estado PAST_DUE + notificación) y `customer.subscription.deleted`
      (degradación a TRIAL).
- [x] **Caducidad de plan**: el scheduler degrada automáticamente a TRIAL los planes ACTIVE vencidos y
      notifica; `billingView` expone `expired`, `periodEnd` y `mode`.
- [x] **UI en *Plan y facturación***: badge de estado vencido, fecha de renovación y modo de pago
      (Stripe / Simulado), con aviso si la suscripción expiró.
- [x] **100 tests** (18 archivos) + E2E en vivo (firma inválida, pago completado, plan activado,
      factura creada, PAST_DUE y degradación).

---

## 12. Cómo ejecutar

```bash
npm install                 # raíz (concurrently)
cd apps/api && npm install && npm run prisma:generate && npm run db:push && npm run db:seed
cd apps/web && npm install
npm run dev                 # raíz: API :4000 + Web :5173
```

- Admin demo: `admin@vida-nova.demo` / `demo1234`
- Distribuidor demo: `distributor@vida-nova.demo` / `demo1234`
- Funnel público: `http://localhost:5173/f/maria-gonzalez`