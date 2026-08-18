import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      DATABASE_URL: "file:./test.db",
      // Evita que los rate-limits interfieran con la suite
      RATE_LIMIT_PER_IP: "100000",
      LOGIN_RATE_LIMIT: "100000",
      JWT_SECRET: "naio-test-secret",
      // Activa la verificación de firma Twilio en los tests del webhook entrante
      TWILIO_AUTH_TOKEN: "test-twilio-token",
    },
    hookTimeout: 30000,
    testTimeout: 20000,
    sequence: { concurrent: false },
  },
});
