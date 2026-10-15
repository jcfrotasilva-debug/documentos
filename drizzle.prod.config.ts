import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Configuração de migração para bancos remotos (produção/Supabase).
 *
 * Uso:
 *   DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true" \
 *     npx drizzle-kit push --config drizzle.prod.config.ts
 *
 * O arquivo drizzle.config.json continua sendo o padrão local do sandbox.
 */
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("Defina DATABASE_URL antes de rodar o drizzle-kit com a configuração de produção.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
