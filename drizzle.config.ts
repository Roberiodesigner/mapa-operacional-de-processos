import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./platform/hostinger-env";

const databaseUrl = normalizeDatabaseUrl(
  process.env.DATABASE_URL,
  process.env.DATABASE_PASSWORD,
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_DB_HOST,
);

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle-postgres",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
