# DGI Quantrum - Guía de Deploy para el Socio

## Requisitos del Servidor

- **Node.js** 18+ 
- **npm** 9+
- **Git**
- Puerto **4000** disponible

## Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/Satan6621/dgi-quantrum.git
cd dgi-quantrum
```

## Paso 2: Instalar Dependencias

```bash
# Instalar dependencias raíz
npm install

# Instalar dependencias de la API
cd apps/api
npm install

# Generar Prisma Client
npx prisma generate

# Crear base de datos
npx prisma db push

# Sembrar datos demo
npx prisma db seed

# Volver a la raíz
cd ../..
```

## Paso 3: Configurar Variables de Entorno

Crear archivo `apps/api/.env`:

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=tu-secreto-seguro-aqui
DATABASE_URL=file:./dev.db
CORS_ORIGIN=http://localhost:5173
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

**IMPORTANTE:** Cambia `JWT_SECRET` por un valor seguro y único.

## Paso 4: Iniciar la API

```bash
cd apps/api
npm start
```

La API estará en: `http://localhost:4000`

## Paso 5: Iniciar el Frontend (otra terminal)

```bash
cd apps/web
npm install
npm run dev
```

El frontend estará en: `http://localhost:5173`

## Credenciales Demo

| Email | Password | Rol |
|-------|----------|-----|
| admin@vida-nova.demo | demo1234 | Admin |
| distributor@vida-nova.demo | demo1234 | Distribuidor |

## Verificar que Funciona

1. Abrir `http://localhost:5173/login`
2. Ingresa `admin@vida-nova.demo` / `demo1234`
3. Deberías ver el Dashboard

## Para Producción (Opcional)

Si quieres deployar en un servidor VPS:

### Con PM2 (recomendado)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar la API
cd apps/api
pm2 start "npx tsx src/index.ts" --name dgi-api

# Guardar configuración
pm2 save
pm2 startup
```

### Con Docker

```bash
# Build
docker build -t dgi-quantrum .

# Run
docker run -p 4000:4000 dgi-quantrum
```

## Estructura del Proyecto

```
dgi-quantrum/
├── apps/
│   ├── api/           ← Backend (Express + Prisma + IA)
│   │   ├── src/       ← Código fuente
│   │   ├── prisma/    ← Base de datos
│   │   └── package.json
│   └── web/           ← Frontend (React + Vite)
│       ├── src/       ← Código fuente
│       └── package.json
├── package.json       ← Dependencias raíz
├── Dockerfile         ← Para Docker
└── README.md
```

## Documentación

- `GUIA-USO.md` - Cómo usar la app
- `PLAN.md` - Arquitectura del producto
- `PLAN-TELEGRAM.md` - Plan de Telegram + Round Robin
- `ROADMAP-COMPLETO.md` - Roadmap completo
- `DEPLOY.md` - Instrucciones de deploy

## Soporte

Si hay problemas, revisar:
1. Que Node.js sea versión 18+
2. Que el puerto 4000 esté libre
3. Que las dependencias estén instaladas
4. Los logs en la consola

---

**Última actualización:** Agosto 2026
**Versión:** 1.0.0
