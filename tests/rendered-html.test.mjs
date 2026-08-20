import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("página pública contém a proposta e os planos", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Transforme processos em mapas/);
  assert.match(page, /Testar grátis por 7 dias/);
  assert.match(page, /<sup>R\$<\/sup> 5/);
  assert.match(page, /<sup>R\$<\/sup> 49/);
});

test("aplicação usa autenticação e persistência D1", async () => {
  const [appPage, manifest, migration] = await Promise.all([
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_fearless_zodiak.sql", import.meta.url), "utf8"),
  ]);
  assert.match(appPage, /requireChatGPTUser/);
  assert.equal(JSON.parse(manifest).d1, "DB");
  assert.match(migration, /CREATE TABLE `workspaces`/);
  assert.match(migration, /CREATE TABLE `project_states`/);
});

test("arquivos usam armazenamento privado, autorização e metadados relacionais", async () => {
  const [manifest, route, migration] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/files/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0003_furry_blade.sql", import.meta.url), "utf8"),
  ]);
  assert.equal(JSON.parse(manifest).r2, "BUCKET");
  assert.match(route, /getWorkspaceAccessContext/);
  assert.match(route, /workspace_id = \?/);
  assert.match(route, /env\.BUCKET\.put/);
  assert.match(route, /cache-control.*private, no-store/);
  assert.match(migration, /CREATE TABLE `node_file_records`/);
  assert.match(migration, /CREATE TABLE `audit_log_records`/);
});

test("aprovações possuem autorização, histórico e decisões persistentes", async () => {
  const [route, migration, app] = await Promise.all([
    readFile(new URL("../app/api/approvals/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_flat_carlie_cooper.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/app/workspace-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /getWorkspaceAccessContext/);
  assert.match(route, /workspace_id = \?/);
  assert.match(route, /approval_changes_requested/);
  assert.match(route, /Anexe a evidência obrigatória/);
  assert.match(migration, /CREATE TABLE `approval_records`/);
  assert.match(migration, /CREATE TABLE `approval_event_records`/);
  assert.match(app, /PORTAL DO CLIENTE · VISÃO RESTRITA/);
  assert.match(app, /dependências recalculadas/);
});

test("metadados sociais usam a identidade do produto", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /Mapa Operacional/);
  assert.match(layout, /\/og\.png/);
  assert.doesNotMatch(layout, /codex-preview/);
});

test("interface expõe equipe, comentários em thread e notificações", async () => {
  const [app, panels] = await Promise.all([
    readFile(new URL("../app/app/workspace-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/collaboration-panels.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(app, />Equipe</);
  assert.match(app, /NotificationsPanel/);
  assert.match(panels, /Colaboração com controle/);
  assert.match(panels, /Responder/);
  assert.match(panels, /Mencionar:/);
  assert.match(panels, /Resolver/);
});
