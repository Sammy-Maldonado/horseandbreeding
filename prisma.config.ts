import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer auto-loads `.env` (v6 did). Node's native loader restores
// that behaviour without adding a dependency; the file is optional so a clean
// environment (CI: no `.env`, no DATABASE_URL) keeps working.
try {
  process.loadEnvFile();
} catch {
  // No .env present — fine for `prisma generate` and `prisma validate`.
}

// `env()` resolves eagerly at config load, and the schema engine requires a
// datasource argument even for offline commands — but `prisma generate` (and
// therefore `postinstall`) must succeed with no DATABASE_URL at all. Declare
// the datasource only when the variable exists; commands that genuinely need
// database access then fail clearly when it is absent instead of silently
// succeeding with an empty result.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(process.env.DATABASE_URL
    ? { datasource: { url: env("DATABASE_URL") } }
    : {}),
});
