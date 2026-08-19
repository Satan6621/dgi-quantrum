# 🚀 DGI Quantrum — Deploy en Vercel + Railway

## Arquitectura de Deploy

```
┌─────────────────────────────────────────┐
│              USUARIO                     │
│                 │                        │
│    ┌────────────▼────────────┐          │
│    │   Vercel (Frontend)     │          │
│    │   React + Vite          │          │
│    │   https://dgi-quantrum.vercel.app  │
│    └────────────┬────────────┘          │
│                 │ API calls             │
│    ┌────────────▼────────────┐          │
│    │   Railway (API)         │          │
│    │   Express + Prisma      │          │
│    │   + PostgreSQL          │          │
│    │   https://api-dgi-quantrum.up.railway.app │
│    └─────────────────────────┘          │
└─────────────────────────────────────────┘
```

---

## Paso 1: Preparar Repositorio

```bash
cd C:\network-ai-os
git init
git add .
git commit -m "feat: DGI Quantrum v1.0"
```

## Paso 2: Subir a GitHub

1. Ve a https://github.com/new
2. Nombre: `dgi-quantrum`
3. Visibility: Private (recomendado)
4. Create repository

```bash
git remote add origin https://github.com/TU_USUARIO/dgi-quantrum.git
git push -u origin main
```

## Paso 3: Deploy API en Railway

1. Ve a https://railway.app
2. Login con GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Selecciona `dgi-quantrum`
5. Selecciona la carpeta `apps/api` como root
6. "New" → "Database" → "PostgreSQL"
7. Copia la variable `DATABASE_URL`

### Variables de entorno en Railway:

```
DATABASE_URL=<pega_url_de_postgres_railway>
JWT_SECRET=dgi-quantrum-secret-key-2024-change-me
OPENAI_API_KEY=<tu_clave_openai_opcional>
STRIPE_SECRET_KEY=<tu_clave_stripe_opcional>
STRIPE_WEBHOOK_SECRET=<tu_webhook_secret_opcional>
CORS_ORIGIN=https://dgi-quantrum.vercel.app
SMTP_HOST=<tu_smtp_host_opcional>
SMTP_PORT=587
SMTP_USER=<tu_smtp_user_opcional>
SMTP_PASS=<tu_smtp_pass_opcional>
SMTP_FROM=no-reply@dgi-quantrum.com
```

### URL de la API:
```
https://api-dgi-quantrum.up.railway.app
```

## Paso 4: Deploy Frontend en Vercel

1. Ve a https://vercel.com
2. Login con GitHub
3. "Add New..." → "Project"
4. Importa `dgi-quantrum`
5. Framework: **Vite**
6. Root Directory: `apps/web`
7. Build Command: `npm run build`
8. Output Directory: `dist`

### Variables de entorno en Vercel:

```
VITE_API_URL=https://api-dgi-quantrum.up.railway.app
```

### URL del Frontend:
```
https://dgi-quantrum.vercel.app
```

## Paso 5: Configurar CORS

En Railway, actualiza la variable `CORS_ORIGIN` con la URL de Vercel:
```
CORS_ORIGIN=https://dgi-quantrum.vercel.app
```

## Paso 6: Seed de Datos Demo

En Railway, ve al tab "Deployments" y ejecuta:
```bash
npx tsx prisma/seed.ts
```

O conecta por SSH al container:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

---

## URLs Finales

| Servicio | URL |
|----------|-----|
| Frontend | https://dgi-quantrum.vercel.app |
| API | https://api-dgi-quantrum.up.railway.app |
| API Health | https://api-dgi-quantrum.up.railway.app/api/health |
| API Docs | https://api-dgi-quantrum.up.railway.app/api/docs |
| Funnel Demo | https://dgi-quantrum.vercel.app/f/maria-gonzalez |

## Credenciales Demo

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@vida-nova.demo | demo1234 |
| Distribuidor | distributor@vida-nova.demo | demo1234 |

---

## Variables de Entorno Completas

### Railway (API)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| DATABASE_URL | Sí | URL de PostgreSQL (auto de Railway) |
| JWT_SECRET | Sí | Clave secreta para JWT |
| CORS_ORIGIN | Sí | URL del frontend |
| OPENAI_API_KEY | No | Para LLM real |
| STRIPE_SECRET_KEY | No | Para pagos reales |
| SMTP_HOST | No | Para emails reales |
| TWILIO_ACCOUNT_SID | No | Para WhatsApp real |

### Vercel (Frontend)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| VITE_API_URL | Sí | URL base de la API |

---

## Deploy Local (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:4000
