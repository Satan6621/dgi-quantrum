import { execSync } from "child_process";
process.env.DATABASE_URL = "file:./test.db";
execSync("npx prisma db push --skip-generate", { stdio: "inherit", env: process.env });
execSync("npx vitest run", { stdio: "inherit", env: process.env, shell: true });
