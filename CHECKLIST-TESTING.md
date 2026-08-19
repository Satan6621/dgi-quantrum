# DGI Quantrum — Checklist de Testing Pre-Producción

> **Proyecto:** DGI Quantrum — Infraestructura de crecimiento basada en IA  
> **Versión:** 1.0  
> **Fecha:** ___/___/______  
> **Responsable:** ______________________  
> **Ambiente:** □ Local  □ Staging  □ Producción  

---

## Instrucciones

1. Marcar con `[x]` cada ítem verificado
2. Anotar observaciones en la columna de "Notas"
3. Marcar con `[ ]` los ítems pendientes
4. No avanzar de fase hasta completar al menos el 90% de la fase anterior

---

## Fase 1: Autenticación & Seguridad

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 1.1 | Login con credenciales válidas (`admin@vida-nova.demo` / `demo1234`) | [ ] | |
| 1.2 | Login con credenciales inválidas → respuesta 401 | [ ] | |
| 1.3 | Token de acceso (access token) funciona correctamente | [ ] | |
| 1.4 | Refresh token rotativo funciona (POST /api/auth/refresh) | [ ] | |
| 1.5 | Logout revoca tokens (POST /api/auth/logout) | [ ] | |
| 1.6 | Token expirado rechaza peticiones → 401 | [ ] | |
| 1.7 | Rol PLATFORM puede acceder a todo | [ ] | |
| 1.8 | Rol ADMIN puede acceder a su organización | [ ] | |
| 1.9 | Rol DISTRIBUTOR tiene acceso restringido (solo Twin, Leads propios) | [ ] | |
| 1.10 | Multi-tenant: datos aislados por organización (no hay fugas de datos entre orgs) | [ ] | |
| 1.11 | Password hasheado con bcrypt (no se almacena en texto plano) | [ ] | |
| 1.12 | JWT firma correctamente con HS256 | [ ] | |

**Fase 1 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 2: Central AI Brain

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 2.1 | Listar ítems del cerebro (GET /api/brain) | [ ] | |
| 2.2 | Crear ítem del cerebro (POST /api/brain) | [ ] | |
| 2.3 | Actualizar ítem del cerebro (PUT /api/brain/:id) | [ ] | |
| 2.4 | Eliminar ítem del cerebro (DELETE /api/brain/:id) | [ ] | |
| 2.5 | Categorías se listan correctamente (GET /api/brain/categories) | [ ] | |
| 2.6 | Filtro por categoría funciona | [ ] | |
| 2.7 | Búsqueda por texto funciona | [ ] | |
| 2.8 | Playground IA responde con RAG (POST /api/brain/test) | [ ] | |
| 2.9 | Playground muestra fuentes usadas en la respuesta | [ ] | |
| 2.10 | Import CSV funciona (POST /api/brain/import) | [ ] | |
| 2.11 | CSV con errores muestra resumen por fila | [ ] | |
| 2.12 | Claims prohibidos aparecen en conversación (categoría PROHIBITED_CLAIM) | [ ] | |
| 2.13 | Límite de plan retorna 402 si se excede | [ ] | |
| 2.14 | Aislamiento por orgId: no se muestran ítems de otras organizaciones | [ ] | |

**Fase 2 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 3: Distributors & AI Twins

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 3.1 | Listar distribuidores (GET /api/distributors) | [ ] | |
| 3.2 | Crear distribuidor (POST /api/distributors) | [ ] | |
| 3.3 | Editar distribuidor (PUT /api/distributors/:id) | [ ] | |
| 3.4 | Configurar AI Twin: nombre | [ ] | |
| 3.5 | Configurar AI Twin: avatar | [ ] | |
| 3.6 | Configurar AI Twin: tono de voz | [ ] | |
| 3.7 | Configurar AI Twin: presentación | [ ] | |
| 3.8 | Configurar AI Twin: idioma | [ ] | |
| 3.9 | Configurar AI Twin: zona horaria | [ ] | |
| 3.10 | Configurar AI Twin: enlaces (WhatsApp, calendario, redes) | [ ] | |
| 3.11 | Funnel público funciona (GET /api/public/f/:slug) | [ ] | |
| 3.12 | Chat del funnel funciona (POST /api/public/f/:slug/chat) | [ ] | |
| 3.13 | Variantes A/B se crean (PUT /api/distributors/:id/variants) | [ ] | |
| 3.14 | Variantes A/B se miden (GET /api/analytics/variants) | [ ] | |
| 3.15 | Variante estable por visitante (localStorage) | [ ] | |
| 3.16 | GET/PUT /api/twin funciona para el distribuidor actual | [ ] | |

**Fase 3 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 4: Leads & Conversación

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 4.1 | Listar leads con paginación (GET /api/leads) | [ ] | |
| 4.2 | Filtros de leads funcionan (status, source, outcome, distributor, q) | [ ] | |
| 4.3 | Crear lead manualmente | [ ] | |
| 4.4 | Import CSV de leads funciona (POST /api/leads/import) | [ ] | |
| 4.5 | Deduplicación por email/teléfono en importación | [ ] | |
| 4.6 | Chat del funnel crea lead automáticamente | [ ] | |
| 4.7 | Scoring avanza correctamente con cada interacción | [ ] | |
| 4.8 | Preguntas de screening se hacen en orden (sin repetir) | [ ] | |
| 4.9 | Clasificación NO_APTO funciona (lead descalificado) | [ ] | |
| 4.10 | Clasificación NUTRICIÓN funciona (lead necesita follow-up) | [ ] | |
| 4.11 | Clasificación HIGH_INTención funciona (lead listo para handoff) | [ ] | |
| 4.12 | Handoff se activa con WhatsApp + calendario | [ ] | |
| 4.13 | Lead en handoff muestra datos de contacto | [ ] | |
| 4.14 | Memoria multi-turno funciona (lead vuelve y la IA recuerda historial) | [ ] | |
| 4.15 | Manejo de objeciones funciona (precio, tiempo, confianza, indecisión) | [ ] | |
| 4.16 | La IA no castiga score por objeción, responde con empatía | [ ] | |
| 4.17 | La IA detecta despedidas y cierra con calidez | [ ] | |
| 4.18 | La IA reconoce URLs compartidas sin interrumpir conversación | [ ] | |
| 4.19 | Detección de idioma funciona (es/en/pt) | [ ] | |
| 4.20 | PATCH /api/leads/:id funciona (cambiar estado manualmente) | [ ] | |
| 4.21 | GET /api/leads/:id muestra detalle completo | [ ] | |

**Fase 4 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 5: Follow-ups

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 5.1 | Listar follow-ups (GET /api/followups) | [ ] | |
| 5.2 | Secuencias se programan correctamente | [ ] | |
| 5.3 | Follow-ups se crean automáticamente al clasificar NUTRICIÓN | [ ] | |
| 5.4 | Email se envía cuando SMTP está configurado | [ ] | |
| 5.5 | Email se loguea cuando NO hay SMTP configurado (modo demo) | [ ] | |
| 5.6 | Re-engagement: respuesta del lead a follow-up entra por el motor IA | [ ] | |
| 5.7 | Follow-ups paginados funcionan | [ ] | |

**Fase 5 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 6: Onboarding & Duplicación

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 6.1 | Aceptar handoff crea tareas de onboarding | [ ] | |
| 6.2 | Activar lead crea distribuidor (POST /api/leads/:id/activate) | [ ] | |
| 6.3 | Nuevo distribuidor tiene su AI Twin configurado | [ ] | |
| 6.4 | Nuevo distribuidor tiene su funnel público funcional | [ ] | |
| 6.5 | Comisiones se calculan correctamente (direct, level1, level2) | [ ] | |
| 6.6 | Árbol de patrocinio se actualiza al activar | [ ] | |
| 6.7 | Email de bienvenida se envía (o se loguea sin SMTP) | [ ] | |
| 6.8 | Duplicación: el proceso es completo de lead a distribuidor activo | [ ] | |

**Fase 6 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 7: Analítica

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 7.1 | Dashboard overview muestra KPIs correctos (GET /api/analytics/overview) | [ ] | |
| 7.2 | Funnel de conversión muestra datos (GET /api/analytics/funnel) | [ ] | |
| 7.3 | Velocidad del funnel calcula tiempos (GET /api/analytics/velocity) | [ ] | |
| 7.4 | Tiempo medio/mediana de captura→handoff correcto | [ ] | |
| 7.5 | Tiempo de respuesta del distribuidor calculado | [ ] | |
| 7.6 | Cumplimiento de SLA calculado | [ ] | |
| 7.7 | Latencia del motor IA medida | [ ] | |
| 7.8 | Conversión por canal muestra datos (GET /api/analytics/sources) | [ ] | |
| 7.9 | Cohortes semanales muestra progresión (GET /api/analytics/cohorts) | [ ] | |
| 7.10 | Panel ejecutivo consolida todo (GET /api/analytics/executive) | [ ] | |
| 7.11 | Series temporales funcionan (GET /api/analytics/timeseries) | [ ] | |
| 7.12 | Distribución de scores funciona (GET /api/analytics/score-distribution) | [ ] | |
| 7.13 | Analítica de distribuidores funciona (GET /api/analytics/distributors) | [ ] | |
| 7.14 | Export CSV funciona (GET /api/export/analytics?format=csv) | [ ] | |
| 7.15 | Export JSON funciona (GET /api/export/analytics?format=json) | [ ] | |
| 7.16 | Export leads funciona | [ ] | |
| 7.17 | Export brain funciona | [ ] | |
| 7.18 | Export distributors funciona | [ ] | |
| 7.19 | Export sessions funciona | [ ] | |
| 7.20 | Export commissions funciona | [ ] | |
| 7.21 | BOM para Excel se incluye en CSV | [ ] | |

**Fase 7 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 8: Integraciones

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 8.1 | WhatsApp Twilio recibe mensaje entrante | [ ] | |
| 8.2 | Firma X-Twilio-Signature verificada correctamente | [ ] | |
| 8.3 | Payload con firma inválida → 401 | [ ] | |
| 8.4 | WhatsApp Meta recibe mensaje entrante | [ ] | |
| 8.5 | Firma X-Hub-Signature-256 verificada correctamente | [ ] | |
| 8.6 | Verificación GET de Meta (hub.challenge) funciona | [ ] | |
| 8.7 | Mensajes se persisten en WebhookLog con SID/WAMID | [ ] | |
| 8.8 | Respuestas de IA se envían por WhatsApp Cloud API (Meta) | [ ] | |
| 8.9 | Respuestas de IA se envían por Twilio | [ ] | |
| 8.10 | Cal.com webhook procesa booking (POST /api/webhooks/calcom) | [ ] | |
| 8.11 | Booking crea lead en ONBOARDING automáticamente | [ ] | |
| 8.12 | Slack envía notificación (si configurado) | [ ] | |
| 8.13 | HubSpot sync lead (si configurado) | [ ] | |
| 8.14 | Zapier webhook dispara (POST /api/webhooks/generic) | [ ] | |
| 8.15 | Stripe checkout funciona (POST /api/billing/checkout) | [ ] | |
| 8.16 | Webhook de Stripe verificado (POST /api/billing/webhook) | [ ] | |
| 8.17 | Firma Stripe-Signature verificada correctamente | [ ] | |
| 8.18 | Evento checkout.session.completed activa plan | [ ] | |
| 8.19 | Evento invoice.payment_failed degrada a PAST_DUE | [ ] | |
| 8.20 | Evento customer.subscription.deleted degrada a TRIAL | [ ] | |
| 8.21 | Webhooks de salida con firma HMAC-SHA256 (X-NAIO-Signature) | [ ] | |
| 8.22 | Webhooks de salida incluyen X-NAIO-Event y X-NAIO-Delivery | [ ] | |
| 8.23 | Botón de prueba de webhooks funciona | [ ] | |
| 8.24 | Log de entregas de webhooks persistido | [ ] | |
| 8.25 | Simulador de webhooks funciona (POST /api/webhooks/simulate) | [ ] | |

**Fase 8 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 9: Red & Compensación

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 9.1 | Árbol de patrocinio se muestra (GET /api/downline/tree) | [ ] | |
| 9.2 | Overview de red funciona (GET /api/downline/overview) | [ ] | |
| 9.3 | Compensación multinivel calcula (direct, level1, level2) | [ ] | |
| 9.4 | Porcentajes de compensación son correctos según configuración | [ ] | |
| 9.5 | Gamificación asigna puntos al activar distribuidor | [ ] | |
| 9.6 | Niveles (BRONCE→PLATINO) se asignan correctamente | [ ] | |
| 9.7 | Badges se otorgan según hitos | [ ] | |

**Fase 9 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 10: Performance & Seguridad

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 10.1 | Health check responde (GET /api/health o similar) | [ ] | |
| 10.2 | Rate limiting global funciona en /api | [ ] | |
| 10.3 | Rate limiting en login funciona | [ ] | |
| 10.4 | Rate limiting en API pública funciona (60 req/min) | [ ] | |
| 10.5 | Cache de analytics funciona (evita recálculo innecesario) | [ ] | |
| 10.6 | Response time headers presentes (X-Response-Time) | [ ] | |
| 10.7 | Request IDs generados (X-Request-Id) | [ ] | |
| 10.8 | Helmet instala cabeceras de seguridad | [ ] | |
| 10.9 | x-powered-by eliminado | [ ] | |
| 10.10 | Límite de tamaño de body configurado (express.json limit) | [ ] | |
| 10.11 | Manejador de 404 funciona | [ ] | |
| 10.12 | Manejador de errores genérico funciona | [ ] | |
| 10.13 | CORS configurado correctamente (solo origen permitido) | [ ] | |
| 10.14 | API pública con claves funciona (X-API-Key) | [ ] | |
| 10.15 | Clave inválida → 401 | [ ] | |
| 10.16 | Clave revocada → 403 | [ ] | |

**Fase 10 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 11: UI/UX

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 11.1 | Login carga correctamente (sin errores de JS) | [ ] | |
| 11.2 | Dashboard muestra datos reales | [ ] | |
| 11.3 | Leads se listan con filtros y paginación | [ ] | |
| 11.4 | Conversaciones se ven completas (historial de mensajes) | [ ] | |
| 11.5 | Funnel público es responsive (mobile, tablet, desktop) | [ ] | |
| 11.6 | Animaciones de transición funcionan | [ ] | |
| 11.7 | Formularios validan correctamente (campos requeridos) | [ ] | |
| 11.8 | Toasts/notificaciones in-app aparecen | [ ] | |
| 11.9 | Campana de notificaciones funciona (polling 30s) | [ ] | |
| 11.10 | Navegación entre secciones funciona | [ ] | |
| 11.11 | Dark dashboard carga con estilos correctos | [ ] | |
| 11.12 | Funnel público carga con estilos claros | [ ] | |
| 11.13 | Plan y facturación muestra badge de estado | [ ] | |
| 11.14 | Admin → Equipo funciona (invitar, editar, eliminar) | [ ] | |
| 11.15 | Admin → Auditoría muestra logs paginados | [ ] | |
| 11.16 | Admin → Webhooks muestra configuración de canales | [ ] | |
| 11.17 | Selector de rol funciona correctamente | [ ] | |

**Fase 11 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 12: Deploy & Ops

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 12.1 | API desplegada y respondiendo (POST /api/auth/login) | [ ] | |
| 12.2 | Frontend desplegado y accesible | [ ] | |
| 12.3 | CORS configurado para dominio de producción | [ ] | |
| 12.4 | Variable JWT_SECRET configurada (no es placeholder) | [ ] | |
| 12.5 | Variable APP_URL configurada | [ ] | |
| 12.6 | Variable CORS_ORIGIN configurada | [ ] | |
| 12.7 | Variable OPENAI_API_KEY configurada (si se usa IA real) | [ ] | |
| 12.8 | Variable STRIPE_SECRET_KEY configurada (si se usa Stripe real) | [ ] | |
| 12.9 | Variable STRIPE_WEBHOOK_SECRET configurada | [ ] | |
| 12.10 | Variables de Twilio configuradas (si se usa WhatsApp real) | [ ] | |
| 12.11 | Variables SMTP configuradas (si se usa email real) | [ ] | |
| 12.12 | Seed de datos demo ejecutado (npm run db:seed) | [ ] | |
| 12.13 | Base de datos migrada (npm run db:push) | [ ] | |
| 12.14 | Prisma generate ejecutado | [ ] | |
| 12.15 | Docker Compose levanta correctamente | [ ] | |
| 12.16 | Health check de Docker funciona | [ ] | |
| 12.17 | SQLite persiste en volumen Docker | [ ] | |
| 12.18 | GitHub Actions CI pasa (install, generate, build, test) | [ ] | |
| 12.19 | Tests automatizados pasan (npm test) | [ ] | |
| 12.20 | Swagger UI accesible en /api/docs | [ ] | |
| 12.21 | OpenAPI spec accesible en /api/v1/openapi.json | [ ] | |

**Fase 12 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Fase 13: Datos Demo & Smoke Test

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 13.1 | Admin login funciona con credenciales demo | [ ] | |
| 13.2 | Distribuidor login funciona con credenciales demo | [ ] | |
| 13.3 | Funnel público de distribuidor demo accesible | [ ] | |
| 13.4 | Chat del funnel responde con IA | [ ] | |
| 13.5 | Lead se crea tras conversación en funnel | [ ] | |
| 13.6 | Lead aparece en panel de administración | [ ] | |
| 13.7 | Brain tiene ítems de demo precargados | [ ] | |
| 13.8 | Analytics muestra datos del seed | [ ] | |
| 13.9 | Distribuidores demo aparecen en lista | [ ] | |
| 13.10 | Comisiones de demo se muestran | [ ] | |

**Fase 13 completada:** □ Sí  □ No — Observaciones: _________________________

---

## Resumen Final

| Fase | Total Ítems | Completados | % | Estado |
|------|-------------|-------------|---|--------|
| 1. Autenticación & Seguridad | 12 | ___ | ___% | □ Pass □ Fail |
| 2. Central AI Brain | 14 | ___ | ___% | □ Pass □ Fail |
| 3. Distributors & AI Twins | 16 | ___ | ___% | □ Pass □ Fail |
| 4. Leads & Conversación | 21 | ___ | ___% | □ Pass □ Fail |
| 5. Follow-ups | 7 | ___ | ___% | □ Pass □ Fail |
| 6. Onboarding & Duplicación | 8 | ___ | ___% | □ Pass □ Fail |
| 7. Analítica | 21 | ___ | ___% | □ Pass □ Fail |
| 8. Integraciones | 25 | ___ | ___% | □ Pass □ Fail |
| 9. Red & Compensación | 7 | ___ | ___% | □ Pass □ Fail |
| 10. Performance & Seguridad | 16 | ___ | ___% | □ Pass □ Fail |
| 11. UI/UX | 17 | ___ | ___% | □ Pass □ Fail |
| 12. Deploy & Ops | 21 | ___ | ___% | □ Pass □ Fail |
| 13. Datos Demo & Smoke Test | 10 | ___ | ___% | □ Pass □ Fail |
| **TOTAL** | **195** | **___** | **___%** | |

---

## Criterio de Aprobación

- **Mínimo para producción:** 90% de ítems completados (176/195)
- **Bloqueadores:** Cualquier ítem marcado como Fail en Fase 1, 4, 8, 10 o 12 es bloqueante
- **Aprobación requerida de:** ______________________

---

## Firmas

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| QA Lead | | | |
| Tech Lead | | | |
| Product Owner | | | |
| DevOps | | | |

---

*Generado para DGI Quantrum v1.0 — Revisar antes de cada deploy a producción*
