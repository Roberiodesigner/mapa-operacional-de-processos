import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./platform/hostinger-env";

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL, process.env.DATABASE_PASSWORD);

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
