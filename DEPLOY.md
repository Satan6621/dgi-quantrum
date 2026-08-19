# 🚀 DGI Quantrum — Deploy en Railway

## Pasos para desplegar

### 1. Preparar el repositorio

```bash
cd C:\network-ai-os
git init
git add .
git commit -m "feat: DGI Quantrum v1.0 - AI-powered lead generation platform"
```

### 2. Crear cuenta en Railway

1. Ve a [railway.app](https://railway.app)
2. Crea cuenta con GitHub
3. Nuevo proyecto → "Deploy from GitHub repo"
4. Selecciona tu repositorio

### 3. Agregar PostgreSQL

En el dashboard de Railway:
1. "New" → "Database" → "PostgreSQL"
2. Railway crea la DB automáticamente
3. Copia la variable `DATABASE_URL` del tab "Variables"

### 4. Configurar Variables de Entorno

En el servicio API, agrega estas variables:

```
DATABASE_URL=<pega_el_url_de_railway_postgres>
JWT_SECRET=<genera_una_clave_secreta_larga>
OPENAI_API_KEY=<tu_clave_de_openai_opcional>
STRIPE_SECRET_KEY=<tu_clave_de_stripe_opcional>
CORS_ORIGIN=<url_del_frontend_en_railway>
```

### 5. Deploy automático

Railway despliega automáticamente al hacer push a `main`.

### 6. Acceder

- API: `https://dgi-quantrum-api.up.railway.app`
- Web: `https://dgi-quantrum-web.up.railway.app`

### Credenciales iniciales

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@vida-nova.demo | demo1234 |
| Distribuidor | distributor@vida-nova.demo | demo1234 |

---

## Deploy Local con Docker

```bash
docker compose up --build
```

- API: http://localhost:4000
- Web: http://localhost:8080
