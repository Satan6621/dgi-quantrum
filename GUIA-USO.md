# DGI Quantrum — Guía de Uso Completa

> Infraestructura de crecimiento basada en IA para empresas con redes de distribuidores.
> Una empresa central configura **un cerebro**, y cada distribuidor recibe **un gemelo IA** que replica automáticamente el conocimiento, las políticas y los workflows.

---

## Índice

1. [Bienvenida](#1-bienvenida)
2. [Primeros Pasos](#2-primeros-pasos)
3. [Central AI Brain](#3-central-ai-brain)
4. [Distributors & AI Twins](#4-distributors--ai-twins)
5. [Leads & Conversaciones](#5-leads--conversaciones)
6. [Funnels Públicos](#6-funnels-públicos)
7. [Seguimiento (Follow-ups)](#7-seguimiento-follow-ups)
8. [Onboarding & Duplicación](#8-onboarding--duplicación)
9. [Integraciones](#9-integraciones)
10. [Analítica](#10-analítica)
11. [Red (Downline)](#11-red-downline)
12. [Configuración Avanzada](#12-configuración-avanzada)
13. [API Pública](#13-api-pública)
14. [Seguridad](#14-seguridad)
15. [Despliegue](#15-despliegue)

---

## 1. Bienvenida

### 1.1 Qué es DGI Quantrum

DGI Quantrum es una plataforma **SaaS B2B** de generación de leads potenciada por inteligencia artificial, diseñada para empresas con redes de distribuidores, representantes, afiliados o agentes.

El principio fundamental es: **no se optimiza volumen de leads, se optimiza calidad, intención, transparencia y conversión**.

```
TRÁFICO → PROSPECTOS INFORMADOS → PROSPECTOS COMPATIBLES
        → CONVERSACIONES DE ALTA INTENCIÓN → INCORPORACIÓN → ACTIVACIÓN → DUPLICACIÓN
```

### 1.2 Para quién está diseñado

- **Empresas de venta directa** con redes de distribuidores
- **Organizaciones de afiliados** que necesitan escalar la calificación de prospectos
- **Equipos de network marketing** que buscan automatizar la captación y el onboarding
- **Compañías de bienestar, nutrición o cosméticos** con modelos de distribución multinivel
- **Cualquier empresa** que necesite replicar conocimiento comercial de forma consistente a través de una red humana

### 1.3 Arquitectura conceptual

```
EMPRESA (Organización)
  └── AI CENTRAL BRAIN
        │   Conocimiento, reglas, políticas, productos, compliance
        │
        └── DISTRIBUTORS (Distribuidores)
              │
              ├── AI TWIN (Gemelo IA por distribuidor)
              │     Nombre, avatar, tono, idioma, enlaces
              │
              ├── FUNNEL PÚBLICO (/f/:slug)
              │     Widget de chat IA
              │
              ├── LEADS (Prospectos)
              │     Scoring en tiempo real
              │     Clasificación automática
              │
              ├── FOLLOW-UPS (Seguimientos)
              │
              └── ONBOARDING → NUEVO DISTRIBUIDOR
                    └── DUPLICACIÓN (el ciclo se replica solo)
```

**Jerarquía de aislamiento multi-tenant:**

```
PLATFORM
  └── ORGANIZATION
        ├── ADMIN / MANAGERS
        └── DISTRIBUTORS
              ├── AI INSTANCE (twin)
              ├── FUNNEL (página pública /f/:slug)
              ├── LEADS
              ├── CONVERSATIONS
              ├── CONTENT
              └── ANALYTICS
        └── DOWNLINE / NETWORK
```

### 1.4 Stack técnico

| Capa | Tecnología |
|---|---|
| API | Node.js + TypeScript + Express |
| ORM | Prisma (SQLite en MVP, migrable a PostgreSQL) |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Rutas front | react-router-dom v6 |
| IA | Motor pluggable (OpenAI-compatible / fallback de reglas + RAG) |
| Contenedorización | Docker multi-stage |

---

## 2. Primeros Pasos

### 2.1 Registro de organización (self-serve)

El registro es completamente **self-serve**. Al crear tu organización, el sistema automáticamente:

1. Crea la organización con plan **TRIAL** (14 días)
2. Provisiona un **Central AI Brain** genérico con categorías de conocimiento predefinidas
3. Crea una **secuencia de nutrición** por defecto
4. Genera un **AI Twin** para el administrador con funnel público funcional

**Pasos de registro:**

1. Ve a la página de registro de la plataforma
2. Completa los campos:
   - **Tu nombre** (administrador)
   - **Nombre de la organización**
   - **Slug** (identificador único en URL, se genera automáticamente)
   - **Email**
   - **Contraseña** (mínimo 6 caracteres)
3. Haz clic en **Crear organización**

```
POST /api/auth/signup
{
  "name": "Adriana Ortega",
  "orgName": "Vida Nova",
  "slug": "vida-nova",
  "email": "admin@vida-nova.demo",
  "password": "demo1234"
}
```

> **Resultado:** Tu organización está lista con brain, secuencias y un AI Twin apuntando a `/f/tu-slug`.

<!-- Screenshot: Formulario de registro -->

### 2.2 Configuración inicial

Al entrar por primera vez como administrador, se te redirige al **dashboard** donde verás:

- **Overview:** KPIs principales (leads, conversaciones, conversión)
- **Onboarding checklist:** Tareas pendientes de configuración
- **Notificaciones:** Eventos recientes del sistema

**Configuración recomendada inicial:**

1. **Organización** (`/app/admin` → Organización):
   - Actualiza el nombre, logo y color primario
   - Configura los umbrales de scoring (`thresholds.highIntent`, `thresholds.nutrition`)
   - Establece las horas de SLA para handoff (`slaHours`, por defecto 24)

2. **Central AI Brain** (`/app/admin/brain`):
   - Revisa el contenido provisionado
   - Agrega información específica de tu empresa
   - Configura los claims prohibidos

3. **Tu AI Twin** (`/app/twin`):
   - Personaliza nombre, avatar, tono y presentación
   - Agrega tus enlaces de WhatsApp y calendario

### 2.3 Acceso al dashboard

**Credenciales demo:**

| Rol | Email | Password |
|---|---|---|
| Admin | `admin@vida-nova.demo` | `demo1234` |
| Distribuidor | `distributor@vida-nova.demo` | `demo1234` |

**URLs de acceso:**

- **Dashboard:** `http://localhost:5173/app` (desarrollo) o `https://tu-app.vercel.app/app` (producción)
- **API:** `http://localhost:4000` (desarrollo)
- **Swagger UI:** `http://localhost:4000/api/docs`
- **Funnel público:** `http://localhost:5173/f/maria-gonzalez`

<!-- Screenshot: Dashboard principal con KPIs -->

---

## 3. Central AI Brain

### 3.1 Qué es y cómo funciona

El **Central AI Brain** es la base de conocimiento centralizada de tu organización. Es editable **sin código** por el administrador y sirve como fuente única de verdad para todos los AI Twins de la red.

El cerebro alimenta al motor de IA a través de **RAG (Retrieval-Augmented Generation)**:

```
Pregunta del lead
       ↓
Búsqueda en el cerebro (RAG híbrido)
  ├── Solapamiento léxico normalizado
  └── Similitud coseno (embeddings locales)
       ↓
Respuesta generada con contexto
       ↓
Validación contra claims prohibidos
```

### 3.2 Categorías de conocimiento

Cada ítem del cerebro pertenece a una de las siguientes categorías:

| Categoría | Descripción | Ejemplo |
|---|---|---|
| `CORPORATE` | Información corporativa, misión, valores | "Vida Nova es una comunidad internacional de bienestar…" |
| `PRODUCT` | Productos y servicios | "Suplementos nutricionales naturales formulados…" |
| `VALUE_PROP` | Propuesta de valor | "Únete a una comunidad en crecimiento…" |
| `POLICY` | Políticas y condiciones | "Todos los productos cuentan con 30 días de garantía…" |
| `FAQ` | Preguntas frecuentes | "¿Necesito experiencia en ventas?" |
| `ELIGIBILITY` | Criterios de elegibilidad | "Se requiere ser mayor de 18 años" |
| `DISQUALIFICATION` | Criterios de descalificación | "Los menores de 18 años no pueden registrarse…" |
| `SCREENING` | Preguntas de autoevaluación | "¿Tienes más de 18 años?" |
| `ARGUMENT` | Argumentos comerciales permitidos | "Tú decides cuánto creces…" |
| `PROHIBITED_CLAIM` | Claims prohibidos (compliance) | "Prohibido prometer ingresos garantizados…" |
| `PROCESS` | Procesos para unirse | "1) Conversa con tu asesor, 2) completa tu registro…" |
| `FOLLOW_UP` | Guiones de seguimiento | "Recuerda que te escribí para continuar…" |
| `ESCALATION` | Reglas de escalamiento humano | "Cuando un prospecto alcanza ALTA INTENCIÓN…" |
| `OBJECTION` | Respuestas a objeciones | "El kit de inicio tiene un valor de 100 USD…" |

> **Nota:** Las categorías `ELIGIBILITY`, `DISQUALIFICATION`, `SCREENING`, `OBJECTION` y `PROHIBITED_CLAIM` tienen un efecto directo en el scoring y la clasificación de leads.

### 3.3 Cómo agregar contenido

**Desde el panel de administración:**

1. Ve a **Admin → Central AI Brain**
2. Haz clic en **Agregar ítem**
3. Completa:
   - **Categoría:** Selecciona la categoría apropiada
   - **Título:** Nombre descriptivo del ítem
   - **Contenido:** Texto completo que la IA usará para responder
   - **Palabras clave:** Términos separados por espacios para mejorar la búsqueda RAG
   - **Activo:** Toggle para activar/desactivar el ítem

**Ejemplo de creación vía API:**

```
POST /api/brain
{
  "category": "PRODUCT",
  "title": "Línea Bienestar Diario",
  "content": "Suplementos nutricionales naturales formulados con ingredientes certificados. Incluye vitaminas, probióticos y colágeno.",
  "keywords": "vitaminas suplementos probióticos colágeno nutrición",
  "active": true
}
```

### 3.4 Importar contenido en lote (CSV)

Para cargar múltiples ítems de una vez:

1. Prepara un CSV con las columnas: `category`, `title`, `content`, `keywords`, `active`
2. Ve a **Admin → Central AI Brain → Importar CSV**
3. Pega el contenido del CSV
4. El sistema validará cada fila y te devolverá un resumen

**Formato del CSV:**

```csv
category,title,content,keywords,active
PRODUCT,Nuevo Producto,Descripción del producto,palabras clave,true
FAQ,Pregunta frecune,Respuesta,faq pregunta,true
```

**Ejemplo vía API:**

```
POST /api/brain/import
{
  "csv": "category,title,content,keywords\nPRODUCT,Test,Content,kw1 kw2"
}
```

**Respuesta:**

```json
{
  "created": 1,
  "errorCount": 0,
  "createdItems": [{ "id": "...", "category": "PRODUCT", "title": "Test" }],
  "errors": []
}
```

### 3.5 Editar y desactivar contenido

- **Editar:** Selecciona el ítem → modifica campos → guarda
- **Desactivar:** Cambia el toggle "Activo" a OFF (el ítem permanece en la BD pero la IA no lo usa)
- **Eliminar:** Selecciona el ítem → confirma eliminación

### 3.6 Probar la IA (Playground)

El playground permite ver exactamente qué respondería la IA con el contenido actual del cerebro, sin necesidad de simular una conversación completa.

1. Ve a **Admin → Central AI Brain → Probar IA**
2. Escribe una pregunta o mensaje
3. Observa:
   - **Respuesta de la IA**
   - **Fuentes utilizadas** (ítems del cerebro que la IA consultó con su nivel de relevancia)

**Ejemplo vía API:**

```
POST /api/brain/test
{
  "text": "¿Cuánto cuesta el kit de inicio?"
}
```

**Respuesta:**

```json
{
  "reply": "El kit de inicio tiene un costo único accesible...",
  "sources": [
    { "id": "...", "category": "POLICY", "title": "Costo de inicio", "relevance": 0.85 },
    { "id": "...", "category": "FAQ", "title": "¿Cuánto tiempo necesito dedicar?", "relevance": 0.42 }
  ]
}
```

<!-- Screenshot: Playground con respuesta y fuentes -->

### 3.7 Claims prohibidos y compliance

La categoría `PROHIBITED_CLAIM` es crítica para el compliance. Los claims definidos aquí se inyectan en el system prompt de la IA y **nunca** deben ser mencionados.

**Ejemplo de claim prohibido:**

```
Categoría: PROHIBITED_CLAIM
Título: Claims prohibidos
Contenido: Prohibido prometer ingresos garantizados, afirmar que los productos
           curan enfermedades, o presentar el negocio como una inversión financiera.
```

El motor de IA valida las respuestas contra esta lista antes de enviarlas al prospecto.

---

## 4. Distributors & AI Twins

### 4.1 Crear distribuidores

**Desde el panel de administración (Admin → Distribuidores):**

1. Haz clic en **Crear distribuidor**
2. Completa:
   - **Nombre** (requerido)
   - **Email** (requerido, único)
   - **Contraseña** (requerido, mínimo 6 caracteres)
   - **Presentación** (opcional, se genera una por defecto)
   - **Avatar URL** (opcional)
   - **Tono** (opcional, por defecto "cercano y profesional")
   - **WhatsApp** (opcional, enlace wa.me)
   - **Calendario URL** (opcional, enlace de Cal.com o Google Calendar)

**Ejemplo vía API:**

```
POST /api/distributors
{
  "name": "Juan Pérez",
  "email": "juan@empresa.demo",
  "password": "demo1234",
  "presentation": "Hola, soy Juan. Te acompaño a conocer esta oportunidad paso a paso.",
  "tone": "cercano y profesional",
  "whatsapp": "https://wa.me/5215512345678",
  "calendarUrl": "https://cal.com/juan-perez"
}
```

**Resultado:**

```json
{
  "item": {
    "id": "...",
    "name": "Juan Pérez",
    "slug": "juan-perez",
    "funnelUrl": "/f/juan-perez"
  }
}
```

### 4.2 Configurar AI Twin

Cada distribuidor tiene un **AI Twin** (gemelo IA) que hereda el cerebro central y se personaliza.

**Campos configurables:**

| Campo | Descripción | Ejemplo |
|---|---|---|
| `name` | Nombre del distribuidor (aparece en el chat) | "María González" |
| `avatarUrl` | URL de la foto de perfil | "https://..." |
| `tone` | Tono de la IA | "cercano y profesional" |
| `presentation` | Texto de introducción | "Hola, soy María. Ayudo a personas…" |
| `language` | Idioma principal | "es", "en", "pt" |
| `zone` | Zona geográfica | "América Latina" |
| `whatsapp` | Enlace a WhatsApp | "https://wa.me/5215533445566" |
| `calendarUrl` | Enlace de calendario | "https://cal.com/maria-gonzalez" |
| `socialLinks` | Redes sociales (JSON) | `{"instagram":"...", "facebook":"..."}` |
| `availability` | Disponibilidad (JSON) | `{"days":["L","M","X","J","V"], "hours":"09:00-19:00"}` |

**Desde el panel del distribuidor (Mi Twin):**

1. Ve a **Twin** en el menú lateral
2. Edita los campos deseados
3. Guarda cambios

**Ejemplo vía API:**

```
PUT /api/twin
{
  "name": "María González",
  "tone": "amigable y experto",
  "language": "es",
  "whatsapp": "https://wa.me/5215533445566",
  "socialLinks": {
    "instagram": "https://instagram.com/maria.gonzalez",
    "facebook": "https://facebook.com/maria.gonzalez"
  }
}
```

> **Nota:** Si cambias el nombre, el slug se regenera automáticamente (a menos que ya exista otro distribuidor con ese slug).

### 4.3 Variantes A/B

Las variantes permiten probar diferentes tonos, presentaciones y estilos para optimizar la conversión.

**Crear variantes (Admin → Distribuidores → Seleccionar distribuidor → Variantes):**

```
PUT /api/distributors/:id/variants
{
  "variants": [
    {
      "id": "formal",
      "name": "Tono formal",
      "tone": "profesional y directo",
      "presentation": "Bienvenido. Soy asesor comercial de Vida Nova.",
      "color": "#1e40af",
      "weight": 1
    },
    {
      "id": "casual",
      "name": "Tono casual",
      "tone": "amigable y relajado",
      "presentation": "¡Hola! Soy tu asesor personal 👋",
      "color": "#f59e0b",
      "weight": 1
    }
  ]
}
```

**Cómo funciona la asignación:**

1. El visitante llega al funnel público
2. Se le asigna una variante de forma **estable** (basada en localStorage)
3. La variante se registra en `Session.variant`
4. Los resultados se comparan en **Analítica → Variantes A/B**

<!-- Screenshot: Panel de variantes A/B -->

### 4.4 Funnel público de cada distribuidor

Cada distribuidor tiene su propio funnel público en `/f/:slug`.

**Ejemplo:** `http://localhost:5173/f/maria-gonzalez`

El funnel incluye:
- Widget de chat IA personalizado
- Nombre y avatar del distribuidor
- Tono y presentación configurados
- Enlaces a WhatsApp y calendario
- Asignación de variantes A/B (si están configuradas)

---

## 5. Leads & Conversaciones

### 5.1 Flujo del lead

El flujo completo de un lead sigue estas etapas:

```
TRÁFICO → PROSPECTO → CONVERSACIÓN → CALIFICACIÓN
```

**Detalle de cada etapa:**

| Etapa | Estado del Lead | Descripción |
|---|---|---|
| Tráfico | `NEW` | El lead entra al funnel público |
| Prospecto | `IN_CONVERSACIÓN` | Inicia una conversación con la IA |
| Conversación | `IN_CONVERSACIÓN` | La IA realiza preguntas de screening |
| Nutrición | `NUTRITION` | Score medio, se programan follow-ups |
| Handoff | `HANDOFF` | Alta intención, se transfiere a humano |
| Onboarding | `ONBOARDING` | Lead aceptado, checklist activo |
| Distribuidor | `DISTRIBUTOR` | Lead activado como nuevo distribuidor |
| Descalificado | `DISQUALIFIED` | No cumple criterios de elegibilidad |

### 5.2 Scoring en tiempo real

El scoring se actualiza en cada interacción del lead con la IA:

**Señales positivas (+2 puntos):**
- "me interesa", "quiero unirme", "cuánto cuesta", "siguiente paso", "estoy listo", "vamos"

**Señales negativas (-1 punto):**
- "no me interesa", "no gracias", "no puedo", "mal momento"

**Señales de descalificación (-6 puntos):**
- "tengo 17", "soy menor", "quiero enriquecerme rápido", "dinero fácil"

**Señales de objeción (0 puntos, se atienden sin castigar):**
- "muy caro", "no tengo tiempo", "es una estafa", "déjame pensarlo"

**Umbrales de clasificación (configurables):**

```json
{
  "thresholds": {
    "highIntent": 5,    // Puntuación para ALTA INTENCIÓN
    "nutrition": 2       // Puntuación para NUTRICIÓN
  }
}
```

### 5.3 Clasificación

**NO APTO** (`outcome: NO_APTO`):
- El lead no cumple criterios de elegibilidad (menor de edad, expectativas irrealistas)
- Se responde con un mensaje amable de despedida
- El lead sale del funnel

**NUTRICIÓN** (`outcome: NUTRICION`):
- El lead tiene interés pero no está listo para avanzar
- Se programan **follow-ups automáticos**
- La IA sigue nutriendo con contenido relevante

**ALTA INTENCIÓN** (`outcome: ALTA_INTENCION`):
- El lead ha superado el umbral de scoring
- Se activa el **handoff humano**
- Se comparten los enlaces de WhatsApp y calendario
- El distribuidor recibe una notificación

### 5.4 Manejo de objeciones

La IA detecta objeciones y responde con contenido específico de la categoría `OBJECTION` del cerebro:

**Tipos de objeciones soportadas:**

| Tipo | Ejemplos | Respuesta |
|---|---|---|
| Precio | "muy caro", "costoso", "precio alto" | Información sobre valor y plan de pago |
| Tiempo | "no tengo tiempo", "poco tiempo" | Flexibilidad y modelado de otros distribuidores |
| Confianza | "es una estafa", "parece estafa", "desconfío" | Garantías, políticas y transparencia |
| Indecisión | "déjame pensarlo", "tengo dudas" | Validación y acompañamiento sin presión |

**Flujo de manejo:**

1. La IA reconoce la señal de objeción
2. Busca el ítem `OBJECTION` más relevante en el cerebro (RAG)
3. Responde validando la preocupación del prospecto
4. **No** avanza la pregunta de screening en ese turno
5. **No** empuja a nutrición prematuramente

### 5.5 Memoria multi-turno

Cuando un lead que ya pasó el funnel vuelve a escribir, la IA:

1. Recupera el **historial completo** de la conversación
2. Utiliza **RAG** para responder dudas con contexto
3. **Solo re-escala a handoff** si el lead vuelve con intención clara y datos de contacto
4. **No** repite el guión de screening desde el inicio

**Cierre y despedidas:**
- La IA detecta señales de despedida ("adiós", "hasta luego", "nos vemos")
- Responde con calidez sin avanzar screening ni descalificar

**Enlaces:**
- Si el prospecto comparte una URL, la IA reconoce que no puede abrirla
- Invita a contar qué encontraron, sin interrumpir la conversación

**Detección de idioma:**
- Detección ligera es/en/pt por palabras funcionales
- Los mensajes sin respuesta de RAG se devuelven en el idioma del prospecto

---

## 6. Funnels Públicos

### 6.1 Compartir funnel

Cada distribuidor tiene un funnel público único en:

```
/f/:slug
```

**Ejemplo:** `http://localhost:5173/f/maria-gonzalez`

El funnel es una página web con:
- Diseño claro y atractivo
- Widget de chat IA integrado
- Información del distribuidor (nombre, avatar)
- Enlaces a WhatsApp y calendario

### 6.2 Widget de chat IA

El widget de chat es el componente principal del funnel. Incluye:

- **Saludo personalizado** con el nombre del AI Twin
- **Preguntas de screening** secuenciales
- **Scoring en tiempo real** visible para el sistema
- **Respuestas basadas en RAG** del cerebro central
- **Manejo de objeciones** automático
- **Detección de idioma** (es/en/pt)

### 6.3 Captura automática de leads

El sistema captura automáticamente:

- **Nombre** del prospecto (detectado en el mensaje)
- **Email** (extraído del texto cuando lo comparte)
- **Teléfono** (extraído del texto cuando lo comparte)
- **Fuente** (`funnel`, `whatsapp`, `referral`, `calcom`, etc.)
- **Score** acumulado
- **Estado** del lead
- **Conversación completa** (mensajes USER y AI)

**Creación automática de lead:**

El lead se crea cuando escribe su primer mensaje al funnel. Los datos de contacto se actualizan progresivamente a medida que los comparte en la conversación.

---

## 7. Seguimiento (Follow-ups)

### 7.1 Secuencias automáticas

Las secuencias de follow-up se configuran en **Admin → Secuencias**:

**Crear una secuencia:**

```
POST /api/org/sequences
{
  "name": "Secuencia NUTRICIÓN",
  "trigger": "NUTRICION",
  "steps": [
    {
      "delayDays": 1,
      "title": "Primer contacto",
      "content": "Hola {name}, soy {twin}. Quería continuar nuestra conversación."
    },
    {
      "delayDays": 3,
      "title": "Recurso educativo",
      "content": "Hola {name}, te comparto el material de formación inicial."
    },
    {
      "delayDays": 6,
      "title": "Recordatorio",
      "content": "Hola {name}, en unos días cerramos el grupo de nuevas incorporaciones."
    }
  ],
  "active": true
}
```

**Variables disponibles:**
- `{name}` — Nombre del lead
- `{twin}` — Nombre del AI Twin del distribuidor

### 7.2 Programación automática

Cuando un lead clasifica como `NUTRICIÓN`, el sistema automáticamente:

1. Busca la secuencia activa con trigger `NUTRICION`
2. Crea los follow-ups con las fechas de envío calculadas
3. Los programa en el scheduler interno

**Ejemplo de follow-ups generados:**

| Paso | Días | Título | Estado |
|---|---|---|---|
| 0 | +1 | Primer contacto | SENT |
| 1 | +3 | Recurso educativo | PENDING |
| 2 | +6 | Recordatorio | PENDING |

### 7.3 Email follow-ups

Si tienes configurado SMTP, los follow-ups se envían automáticamente por email:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña
```

Si no hay SMTP configurado, los follow-ups se registran en el log (modo demo).

### 7.4 Re-engagement inteligente

Cuando un lead responde a un follow-up:

1. La respuesta entra por el mismo motor de IA
2. Se procesa con el **historial completo** + RAG
3. Se actualiza el scoring acumulado
4. Si la respuesta indica alta intención → se activa handoff
5. Si la respuesta es negativa → se marca como descalificado

### 7.5 Gestión de follow-ups

**Desde el panel:**

1. Ve a **Follow-ups** en el menú lateral
2. Filtra por estado (`PENDING`, `SENT`, `CANCELLED`) o por lead
3. Marca follow-ups como enviados o cancelados

**Vía API:**

```
PATCH /api/followups/:id
{
  "status": "SENT"
}
```

---

## 8. Onboarding & Duplicación

### 8.1 Aceptar handoff

Cuando un lead alcanza **ALTA INTENCIÓN**, el sistema activa el handoff:

1. La IA comparte los enlaces de WhatsApp y calendario
2. El distribuidor recibe una notificación
3. El lead pasa al estado `HANDOFF`

**Para aceptar el handoff (Admin o Distribuidor):**

1. Ve a **Leads** → abre el lead
2. Haz clic en **Aceptar handoff**
3. El lead pasa a estado `ONBOARDING`

**Vía API:**

```
POST /api/leads/:id/accept-handoff
```

**Resultado:** Se crea el checklist de onboarding y el lead pasa a ONBOARDING.

### 8.2 Checklist de onboarding

El checklist por defecto incluye:

1. Confirmar datos de contacto
2. Revisar y aceptar el código de conducta
3. Ver material de capacitación inicial
4. Configurar su perfil público y enlaces
5. Primer contacto con su mentor
6. Activar su AI Twin y recibir su funnel

**Personalizar el checklist:**

```json
// En settings de la organización
{
  "onboardingChecklist": [
    "Confirmar datos de contacto",
    "Revisar y aceptar el código de conducta",
    "Ver material de capacitación inicial",
    "Configurar su perfil público y enlaces",
    "Primer contacto con su mentor",
    "Activar su AI Twin y recibir su funnel"
  ]
}
```

**Gestionar tareas:**

- Marcar tarea como completada: `PATCH /api/leads/:leadId/tasks/:taskId`
- Las tareas se muestran en el detalle del lead

### 8.3 Activar como distribuidor

Una vez completado el checklist (todas las tareas marcadas), el lead se puede activar:

1. Ve al lead → **Activar como distribuidor**
2. Completa:
   - **Nombre** (por defecto el nombre del lead)
   - **Email** (por defecto el email del lead)
   - **Contraseña** (por defecto `demo1234`)
3. Confirma la activación

**Vía API:**

```
POST /api/leads/:id/activate
{
  "name": "Carlos Mendoza",
  "email": "carlos@nuevo-distribuidor.demo",
  "password": "demo1234"
}
```

**Lo que sucede al activar:**

1. Se crea un nuevo **usuario** con rol `DISTRIBUTOR`
2. Se crea un nuevo **AI Twin** con su funnel público `/f/nuevo-slug`
3. Se actualiza el lead a estado `DISTRIBUTOR`
4. Se asigna el **patrocinador** (distribuidor original)
5. Se pagan **comisiones** a 3 niveles
6. Se envía **email de bienvenida** con credenciales
7. Se crean **notificaciones** para el admin y el patrocinador
8. Se dispara el evento `distributor.activated`

### 8.4 El ciclo de duplicación

La duplicación es el corazón del crecimiento exponencial:

```
Lead activado → Nuevo distribuidor → Nuevo AI Twin → Nuevo funnel
       ↓
Nuevos leads atraídos por el nuevo funnel
       ↓
Proceso de calificación y onboarding
       ↓
Más distribuidores activados
       ↓
El ciclo se replica solo
```

**Cada nuevo distribuidor:**
- Recibe su propio AI Twin con el cerebro heredado
- Tiene su funnel público personalizado
- Puede configurar su tono, avatar y enlaces
- Atrae sus propios leads
- Genera comisiones para su patrocinador y la red

---

## 9. Integraciones

### 9.1 WhatsApp (Twilio / Meta)

**Configuración desde el panel (Admin → Webhooks):**

1. Selecciona el proveedor: **Twilio** o **Meta WhatsApp Cloud API**
2. Configura las credenciales
3. Apunta el webhook: `POST /api/webhooks/{orgSlug}/whatsapp`
4. Verifica la conexión con el simulador

**Twilio:**

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+14155238886
```

**Meta WhatsApp Cloud API (configuración por canal):**

```json
{
  "whatsapp": {
    "provider": "meta",
    "metaToken": "tu-token-de-meta",
    "metaPhoneNumberId": "tu-phone-number-id",
    "metaVerifyToken": "tu-token-de-verificacion",
    "webhookSecret": "tu-secreto-webhook"
  }
}
```

**Verificación de firmas:**

- **Twilio:** `X-Twilio-Signature` (HMAC-SHA1 base64)
- **Meta:** `X-Hub-Signature-256` (HMAC-SHA256)
- **Meta GET:** Verificación de `hub.challenge` para el registro del webhook

**Simulador:**

Desde el panel puedes simular mensajes entrantes de WhatsApp:

```
POST /api/webhooks/simulate/:orgSlug/whatsapp
{
  "from": "+5215512345678",
  "text": "Hola, quiero información sobre la oportunidad",
  "distributorSlug": "maria-gonzalez"
}
```

### 9.2 Cal.com / Google Calendar

**Configuración:**

```json
{
  "calcom": {
    "apiKey": "tu-api-key-de-calcom",
    "distributorSlug": "distribuidor-por-defecto",
    "webhookSecret": "tu-secreto"
  }
}
```

**Webhook de Cal.com:**

```
POST /api/webhooks/:orgSlug/calcom
```

Cuando se crea una reserva en Cal.com:
1. Se verifica la firma `X-Cal-Signature-256`
2. Se crea o actualiza el lead con el email del invitado
3. Se mueve el lead a `ONBOARDING` con outcome `AGENDADA`
4. Se crea el checklist de onboarding
5. Se notifica al distribuidor

**Generar archivo .ics:**

```
GET /api/leads/:id/calendar
```

Descarga un archivo `.ics` para importar en cualquier calendario.

### 9.3 Slack

**Configuración:**

```json
{
  "channels": {
    "slackWebhookUrl": "https://hooks.slack.com/services/..."
  }
}
```

El sistema envía notificaciones a Slack para eventos:
- `lead.created`
- `lead.handoff`
- `lead.onboarding`

### 9.4 HubSpot CRM

El sistema incluye un adaptador base para HubSpot que puede extenderse según las necesidades de integración.

### 9.5 Zapier (webhooks salientes)

**Configuración:**

```json
{
  "channels": {
    "zapierWebhookUrl": "https://hooks.zapier.com/hooks/catch/..."
  }
}
```

Los eventos disponibles para Zapier:
- `lead.created`
- `lead.handoff`
- `lead.onboarding`

**Formato del payload:**

```json
{
  "event": "lead.created",
  "org": { "id": "...", "slug": "vida-nova", "name": "Vida Nova" },
  "payload": { "leadId": "...", "name": "...", "email": "..." },
  "sentAt": "2026-01-15T10:00:00.000Z"
}
```

### 9.6 Stripe (pagos)

**Configuración:**

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Webhook de Stripe:**

```
POST /api/billing/webhook
```

**Eventos procesados:**

| Evento | Acción |
|---|---|
| `checkout.session.completed` | Activa el plan, crea factura, notifica |
| `invoice.payment_failed` | Marca estado PAST_DUE, notifica |
| `customer.subscription.deleted` | Degradación a TRIAL |

**Verificación de firma:**

El webhook verifica `Stripe-Signature` usando HMAC-SHA256 con timestamp y body raw.

### 9.7 Webhooks genéricos

**Configurar webhooks de salida (Admin → Webhooks de salida):**

```
PUT /api/org/outgoing-webhooks
{
  "webhooks": [
    {
      "id": "mi-webhook",
      "label": "Mi sistema CRM",
      "url": "https://mi-crm.com/webhook",
      "secret": "mi-secreto-hmac",
      "events": ["lead.created", "lead.handoff", "distributor.activated"],
      "enabled": true
    }
  ]
}
```

**Eventos disponibles:**

- `lead.created` — Nuevo lead creado
- `lead.handoff` — Lead en alta intención
- `lead.onboarding` — Lead en proceso de onboarding
- `distributor.activated` — Distribuidor activado
- `commission.paid` — Comisión pagada
- `lead.escalated` — Lead escalado por SLA

**Firma HMAC-SHA256:**

Cada webhook incluye los headers:

```
X-NAIO-Event: lead.created
X-NAIO-Delivery: wh_abc123
X-NAIO-Signature: <hmac-sha256(secret, body)>
```

**Probar webhook:**

```
POST /api/org/outgoing-webhooks/test
{ "id": "mi-webhook" }
```

---

## 10. Analítica

### 10.1 Dashboard ejecutivo

El panel ejecutivo (`GET /api/analytics/executive`) agrega todas las métricas en una sola llamada:

- **Overview:** Totales, tasas de conversión, scores promedio
- **Velocidad:** Tiempos del funnel (captura → handoff → activación)
- **Canales:** Conversión por fuente de tráfico
- **Cohortes:** Progresión semanal de leads

**Vista general (Overview):**

| Métrica | Descripción |
|---|---|
| `total` | Total de leads |
| `inConversation` | Leads en conversación activa |
| `high` | Leads con alta intención |
| `nutrition` | Leads en nutrición |
| `disqualified` | Leads descalificados |
| `onboarded` | Leads activados como distribuidores |
| `toHandoff` | Leads en handoff o onboarding |
| `conversations` | Total de conversaciones |
| `pendingFollowups` | Follow-ups pendientes (próximas 24h) |
| `avgScore` | Score promedio |
| `conversion` | Tasa de conversión (handoff + onboarded / total) |

<!-- Screenshot: Dashboard de analítica -->

### 10.2 Velocidad del funnel

**Endpoint:** `GET /api/analytics/velocity`

| Métrica | Descripción |
|---|---|
| `avgTimeToHandoffH` | Tiempo medio de captura a handoff (horas) |
| `medianTimeToHandoffH` | Tiempo mediana de captura a handoff |
| `avgHandoffToActivationH` | Tiempo medio de respuesta del distribuidor |
| `medianHandoffToActivationH` | Tiempo mediana de respuesta |
| `handoffSlaHours` | Horas de SLA configuradas |
| `handoffsResolved` | Handoffs resueltos |
| `handoffsResolvedWithinSla` | Handoffs dentro del SLA |
| `handoffsSlaCompliance` | % de cumplimiento de SLA |
| `handoffsPending` | Handoffs pendientes |
| `avgAiReplyMs` | Latencia promedio del motor IA (ms) |

### 10.3 Conversión por canal

**Endpoint:** `GET /api/analytics/sources`

```json
{
  "items": [
    {
      "source": "funnel",
      "total": 150,
      "highIntent": 45,
      "onboarded": 12,
      "disqualified": 30,
      "conversionRate": 8,
      "highRate": 30,
      "avgScore": 4.2
    },
    {
      "source": "whatsapp",
      "total": 80,
      "highIntent": 25,
      "onboarded": 8,
      "disqualified": 15,
      "conversionRate": 10,
      "highRate": 31,
      "avgScore": 4.5
    }
  ]
}
```

### 10.4 Cohortes semanales

**Endpoint:** `GET /api/analytics/cohorts`

Muestra la progresión de leads por semana de captura:

```json
{
  "cohorts": [
    {
      "week": "2026-01-06",
      "label": "06/01",
      "created": 25,
      "high": 8,
      "onboarded": 3,
      "highRate": 32,
      "onboardRate": 12
    }
  ]
}
```

### 10.5 Exportar datos

**Tipos de exportación disponibles:**

| Tipo | Contenido |
|---|---|
| `leads` | Todos los leads (con filtros: status, source, from, to) |
| `brain` | Ítems del cerebro |
| `distributors` | Distribuidores |
| `commissions` | Comisiones |
| `followups` | Follow-ups |
| `sessions` | Sesiones de conversación |
| `analytics` | Métricas agregadas |

**Formatos:** `csv` (con BOM para Excel) o `json`

**Ejemplo:**

```
GET /api/export/leads?format=csv&from=2026-01-01&to=2026-01-31
GET /api/export/analytics?format=json
```

---

## 11. Red (Downline)

### 11.1 Árbol de patrocinio

Cada distribuidor tiene un patrocinador (`sponsorId`). Al activar un lead, se asigna automáticamente como hijo del distribuidor que lo atrajo.

**Ver el árbol de red:**

**Admin:** Ve la red completa de la organización
**Distribuidor:** Ve solo su subárbol

**Endpoint:** `GET /api/downline/tree`

```json
{
  "tree": [
    {
      "id": "...",
      "name": "María González",
      "slug": "maria-gonzalez",
      "level": "SILVER",
      "points": 430,
      "depth": 0,
      "children": [
        {
          "id": "...",
          "name": "Juan Pérez",
          "slug": "juan-perez",
          "level": "SILVER",
          "points": 430,
          "depth": 1,
          "children": [
            {
              "id": "...",
              "name": "Pedro Salas",
              "slug": "pedro-salas",
              "level": "BRONZE",
              "points": 170,
              "depth": 2,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

### 11.2 Compensación multinivel

**Configuración por defecto:**

```json
{
  "compensation": {
    "direct": 15,    // 15% para el patrocinador directo
    "level1": 5,     // 5% para el nivel 1 (patrocinador del patrocinador)
    "level2": 2,     // 2% para el nivel 2
    "base": 100      // Monto base para el cálculo
  }
}
```

**Cálculo de comisiones:**

Cuando se activa un lead (se convierte en distribuidor):

1. **Nivel DIRECT:** Patrocinador directo recibe `(base × direct%) / 100`
2. **Nivel LEVEL1:** Patrocinador del patrocinador recibe `(base × level1%) / 100`
3. **Nivel LEVEL2:** Abuelo del distribuidor recibe `(base × level2%) / 100`

**Ejemplo con base $100:**

| Nivel | Porcentaje | Monto |
|---|---|---|
| DIRECT | 15% | $15.00 |
| LEVEL1 | 5% | $5.00 |
| LEVEL2 | 2% | $2.00 |

**Puntos por nivel:**

| Nivel | Puntos |
|---|---|
| DIRECT | +100 puntos |
| LEVEL1 | +50 puntos |
| LEVEL2 | +25 puntos |

### 11.3 Gamificación (puntos, niveles, badges)

**Niveles por puntos:**

| Nivel | Puntos mínimos |
|---|---|
| PLATINUM | 800 |
| GOLD | 300 |
| SILVER | 150 |
| BRONZE | 0 |

**Badges disponibles:**

| Badge | Requisito |
|---|---|
| `networker` | Al menos 1 distribuidor en tu red directa |
| `team-builder` | 5 o más distribuidores en tu red directa |
| `primer-lead` | Al menos 1 lead activado |
| `activador-pro` | 5 o más leads activados |
| `conversador` | 20 o más conversaciones |

**Notificaciones de gamificación:**

Cuando un distribuidor gana puntos o badges, recibe una notificación:

```json
{
  "type": "gamification",
  "title": "+100 puntos ⭐",
  "body": "Juan Pérez se unió a tu red.",
  "link": "/app/downline"
}
```

**Resumen del panel de red (Admin):**

```
GET /api/downline/overview
```

- Distribuidores y sus niveles
- Total de activaciones
- Total de comisiones pagadas
- Leaderboard (top 10 por puntos)

**Resumen del panel de red (Distribuidor):**

- Estadísticas del equipo (directos, tamaño total, activaciones)
- Comisiones recientes
- Balance de comisiones

---

## 12. Configuración Avanzada

### 12.1 Organización y settings

**Ver configuración (Admin):**

```
GET /api/org
```

**Actualizar configuración:**

```
PUT /api/org
{
  "name": "Vida Nova",
  "logoUrl": "https://...",
  "primaryColor": "#6d28d9",
  "settings": {
    "thresholds": { "highIntent": 5, "nutrition": 2 },
    "slaHours": 24,
    "onboardingChecklist": ["...", "..."],
    "funnelSteps": ["TRÁFICO", "INFORMADO", "COMPATIBLE", "ALTA INTENCIÓN", "ONBOARDING", "ACTIVADO"],
    "compensation": { "direct": 15, "level1": 5, "level2": 2, "base": 100 }
  }
}
```

**Campos de settings:**

| Campo | Tipo | Descripción |
|---|---|---|
| `thresholds.highIntent` | number | Score para clasificar como ALTA INTENCIÓN |
| `thresholds.nutrition` | number | Score para clasificar como NUTRICIÓN |
| `slaHours` | number | Horas de SLA para handoff (default: 24) |
| `onboardingChecklist` | string[] | Tareas del checklist de onboarding |
| `funnelSteps` | string[] | Etapas visibles del funnel |
| `compensation` | object | Configuración de comisiones |
| `channels` | object | Configuración de canales (WhatsApp, Cal.com, Slack, Zapier) |
| `outgoingWebhooks` | array | Webhooks de salida configurados |

### 12.2 Billing y planes

**Planes disponibles:**

| Plan | Precio | Distribuidores | Leads/mes | Brain items | API Keys |
|---|---|---|---|---|---|
| TRIAL | $0 | 1 | 25 | 50 | 1 |
| STARTER | $29 | 2 | 50 | 100 | 3 |
| GROWTH | $99 | 15 | 1.000 | 1.000 | 10 |
| SCALE | $299 | Ilimitado | Ilimitado | Ilimitado | Ilimitado |

**Cambiar de plan:**

```
POST /api/billing/checkout
{ "planId": "GROWTH" }
```

- Con `STRIPE_SECRET_KEY` → Redirige a Stripe Checkout
- Sin clave → Factura simulada (demo)

**Límites del plan:**

Al intentar crear un recurso sobre el límite del plan, el sistema retorna **HTTP 402**:

```json
{
  "error": "Límite del plan GROWTH alcanzado: distributors (15/15). Actualiza tu plan para continuar."
}
```

**Caducidad de plan:**

El scheduler verifica automáticamente los planes vencidos y los degrada a TRIAL.

### 12.3 API Keys

**Gestionar API Keys (Admin → API Keys):**

**Crear clave:**

```
POST /api/keys
{
  "name": "Integración CRM",
  "scopes": ["leads:read", "analytics:read", "brain:read"]
}
```

**Scopes disponibles:**

| Scope | Acceso |
|---|---|
| `leads:read` | Leer leads |
| `analytics:read` | Leer analítica |
| `brain:read` | Leer cerebro |

**Revocar clave:**

```
PATCH /api/keys/:id/revoke
```

**Eliminar clave:**

```
DELETE /api/keys/:id
```

### 12.4 Equipo y roles

**Gestionar equipo (Admin → Equipo):**

| Rol | Permisos |
|---|---|
| `PLATFORM` | Acceso total a toda la plataforma |
| `ADMIN` | Gestión completa de la organización |
| `MANAGER` | Lectura + gestión de leads y analítica |
| `DISTRIBUTOR` | Solo sus propios leads, twin y funnel |

**Invitar miembro:**

```
POST /api/team/invite
{
  "email": "nuevo@empresa.demo",
  "name": "Nuevo Miembro",
  "role": "MANAGER",
  "password": "temporal123"
}
```

**Cambiar rol:**

```
PATCH /api/team/:id
{ "role": "ADMIN" }
```

**Desactivar/Eliminar miembro:**

```
DELETE /api/team/:id
```

> **Protecciones:** No puedes eliminar el último admin ni desactivarte a ti mismo.

### 12.5 Auditoría

**Ver registro de auditoría (Admin → Auditoría):**

```
GET /api/audit?page=1&pageSize=50&action=auth.login
```

**Eventos registrados:**

- `auth.login` / `auth.login_failed` / `auth.refresh` / `auth.logout`
- `org.signup` / `org.settings_update`
- `team.invite` / `team.update` / `team.delete`
- `brain.create` / `brain.test` / `brain.import`
- `leads.import` / `lead.activate`
- `billing.plan_change` / `billing.payment_received`
- `keys.create` / `keys.delete`
- `export.run`
- `webhook.test`

### 12.6 Webhooks de salida

**Configurar (Admin → Webhooks de salida):**

```
PUT /api/org/outgoing-webhooks
{
  "webhooks": [
    {
      "id": "crm-sync",
      "label": "Sincronizar con CRM",
      "url": "https://mi-crm.com/api/webhook",
      "secret": "secreto-hmac-sha256",
      "events": ["lead.created", "lead.handoff", "distributor.activated"],
      "enabled": true
    }
  ]
}
```

**Verificar entregas:**

```
GET /api/org/webhook-logs?page=1&pageSize=30&provider=outgoing.lead.created
```

---

## 13. API Pública

### 13.1 Autenticación con API keys

Todas las peticiones a `/api/v1` requieren el header:

```
X-API-Key: naio_tu-org_tu-clave
```

**Formato de la clave:** `naio_<org_slug>_<hash-aleatorio>`

### 13.2 Endpoints disponibles

| Endpoint | Método | Scope | Descripción |
|---|---|---|---|
| `/api/v1/leads` | GET | `leads:read` | Lista de leads (paginada, con filtros) |
| `/api/v1/leads/:id` | GET | `leads:read` | Detalle de un lead |
| `/api/v1/analytics` | GET | `analytics:read` | Métricas agregadas |
| `/api/v1/brain` | GET | `brain:read` | Ítems del cerebro activos |

**Ejemplo de petición:**

```bash
curl -H "X-API-Key: naio_vida-nova_tu-clave" \
  http://localhost:4000/api/v1/leads?page=1&pageSize=20&status=HANDOFF
```

**Respuesta:**

```json
{
  "items": [...],
  "total": 45,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

**Documentación Swagger:**

- **UI:** `GET /api/docs`
- **Spec OpenAPI:** `GET /api/v1/openapi.json`

### 13.3 Rate limiting

- **Límite:** 60 peticiones por minuto por API key
- **Headers de respuesta:**
  - `X-RateLimit-Remaining`: Peticiones restantes
  - `X-RateLimit-Reset`: Segundos hasta el reset

**Respuesta cuando se supera el límite:**

```json
{
  "error": "Rate limit superado. Máximo 60 peticiones/min."
}
```

HTTP Status: `429 Too Many Requests`

---

## 14. Seguridad

### 14.1 Multi-tenancy

- Cada registro (`User`, `Lead`, `Session`, `Message`, `BrainItem`, `Distributor`) lleva `orgId`
- **Toda** query del API se filtra por `orgId` del token JWT (middleware obligatorio)
- No existe ruta que devuelva datos de otra organización
- Verificado con suite de tests automatizados

### 14.2 JWT + Refresh tokens

**Access Token:**
- Duración: 15 minutos
- Contiene: `sub` (userId), `orgId`, `role`, `name`
- Algoritmo: HS256

**Refresh Token:**
- Duración: 14 días
- Almacenamiento: hash SHA-256 en BD
- **Rotativo:** cada uso genera un nuevo refresh token
- **Revocable:** `POST /api/auth/logout` revoca el token actual

**Flujo de renovación automática:**

1. El frontend recibe HTTP 401
2. Envía `POST /api/auth/refresh` con el refreshToken
3. Recibe nuevo accessToken + refreshToken
4. Reintenta la petición original

### 14.3 Claims prohibidos

Los claims prohibidos se inyectan en el system prompt de la IA en cada conversación:

```
CLAIMS PROHIBIDOS (nunca los hagas):
- Claims prohibidos: Prohibido prometer ingresos garantizados, afirmar que
  los productos curan enfermedades, o presentar el negocio como una inversión financiera.
```

### 14.4 Hardening

- **Helmet:** Cabeceras de seguridad HTTP
- **Rate-limiting:** Global en `/api` y específico en login
- **Body limit:** `express.json({ limit })` para prevenir payloads grandes
- **Sin x-powered-by:** Eliminado en producción
- **404/Error handlers:** Manegadores personalizados
- **Passwords:** bcryptjs con salt
- **.env ignorado:** No hay secretos en el repositorio

---

## 15. Despliegue

### 15.1 Docker local

**Requisitos:** Docker y Docker Compose instalados.

```bash
cd C:\network-ai-os
docker compose up --build
```

**Servicios:**

| Servicio | Puerto | Descripción |
|---|---|---|
| API | `:4000` | Backend Express + Prisma |
| Web | `:8080` | Frontend React (nginx) |

**Volumen:** SQLite persistido en `./data`

### 15.2 Railway / Vercel

**Railway (API):**

1. Crea un proyecto en [railway.app](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Agrega un servicio **PostgreSQL**
4. Configura las variables de entorno:

```
DATABASE_URL=<url-de-railway-postgres>
JWT_SECRET=<clave-secreta-larga>
OPENAI_API_KEY=<tu-clave-opcional>
STRIPE_SECRET_KEY=<tu-clave-opcional>
CORS_ORIGIN=<url-del-frontend>
```

5. Railway despliega automáticamente al hacer push a `main`

**Vercel (Web):**

1. Crea un proyecto en [vercel.com](https://vercel.com)
2. Conecta tu repositorio
3. Configura la variable de entorno:

```
VITE_API_URL=https://tu-api.up.railway.app
```

4. Despliega

### 15.3 Variables de entorno

**API (`apps/api/.env`):**

```env
# Base de datos
DATABASE_URL=file:./dev.db

# JWT
JWT_SECRET=cambia-esto-por-una-clave-larga-y-aleatoria

# URLs
APP_URL=http://localhost:8080
CORS_ORIGIN=http://localhost:8080

# Motor de IA (opcional)
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Stripe (opcional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Twilio / WhatsApp (opcional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=+14155238886

# Email SMTP (opcional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

**Web (`apps/web/.env`):**

```env
VITE_API_URL=http://localhost:4000
```

**Docker Compose (`.env` en raíz):**

```env
NODE_ENV=production
JWT_SECRET=cambia-esto-por-una-clave-larga-y-aleatoria
APP_URL=http://localhost:8080
CORS_ORIGIN=http://localhost:8080
VITE_API_URL=http://localhost:4000
```

---

## Apéndice A: Endpoints de la API

### Auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/refresh` | Renovar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Usuario actual |
| POST | `/api/auth/signup` | Registro self-serve |

### Brain (Admin)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/brain` | Listar ítems (paginado, filtros) |
| POST | `/api/brain` | Crear ítem |
| PATCH | `/api/brain/:id` | Actualizar ítem |
| DELETE | `/api/brain/:id` | Eliminar ítem |
| GET | `/api/brain/categories` | Categorías disponibles |
| POST | `/api/brain/import` | Importar CSV |
| POST | `/api/brain/test` | Playground IA |

### Organization (Admin)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/org` | Info de la organización |
| PUT | `/api/org` | Actualizar settings |
| GET | `/api/org/sequences` | Listar secuencias |
| POST | `/api/org/sequences` | Crear secuencia |
| PATCH | `/api/org/sequences/:id` | Actualizar secuencia |
| DELETE | `/api/org/sequences/:id` | Eliminar secuencia |
| GET | `/api/org/outgoing-webhooks` | Webhooks de salida |
| PUT | `/api/org/outgoing-webhooks` | Configurar webhooks |
| POST | `/api/org/outgoing-webhooks/test` | Probar webhook |
| GET | `/api/org/webhook-logs` | Log de entregas |

### Distributors

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/twin` | Mi AI Twin |
| PUT | `/api/twin` | Actualizar mi Twin |
| GET | `/api/distributors` | Listar (admin) |
| POST | `/api/distributors` | Crear (admin) |
| PATCH | `/api/distributors/:id` | Actualizar (admin) |
| PUT | `/api/distributors/:id/variants` | Variantes A/B |

### Leads

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/leads` | Listar (paginado, filtros) |
| POST | `/api/leads/import` | Importar CSV |
| GET | `/api/leads/conversations` | Conversaciones |
| GET | `/api/leads/:id` | Detalle del lead |
| PATCH | `/api/leads/:id` | Actualizar estado |
| POST | `/api/leads/:id/accept-handoff` | Aceptar handoff |
| POST | `/api/leads/:id/activate` | Activar como distribuidor |
| GET | `/api/leads/:id/calendar` | Descargar .ics |
| PATCH | `/api/leads/:leadId/tasks/:taskId` | Toggle tarea onboarding |

### Follow-ups

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/followups` | Listar (paginado, filtros) |
| PATCH | `/api/followups/:id` | Marcar estado |

### Analytics

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/analytics/overview` | Vista general |
| GET | `/api/analytics/funnel` | Funnel de conversión |
| GET | `/api/analytics/timeseries` | Serie temporal (14 días) |
| GET | `/api/analytics/score-distribution` | Distribución de scores |
| GET | `/api/analytics/distributors` | Por distribuidor |
| GET | `/api/analytics/variants` | Comparativa A/B |
| GET | `/api/analytics/velocity` | Velocidad del funnel |
| GET | `/api/analytics/sources` | Conversión por canal |
| GET | `/api/analytics/cohorts` | Cohortes semanales |
| GET | `/api/analytics/executive` | Panel ejecutivo |

### Webhooks (públicos)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/webhooks/:orgSlug/whatsapp` | Verificación Meta |
| POST | `/api/webhooks/:orgSlug/whatsapp` | Mensaje WhatsApp |
| POST | `/api/webhooks/:orgSlug/generic` | Webhook genérico |
| POST | `/api/webhooks/:orgSlug/calcom` | Booking Cal.com |
| POST | `/api/webhooks/simulate/:orgSlug/:channel` | Simulador |

### Downline

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/downline/overview` | Resumen de red |
| GET | `/api/downline/tree` | Árbol de patrocinio |

### Billing

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/billing` | Estado de facturación |
| GET | `/api/billing/plans` | Planes disponibles |
| POST | `/api/billing/checkout` | Crear checkout |
| POST | `/api/billing/webhook` | Webhook de Stripe (público) |

### Team

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/team` | Listar miembros |
| POST | `/api/team/invite` | Invitar miembro |
| PATCH | `/api/team/:id` | Actualizar rol |
| DELETE | `/api/team/:id` | Eliminar miembro |

### Audit

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/audit` | Registro de auditoría (paginado) |

### Keys

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/keys` | Listar API keys |
| POST | `/api/keys` | Crear API key |
| PATCH | `/api/keys/:id/revoke` | Revocar key |
| DELETE | `/api/keys/:id` | Eliminar key |

### Notifications

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/notifications` | Listar (paginado, `unreadOnly`) |
| POST | `/api/notifications/:id/read` | Marcar como leída |
| POST | `/api/notifications/read-all` | Marcar todas como leídas |

### Export

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/export/:type` | Exportar leads, brain, etc. (format: csv\|json) |

### Public (Funnels)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/public/f/:slug` | Variantes del funnel |
| POST | `/api/public/f/:slug/chat` | Chat IA del funnel |

### API Pública (v1)

| Método | Ruta | Scope | Descripción |
|---|---|---|---|
| GET | `/api/v1/leads` | `leads:read` | Leads paginados |
| GET | `/api/v1/leads/:id` | `leads:read` | Detalle lead |
| GET | `/api/v1/analytics` | `analytics:read` | Métricas |
| GET | `/api/v1/brain` | `brain:read` | Cerebro activo |

---

## Apéndice B: Cuentas Demo

| Rol | Email | Password |
|---|---|---|
| Admin (Vida Nova) | `admin@vida-nova.demo` | `demo1234` |
| Distribuidor (María González) | `distributor@vida-nova.demo` | `demo1234` |
| Distribuidor (Juan Pérez) | `juan@vida-nova.demo` | `demo1234` |
| Distribuidor (Pedro Salas) | `pedro@vida-nova.demo` | `demo1234` |
| Distribuidor (Lucía Romero) | `lucia@vida-nova.demo` | `demo1234` |
| Distribuidor (Andrés Lima) | `andres@vida-nova.demo` | `demo1234` |

**Funnel público demo:** `http://localhost:5173/f/maria-gonzalez`

---

## Apéndice C: Prueba el Ciclo Completo

1. Entra al **funnel público** (`/f/maria-gonzalez`) y conversa con la IA
2. Dile tu nombre, que tienes >18, tu motivación, tu disponibilidad y un email
3. Verás el scoring en vivo y, al alcanzar **alta intención**, el handoff con WhatsApp + calendario
4. Entra como **admin** → *Leads* → abre ese lead → *Aceptar handoff* → completa el checklist → *Activar como distribuidor*
5. El nuevo distribuidor aparece en *Onboarding* con su **propio funnel** `/f/su-slug` y su AI Twin
6. Revisa **Red** → el nuevo distribuidor quedó patrocinado y se pagaron **comisiones** a 3 niveles
7. En *Distribuidores* (admin) prueba **A/B**: crea variantes de tono, abre el funnel público y mira la comparativa en *Analítica*
8. En *Simulador* escribe un mensaje entrante de WhatsApp y observa al sistema crear el lead, responder y guardar el WebhookLog
9. En *API Keys* crea una clave y prueba `GET http://localhost:4000/api/v1/leads` con el header `X-API-Key`
10. En *Plan y facturación* cambia de plan: con `STRIPE_SECRET_KEY` te lleva a Stripe Checkout; sin clave es simulado
11. En *Analítica* mira los KPIs de **velocidad**, la **conversión por canal** y las **cohortes semanales**; descarga el **CSV ejecutivo**
12. En *Admin → Central AI Brain → Probar IA* escribe una pregunta y observa la respuesta con sus fuentes (RAG)

---

*Guía generada para DGI Quantrum v1.0 — Infraestructura de crecimiento basada en IA*
