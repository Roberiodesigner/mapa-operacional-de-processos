import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeDatabaseUrl, translatePostgresCompatibilityQuery } from "../platform/hostinger-env.ts";

test("runtime da Hostinger usa Next.js, Node e Postgres sem dependências Cloudflare ou MySQL", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.match(packageJson.scripts.start, /^next start/);
  assert.equal(packageJson.dependencies.postgres, "3.4.9");
  assert.equal(packageJson.dependencies.mysql2, undefined);
  assert.equal(packageJson.devDependencies.vinext, undefined);
  assert.equal(packageJson.devDependencies.wrangler, undefined);
  assert.equal(packageJson.devDependencies["@cloudflare/vite-plugin"], undefined);
});

test("camada Postgres converte placeholders e compatibilidade legada", () => {
  assert.equal(
    translatePostgresCompatibilityQuery("INSERT OR IGNORE INTO workspaces (id) VALUES (?)").sql,
    "INSERT INTO workspaces (id) VALUES ($1) ON CONFLICT DO NOTHING",
  );
  assert.match(
    translatePostgresCompatibilityQuery("SELECT id FROM workspaces WHERE created_at >= datetime('now', '-60 minutes')").sql,
    /CURRENT_TIMESTAMP - INTERVAL '60 minutes'/,
  );
  assert.equal(
    translatePostgresCompatibilityQuery("INSERT INTO billing_plans (code, name) VALUES (?, ?) ON CONFLICT(code) DO UPDATE SET name = excluded.name").sql,
    "INSERT INTO billing_plans (code, name) VALUES ($1, $2) ON CONFLICT(code) DO UPDATE SET name = excluded.name",
  );
  assert.equal(translatePostgresCompatibilityQuery("CREATE TABLE ignored (id TEXT)").schemaOnly, true);
});

test("DATABASE_URL aceita URI válida e remove aspas adicionadas pela hospedagem", () => {
  const uri = "postgresql://postgres.projeto:SenhaSomenteLetras123@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";
  assert.equal(normalizeDatabaseUrl(uri), uri);
  assert.equal(normalizeDatabaseUrl(`\"${uri}\"`), uri);
  assert.throws(() => normalizeDatabaseUrl("postgresql://valor incompleto"), /DATABASE_URL inválida/);
});

test("senha separada é codificada com segurança na URL do Session pooler", () => {
  const template = "postgresql://postgres.projeto:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";
  const expected = "postgresql://postgres.projeto:Senha%40%23%25%2F%3F%3A@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";
  assert.equal(normalizeDatabaseUrl(template, "Senha@#%/?:"), expected);
  assert.equal(normalizeDatabaseUrl(`\"${template}\"`, "Senha@#%/?:"), expected);
  assert.throws(() => normalizeDatabaseUrl(template), /DATABASE_PASSWORD não configurada/);
});

test("conexão é reconstruída sem depender de DATABASE_URL válida", () => {
  const expected = "postgresql://postgres.projeto:Senha%40%23@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";
  assert.equal(
    normalizeDatabaseUrl(undefined, "Senha@#", "https://projeto.supabase.co", "aws-0-sa-east-1.pooler.supabase.com"),
    expected,
  );
  assert.equal(
    normalizeDatabaseUrl(
      "postgresql://conteudo quebrado@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
      "Senha@#",
      "https://projeto.supabase.co",
    ),
    expected,
  );
});

test("SQL Supabase cobre dados, administração, cobrança, revisão, Storage e RLS", async () => {
  const schema = await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8");
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
  ]) assert.match(schema, new RegExp(`create table if not exists public\\.${table}`, "i"));
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /private\.has_workspace_access/i);
  assert.match(schema, /insert into storage\.buckets/i);
  assert.match(schema, /mapa-operacional-private/);
});

test("variáveis de produção são documentadas sem credenciais reais", async () => {
  const example = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_DB_HOST",
    "DATABASE_URL",
    "DATABASE_PASSWORD",
    "DATABASE_POOL_SIZE",
    "SUPABASE_STORAGE_BUCKET",
  ]) assert.match(example, new RegExp(`^${key}=`, "m"));
  for (const removed of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "PRIVATE_UPLOADS_PATH"]) {
    assert.doesNotMatch(example, new RegExp(`^${removed}=`, "m"));
  }
  assert.doesNotMatch(example, /sk_live_|sb_secret_|SUPABASE_SERVICE_ROLE_KEY=/);
});

test("Drizzle está configurado para PostgreSQL e Postgres.js", async () => {
  const [config, db, runtime] = await Promise.all([
    readFile(new URL("../drizzle.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../platform/hostinger-env.ts", import.meta.url), "utf8"),
  ]);
  assert.match(config, /dialect: "postgresql"/);
  assert.match(config, /DATABASE_URL/);
  assert.match(config, /DATABASE_PASSWORD/);
  assert.match(config, /normalizeDatabaseUrl/);
  assert.match(db, /drizzle-orm\/postgres-js/);
  assert.match(runtime, /prepare: false/);
  assert.match(runtime, /ssl: "require"/);
  assert.doesNotMatch(runtime, /mysql2|cloudflare:workers/);
});
