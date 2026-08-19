# DGI Quantrum — Plan de Integración Telegram + Round Robin

## Estado Actual

| Servicio | URL | Status |
|----------|-----|--------|
| Frontend | https://dgi-promo.vercel.app | ✅ Activo |
| API | localhost:4000 (local) | ✅ Funcionando |
| GitHub | https://github.com/Satan6621/dgi-quantrum | ✅ Código fuente |

---

## Nuevas Funcionalidades a Implementar

### 1. Integración con Telegram

#### Flujo del Prospecto
```
Prospecto escribe al bot de Telegram
        ↓
Bot responde con saludo + pregunta de screening
        ↓
Conversación guiada por IA (objeciones, preguntas)
        ↓
Scoring en tiempo real
        ↓
┌─────────────────┬──────────────────┬─────────────────┐
│   NO APTO       │   NUTRICIÓN      │  ALTA INTENCIÓN │
│   (-sale)        │   (follow-up)    │   (handoff)     │
└─────────────────┴──────────────────┴─────────────────┘
                                         ↓
                              ROUND ROBIN assignment
                                         ↓
                              Líder asignado recibe:
                              - Datos del prospecto
                              - Historial de chat
                              - Score y objeciones
                                         ↓
                              Líder + AI cierran el deal
```

#### Configuración Necesaria
1. Crear bot con @BotFather en Telegram
2. Obtener token del bot
3. Configurar webhook: `https://api.dgi-quantrum.com/webhooks/telegram/BOT_TOKEN`
4. Guardar token en variables de entorno: `TELEGRAM_BOT_TOKEN`

#### Endpoints a Crear
- `POST /api/webhooks/telegram/:botToken` — Recibe mensajes de Telegram
- `GET /api/telegram/preview/:chatId` — Preview de conversación
- `POST /api/telegram/send/:chatId` — Enviar mensaje

---

### 2. Round Robin (Asignación Automática)

#### Flujo
```
Lead calificado como HIGH_INTENTION
        ↓
Sistema busca distribuidores disponibles
        ↓
Round Robin selection:
  - Última asignación: > 24h
  - Estado: ACTIVE
  - Capacidad: < máximo diario
        ↓
Lead asignado al distribuidor
        ↓
Notificación al distribuidor:
  - Datos del lead
  - Score
  - Historial de conversación
  - Objeciones detectadas
        ↓
Distribuidor + AI trabajan el cierre
```

#### Configuración por Organización
```json
{
  "roundRobin": {
    "enabled": true,
    "maxLeadsPerDay": 10,
    "cooldownHours": 24,
    "strategy": "least_recent",  // least_recent, round_robin, weighted
    "fallbackAction": "queue"    // queue, notify_admin, rotate
  }
}
```

#### Endpoints a Crear
- `GET /api/round-robin/status` — Estado del pool
- `POST /api/round-robin/config` — Configurar round robin
- `GET /api/round-robin/history` — Historial de asignaciones

---

### 3. Flujo Completo (Telegram → AI → Round Robin → Cierre)

```
┌─────────────────────────────────────────────────────────┐
│                    TELEGRAM BOT                         │
│  Prospecto escribe → AI responde → Screening → Score    │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  DGI QUANTRUM API                        │
│  Recibe mensaje → Procesa IA → Actualiza lead → Score   │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 CLASSIFICATION ENGINE                    │
│  NO_APTO → Sale | NUTRICIÓN → Follow-up | HIGH → Handoff│
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  ROUND ROBIN ENGINE                      │
│  Selecciona distribuidor disponible → Asigna lead       │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│               DISTRIBUIDOR ASIGNADO                     │
│  Recibe notificación + historial + objeciones           │
│  Trabaja con AI para cerrar el deal                     │
└─────────────────────────────────────────────────────────┘
```

---

## Archivos para Compartir con el Socio

### Ruta del Proyecto
```
C:\network-ai-os
```

### Archivos Principales
| Archivo | Descripción |
|---------|-------------|
| `C:\network-ai-os\GUIA-USO.md` | Guía completa de uso |
| `C:\network-ai-os\PLAN.md` | Arquitectura del producto |
| `C:\network-ai-os\DEPLOY.md` | Instrucciones de deploy |
| `C:\network-ai-os\ITERACION.md` | Plan de iteración |
| `C:\network-ai-os\CHECKLIST-TESTING.md` | Checklist de testing |
| `C:\network-ai-os\PLAN-TELEGRAM.md` | Este archivo |

### Código Fuente
```
C:\network-ai-os\apps\api\     <- Backend (Express + Prisma + IA)
C:\network-ai-os\apps\web\     <- Frontend (React + Vite + Tailwind)
```

### Para Ejecutar Localmente
```bash
cd C:\network-ai-os
npm run dev    # API :4000 + Web :5173
```

---

## Próximos Pasos

1. **Compartir archivos** con el socio
2. **Crear bot de Telegram** con @BotFather
3. **Implementar integración Telegram** en la API
4. **Implementar Round Robin** para asignación automática
5. **Probar flujo completo**: Telegram → AI → Round Robin → Cierre
6. **Desplegar** cuando esté listo

---

## Credenciales Demo

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@vida-nova.demo | demo1234 |
| Distribuidor | distributor@vida-nova.demo | demo1234 |

---

## Contacto

- **Repositorio**: https://github.com/Satan6621/dgi-quantrum
- **Frontend**: https://dgi-promo.vercel.app
- **Documentación**: Ver archivos .md en la raíz del proyecto
