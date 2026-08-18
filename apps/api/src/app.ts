import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./env";

import authRoutes from "./routes/auth.routes";
import publicRoutes from "./routes/public.routes";
import brainRoutes from "./routes/brain.routes";
import orgRoutes from "./routes/org.routes";
import distributorRoutes from "./routes/distributor.routes";
import leadRoutes from "./routes/leads.routes";
import followupRoutes from "./routes/followups.routes";
import analyticsRoutes from "./routes/analytics.routes";
import webhookRoutes from "./routes/webhooks.routes";
import downlineRoutes from "./routes/downline.routes";
import billingRoutes from "./routes/billing.routes";
import keysRoutes from "./routes/keys.routes";
import exportRoutes from "./routes/export.routes";
import notificationsRoutes from "./routes/notifications.routes";
import v1Routes from "./routes/v1.routes";
import teamRoutes from "./routes/team.routes";
import auditRoutes from "./routes/audit.routes";
import { openapi } from "./lib/openapi";

export const app = express();

app.use(helmet());
app.disable("x-powered-by");
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Rate-limit global por IP (defensa básica contra abuso)
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.RATE_LIMIT_PER_IP,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas peticiones. Intenta de nuevo en unos minutos." },
  })
);

// Login con límite más estricto (fuerza bruta)
app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 60 * 1000,
    limit: env.LOGIN_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiados intentos de inicio de sesión. Espera un momento." },
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true, engine: "rule" as string, v: "3" }));

// Docs OpenAPI
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi));

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/brain", brainRoutes);
app.use("/api/org", orgRoutes);
app.use("/api/distributors", distributorRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/followups", followupRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/downline", downlineRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/keys", keysRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/v1", v1Routes);

app.use("/api/v1/openapi.json", (_req, res) => res.json(openapi));

app.use((req, res) => res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` }));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[api] error:", err?.message || err);
  res.status(err?.status || 500).json({ error: err?.message || "Error interno del servidor" });
});
