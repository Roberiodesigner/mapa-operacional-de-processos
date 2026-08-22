import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { translateSqliteQuery } from "../platform/hostinger-env.ts";

test("runtime da Hostinger usa Next.js, Node e MySQL sem dependências Cloudflare", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.match(packageJson.scripts.start, /migrate-mysql\.mjs/);
  assert.equal(packageJson.dependencies.mysql2, "3.14.4");
  assert.equal(packageJson.devDependencies.vinext, undefined);
  assert.equal(packageJson.devDependencies.wrangler, undefined);
  assert.equal(packageJson.devDependencies["@cloudflare/vite-plugin"], undefined);
});

test("camada de compatibilidade converte consultas SQLite usadas pela aplicação", () => {
  assert.equal(
    translateSqliteQuery("INSERT OR IGNORE INTO workspaces (id) VALUES (?)").sql,
    "INSERT IGNORE INTO workspaces (id) VALUES (?)",
  );
  assert.match(
    translateSqliteQuery("SELECT id FROM workspaces WHERE created_at >= datetime('now', '-60 minutes')").sql,
    /DATE_SUB\(CURRENT_TIMESTAMP, INTERVAL 60 MINUTE\)/,
  );
  assert.match(
    translateSqliteQuery("INSERT INTO billing_plans (code, name) VALUES (?, ?) ON CONFLICT(code) DO UPDATE SET name = excluded.name").sql,
    /ON DUPLICATE KEY UPDATE name = VALUES\(name\)/,
  );
  assert.equal(translateSqliteQuery("CREATE TABLE ignored (id TEXT)").schemaOnly, true);
});

test("migração cobre dados, administração, cobrança e revisão pública", async () => {
  const migration = await readFile(new URL("../mysql/0000_hostinger.sql", import.meta.url), "utf8");
  for (const table of [
    "workspaces",
    "platform_admins",
    "billing_plans",
    "workspace_licenses",
    "project_states",
    "map_records",
    "node_records",
    "node_file_records",
    "approval_records",
    "workspace_members",
    "review_link_records",
    "review_comment_markers",
  ]) assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(migration, /ENGINE=InnoDB/);
  assert.match(migration, /utf8mb4_unicode_ci/);
});

test("variáveis de produção são documentadas sem credenciais reais", async () => {
  const example = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  for (const key of ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "PRIVATE_UPLOADS_PATH"]) {
    assert.match(example, new RegExp(`^${key}=`, "m"));
  }
  assert.doesNotMatch(example, /sk_live_|SUPABASE_SERVICE_ROLE\s*=|mysql:\/\/.+@/);
});
