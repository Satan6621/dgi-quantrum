# DGI Quantrum — Roadmap Completo & Algoritmo de Captación

## Visión del Producto

```
DGI QUANTRUM = CRM + IA + Marketing + Educación + Captación Automatizada
```

---

## Fase 1: Core (Completada ✅)

- [x] Multi-tenant SaaS
- [x] Central AI Brain (RAG)
- [x] Distributor AI Twins
- [x] Lead qualification
- [x] Conversaciones IA
- [x] Onboarding → Duplicación
- [x] Analítica avanzada
- [x] Integraciones (WhatsApp, Cal.com, Slack, HubSpot, Zapier, Stripe)

---

## Fase 2: Telegram + Round Robin (Próximamente 🔜)

- [ ] Bot de Telegram para screening
- [ ] Round Robin para asignación automática
- [ ] Notificaciones a distribuidores
- [ ] Cierre asistido por AI

---

## Fase 3: Educación & Contenido (Futuro 📚)

### 3.1 Cursos de Marketing Digital
- Fundamentos de Marketing Digital
- Creación de Contenido
- SEO & SEM
- Social Media Marketing
- Email Marketing
- Paid Advertising (Facebook Ads, Google Ads)
- Analytics & Métricas

### 3.2 Campañas de Publicidad
- Constructor de campañas (wizard)
- Templates por industria
- Presupuesto y segmentación
- Tracking de conversiones
- A/B testing automático
- ROI por campaña

### 3.3 Tutoriales Interactivos
- Video tutoriales embebidos
- Quizzes de conocimiento
- Certificaciones
- Gamificación (puntos, badges)
- Progreso del distribuidor

### 3.4 Centro de Novedades
- Blog integrado
- Notificaciones de novedades
- Case studies
- Testimonios
- Métricas de éxito

---

## Fase 4: Captación Automatizada de Prospectos (🤖 Algoritmo AI)

### 4.1 Arquitectura del Algoritmo

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROSPECT CAPTURE ENGINE                       │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │   SCRAPE    │   │   ANALYZE   │   │   ENGAGE    │          │
│  │   Fuentes   │──▶│   Perfil    │──▶│   Personal  │          │
│  └─────────────┘   └─────────────┘   └─────────────┘          │
│         │                │                  │                   │
│         ▼                ▼                  ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              LEAD SCORING ENGINE                        │   │
│  │  - Interés (likes, comments, shares)                    │   │
│  │  - Intención (búsquedas, preguntas)                     │   │
│  │  - Perfil (demografía, empresa, cargo)                  │   │
│  │  - Compatibilidad (con tu producto)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ENGAGEMENT ENGINE                          │   │
│  │  - Mensaje personalizado                                │   │
│  │  - Contenido relevante                                  │   │
│  │  - Oferta adaptada                                      │   │
│  │  - Timing óptimo                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Fuentes de Captación

| Fuente | Método | Datos Obtenidos |
|--------|--------|-----------------|
| **LinkedIn** | API + Scraping | Nombre, cargo, empresa, industria |
| **Facebook/Instagram** | API + Ads | Intereses, comportamiento, demografía |
| **Twitter/X** | API | Tweets, engagement,话题 |
| **Google** | Ads API + Search | Búsquedas, intención de compra |
| **TikTok** | API | Intereses, engagement |
| **YouTube** | API | Videos vistos, suscripciones |
| **Foros/Comunidades** | Scraping | Preguntas, problemas |
| **Sitios web** | Pixel + Forms | Comportamiento, formularios |

### 4.3 Algoritmo de Scoring

```typescript
interface LeadScore {
  total: number;           // 0-100
  interest: number;        // 0-30 (engagement)
  intent: number;          // 0-30 (búsquedas, preguntas)
  fit: number;             // 0-20 (demografía, empresa)
  timing: number;          // 0-20 (momento oportuno)
}

function calculateLeadScore(lead: any): LeadScore {
  const interest = calculateInterest(lead);   // Likes, comments, shares
  const intent = calculateIntent(lead);       // Búsquedas, preguntas
  const fit = calculateFit(lead);             // Perfil ideal
  const timing = calculateTiming(lead);       // Momento oportuno
  
  return {
    total: interest + intent + fit + timing,
    interest,
    intent,
    fit,
    timing,
  };
}

function calculateInterest(lead: any): number {
  let score = 0;
  if (lead.likes > 10) score += 10;
  if (lead.comments > 5) score += 10;
  if (lead.shares > 3) score += 5;
  if (lead.saves > 2) score += 5;
  return Math.min(30, score);
}

function calculateIntent(lead: any): number {
  let score = 0;
  if (lead.searchedKeywords) score += 15;
  if (lead.askedQuestions) score += 10;
  if (lead.visitedPricing) score += 5;
  return Math.min(30, score);
}

function calculateFit(lead: any): number {
  let score = 0;
  if (lead.industry === 'target') score += 10;
  if (lead.companySize === 'ideal') score += 5;
  if (lead.jobTitle === 'decision_maker') score += 5;
  return Math.min(20, score);
}

function calculateTiming(lead: any): number {
  let score = 0;
  if (lead.recentActivity < 7) score += 10;
  if (lead.lifeEvent === 'new_job') score += 10;
  return Math.min(20, score);
}
```

### 4.4 Estrategias de Captación por Red

#### LinkedIn
```
1. Buscar por: cargo + industria + tamaño empresa
2. Analizar: publicaciones recientes, actividad
3. Engager: comentario relevante → mensaje personalizado
4. Convertir: invitación → conversación → lead
```

#### Facebook/Instagram
```
1. Segmentar: intereses + comportamiento + demografía
2. Contenido: anuncios de valor → landing page
3. Retargeting: visitantes que no convirtieron
4. Lookalike: audience similar a clientes actuales
```

#### TikTok/YouTube
```
1. Contenido: tutoriales, tips, casos de éxito
2. CTA: enlace en bio, comentarios
3. Engagement: responder preguntas
4. DM: mensaje directo personalizado
```

#### Google
```
1. Keywords: intención de compra alta
2. Anuncios: textos compelling
3. Landing: página optimizada
4. Retargeting: display network
```

### 4.5 Flujo Completo de Captación

```
┌─────────────────────────────────────────────────────────────┐
│                    FUENTE (Red Social)                       │
│  LinkedIn / Facebook / Instagram / TikTok / Google          │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SCRAPE & COLLECT                          │
│  Recopilar datos públicos del perfil                        │
│  - Nombre, foto, bio                                        │
│  - Publicaciones recientes                                  │
│  - Intereses y actividad                                    │
│  - Conexiones y grupo                                       │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    ENRICH DATA                               │
│  Enriquecer con fuentes adicionales                         │
│  - Email (si disponible)                                    │
│  - Empresa y cargo                                          │
│  - Tamaño de empresa                                        │
│  - Industria                                                │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SCORE LEAD                                │
│  Calcular score de 0-100                                    │
│  - Interest: 0-30                                           │
│  - Intent: 0-30                                             │
│  - Fit: 0-20                                                │
│  - Timing: 0-20                                             │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CLASSIFY                                  │
│  80-100: HOT → Contacto inmediato                           │
│  60-79:  WARM → Secuencia de nurturing                      │
│  40-59:  COOL → Contenido de valor                          │
│  0-39:   COLD → Monitoreo                                   │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    ENGAGE                                    │
│  Personalizar mensaje según:                                │
│  - Interés detectado                                        │
│  - Problema que puede resolver                              │
│  - Momento oportuno                                         │
│  - Canal preferido                                          │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CONVERT                                   │
│  - Lead calificado → CRM                                    │
│  - Asignar a distribuidor (round robin)                     │
│  - Iniciar conversación de ventas                           │
│  - Cerrar deal                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Fase 5: Monetización Avanzada (Futuro 💰)

### 5.1 Planes de Suscripción
| Plan | Precio | Features |
|------|--------|----------|
| Starter | $29/mes | 100 leads, 1 distribuidor |
| Growth | $79/mes | 500 leads, 5 distribuidores |
| Scale | $199/mes | 2000 leads, 20 distribuidores |
| Enterprise | Custom | Ilimitado, API, soporte |

### 5.2 Créditos de Captación
- 10 créditos/mes gratis
- $0.50 por lead captado
- $5.00 por lead convertido

### 5.3 Marketplace de Cursos
- Creadores de contenido pueden vender cursos
- DGI Quantrum toma 20% de comisión

---

## Resumen de Próximos Pasos

| Prioridad | Feature | Esfuerzo |
|-----------|---------|----------|
| 🔴 Alta | Telegram Bot + Round Robin | 2 semanas |
| 🟡 Media | Cursos de Marketing Digital | 1 mes |
| 🟡 Media | Campañas de Publicidad | 1 mes |
| 🟢 Baja | Algoritmo de Captación | 2 meses |
| 🟢 Baja | Monetización | 1 mes |

---

## Contacto & Recursos

- **Repositorio**: https://github.com/Satan6621/dgi-quantrum
- **Frontend**: https://dgi-promo.vercel.app
- **Documentación**: Ver archivos .md en la raíz
