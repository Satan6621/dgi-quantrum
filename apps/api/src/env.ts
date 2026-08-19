import "dotenv/config";

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 4000),
  JWT_SECRET: process.env.JWT_SECRET || "naio-super-secret-change-me",
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  APP_URL: (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, ""),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_BASE_URL: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  RATE_LIMIT_PER_IP: Number(process.env.RATE_LIMIT_PER_IP || 600),
  LOGIN_RATE_LIMIT: Number(process.env.LOGIN_RATE_LIMIT || 10),
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "no-reply@dgi-quantrum.local",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_CURRENCY: process.env.STRIPE_CURRENCY || "usd",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_FROM: process.env.TWILIO_FROM || "+14155238886",
};

if (env.NODE_ENV === "production" && env.JWT_SECRET === "naio-super-secret-change-me") {
  throw new Error("JWT_SECRET es obligatorio en producción");
}

export const AI_ENGINE: "openai" | "rule" =
  env.OPENAI_API_KEY ? "openai" : "rule";