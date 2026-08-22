import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("página pública contém a proposta e os planos", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Transforme processos em mapas/);
  assert.match(page, /billing_plans WHERE active = 1/);
  assert.match(page, /plans\.map/);
  assert.match(page, /Testar grátis por \{plan\.trial_days\} dias/);
});

test("painel comercial centraliza planos e integração Asaas", async () => {
  const [admin, billing, webhook, migration] = await Promise.all([
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/webhook/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0008_secret_ogun.sql", import.meta.url), "utf8"),
  ]);
  assert.match(admin, />Integrações</);
  assert.match(admin, /As alterações aparecem automaticamente na página pública/);
  assert.match(admin, /ASAAS_API_KEY/);
  assert.match(billing, /chargeTypes: \["RECURRENT"\]/);
  assert.match(billing, /billing_checkout_records/);
  assert.match(webhook, /asaas-access-token/);
  assert.match(webhook, /providerEventId: event\.id/);
  assert.match(migration, /CREATE TABLE `workspace_licenses`/);
  assert.match(migration, /CREATE TABLE `billing_checkout_records`/);
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

test("cliente e administração possuem entradas separadas e a aplicação não expõe atalho administrativo", async () => {
  const [customerLogin, adminLogin, adminPage, workspace, workspaceRoute] = await Promise.all([
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/workspace-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/workspace/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(customerLogin, /mode="login"/);
  assert.doesNotMatch(customerLogin, /href="\/admin/);
  assert.match(adminLogin, /isPlatformAdmin/);
  assert.match(adminPage, /redirect\("\/admin\/login"\)/);
  assert.match(adminPage, /isPlatformAdmin/);
  assert.doesNotMatch(workspace, /Super Admin/);
  assert.doesNotMatch(workspace, /window\.location\.href="\/admin"/);
  assert.doesNotMatch(workspaceRoute, /isSuperAdmin/);
});

test("API administrativa exige login e função administrativa no servidor", async () => {
  const [adminApi, adminLoginApi] = await Promise.all([
    readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/admin-login/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(adminApi, /isPlatformAdmin\(user\.email\)/);
  assert.match(adminApi, /status: 403/);
  assert.match(adminLoginApi, /isPlatformAdmin\(data\.user\.email\)/);
  assert.match(adminLoginApi, /signOut/);
  assert.match(adminLoginApi, /status: 403/);
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

test("presença ao vivo e conflitos usam sincronização protegida", async () => {
  const [app, route, presence] = await Promise.all([
    readFile(new URL("../app/app/workspace-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/realtime/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/app/realtime-presence.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /workspace_presence_records/);
  assert.match(route, /canAccessMap/);
  assert.match(app, /x-workspace-version/);
  assert.match(app, /remoteSyncDecision/);
  assert.match(presence, /Duas pessoas alteraram este mapa/);
  assert.match(presence, /AO VIVO/);
});

test("Minhas tarefas possui filtros e execução rápida", async () => {
  const [app, tasks] = await Promise.all([
    readFile(new URL("../app/app/workspace-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/tasks-page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(app, /setView\("tasks"\)/);
  assert.match(tasks, /Foco inteligente/);
  assert.match(tasks, /Atrasadas/);
  assert.match(tasks, /Bloqueadas/);
  assert.match(tasks, /Abrir etapa/);
});
