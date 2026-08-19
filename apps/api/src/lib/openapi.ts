/** Especificación OpenAPI 3.0 del API de DGI Quantrum. */
export const openapi: Record<string, unknown> = {
  openapi: "3.0.0",
  info: {
    title: "DGI Quantrum API",
    version: "3.0.0",
    description:
      "API pública y de integración de DGI Quantrum: funnels con IA, leads, analítica y cerebro de conocimiento. Autenticación con API keys (header `X-API-Key`).",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "v1", description: "API pública con API keys" },
    { name: "public", description: "Funnel público (sin auth)" },
    { name: "health", description: "Estado" },
  ],
  paths: {
    "/api/v1/leads": {
      get: {
        tags: ["v1"],
        summary: "Listar leads",
        security: [{ apiKey: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "pageSize", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Lista paginada de leads" },
          "401": { description: "API key inválida" },
          "403": { description: "Scope insuficiente (leads:read)" },
          "429": { description: "Rate limit superado (60/min)" },
        },
      },
    },
    "/api/v1/leads/{id}": {
      get: {
        tags: ["v1"],
        summary: "Detalle de un lead",
        security: [{ apiKey: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Lead" }, "404": { description: "No encontrado" } },
      },
    },
    "/api/v1/analytics": {
      get: {
        tags: ["v1"],
        summary: "Resumen de analítica",
        security: [{ apiKey: [] }],
        responses: { "200": { description: "Métricas agregadas" } },
      },
    },
    "/api/v1/brain": {
      get: {
        tags: ["v1"],
        summary: "Cerebro de conocimiento (activo)",
        security: [{ apiKey: [] }],
        responses: { "200": { description: "Ítems del cerebro" } },
      },
    },
    "/api/public/f/{slug}": {
      get: {
        tags: ["public"],
        summary: "Funnel público de un distribuidor (incluye variante A/B)",
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
          { name: "v", in: "query", schema: { type: "string" }, description: "ID de variante A/B" },
        ],
        responses: { "200": { description: "Twin + catálogo + preguntas" }, "404": { description: "Funnel no encontrado" } },
      },
    },
    "/api/public/f/{slug}/chat": {
      post: {
        tags: ["public"],
        summary: "Enviar mensaje al funnel IA",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  sessionId: { type: "string" },
                  leadId: { type: "string" },
                  variantId: { type: "string" },
                  channel: { type: "string" },
                },
                required: ["message"],
              },
            },
          },
        },
        responses: { "200": { description: "Respuesta de la IA + outcome" } },
      },
    },
    "/api/health": {
      get: { tags: ["health"], summary: "Estado del servicio", responses: { "200": { description: "ok" } } },
    },
    "/api/webhooks/{orgSlug}/whatsapp": {
      get: {
        tags: ["webhooks"],
        summary: "Verificación del webhook de WhatsApp (Meta Cloud API)",
        parameters: [
          { in: "path", name: "orgSlug", required: true, schema: { type: "string" } },
          { in: "query", name: "hub.mode", schema: { type: "string" } },
          { in: "query", name: "hub.verify_token", schema: { type: "string" } },
          { in: "query", name: "hub.challenge", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Devuelve el challenge" }, "403": { description: "Token inválido" } },
      },
      post: {
        tags: ["webhooks"],
        summary: "Mensaje entrante de WhatsApp (Twilio o Meta). Firma verificada según proveedor.",
        parameters: [{ in: "path", name: "orgSlug", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Lead atendido por la IA + respuesta por el canal" },
          "401": { description: "Firma inválida (X-Twilio-Signature / X-Hub-Signature-256)" },
        },
      },
    },
    "/api/webhooks/{orgSlug}/generic": {
      post: {
        tags: ["webhooks"],
        summary: "Mensaje entrante genérico {from, text}",
        parameters: [{ in: "path", name: "orgSlug", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Lead atendido" } },
      },
    },
    "/api/billing/webhook": {
      post: {
        tags: ["billing"],
        summary: "Webhook de Stripe (checkout.session.completed, invoice.payment_failed, customer.subscription.deleted). Firma verificada con STRIPE_WEBHOOK_SECRET.",
        responses: {
          "200": { description: "Evento procesado" },
          "401": { description: "Firma inválida" },
          "503": { description: "STRIPE_WEBHOOK_SECRET no configurado" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      apiKey: { type: "apiKey", in: "header", name: "X-API-Key" },
    },
  },
};