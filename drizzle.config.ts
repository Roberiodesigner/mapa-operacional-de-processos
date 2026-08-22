import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL é obrigatória para os comandos do Drizzle");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle-postgres",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
