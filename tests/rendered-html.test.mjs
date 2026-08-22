import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("página pública contém a proposta e os planos", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Transforme processos em mapas/);
  assert.match(page, /billing_plans WHERE active = TRUE/);
  assert.match(page, /plans\.map/);
  assert.match(page, /Testar grátis por \{plan\.trial_days\} dias/);
});

test("painel comercial centraliza planos e integração Asaas", async () => {
  const [admin, billing, webhook, migration] = await Promise.all([
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/webhook/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  ]);
  assert.match(admin, />Integrações</);
  assert.match(admin, /As alterações aparecem automaticamente na página pública/);
  assert.match(admin, /ASAAS_API_KEY/);
  assert.match(billing, /chargeTypes: \["RECURRENT"\]/);
  assert.match(billing, /billing_checkout_records/);
  assert.match(webhook, /asaas-access-token/);
  assert.match(webhook, /providerEventId: event\.id/);
  assert.match(migration, /create table if not exists public\.workspace_licenses/i);
  assert.match(migration, /create table if not exists public\.billing_checkout_records/i);
});

test("aplicação usa autenticação e persistência Supabase Postgres na Hostinger", async () => {
  const [appPage, runtime, migration] = await Promise.all([
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../platform/hostinger-env.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  ]);
  assert.match(appPage, /requireChatGPTUser/);
  assert.match(runtime, /postgres\(databaseUrl\(\)/);
  assert.match(runtime, /class PostgresDatabase/);
  assert.match(migration, /create table if not exists public\.workspaces/i);
  assert.match(migration, /create table if not exists public\.project_states/i);
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
  const [adminApi, adminLoginApi, commercial] = await Promise.all([
    readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/admin-login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/_lib/commercial.ts", import.meta.url), "utf8"),
  ]);
  assert.match(adminApi, /isPlatformAdmin\(user\.email\)/);
  assert.match(adminApi, /status: 403/);
  assert.match(adminLoginApi, /isPlatformAdmin\(data\.user\.email\)/);
  assert.match(adminLoginApi, /signOut/);
  assert.match(adminLoginApi, /status: 403/);
  const configuredAdminCheck = commercial.indexOf("normalized === configuredAdmin");
  const databaseFallback = commercial.indexOf("await ensureCommercialSchema();", configuredAdminCheck);
  assert.ok(configuredAdminCheck >= 0 && databaseFallback > configuredAdminCheck,
    "o e-mail administrativo configurado deve ser autorizado antes da consulta ao Postgres");
});

test("painel administrativo trata respostas vazias e logout usa a origem pública", async () => {
  const [dashboard, logout, adminRoute] = await Promise.all([
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /response\.text\(\)/);
  assert.match(dashboard, /Tentar novamente/);
  assert.match(logout, /publicOrigin\(request\)/);
  assert.match(adminRoute, /publicOrigin\(request\).*api\/billing\/webhook/s);
});

test("arquivos usam Supabase Storage privado, autorização e metadados relacionais", async () => {
  const [supabase, route, migration] = await Promise.all([
    readFile(new URL("../app/supabase/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/files/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  ]);
  assert.match(supabase, /createServerClient/);
  assert.match(route, /getWorkspaceAccessContext/);
  assert.match(route, /workspace_id = \?/);
  assert.match(route, /storage\.from/);
  assert.match(route, /bucket\.upload/);
  assert.match(route, /cache-control.*private, no-store/);
  assert.match(migration, /create table if not exists public\.node_file_records/i);
  assert.match(migration, /create table if not exists public\.audit_log_records/i);
});

test("aprovações possuem autorização, histórico e decisões persistentes", async () => {
  const [route, migration, app] = await Promise.all([
    readFile(new URL("../app/api/approvals/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/app/workspace-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /getWorkspaceAccessContext/);
  assert.match(route, /workspace_id = \?/);
  assert.match(route, /approval_changes_requested/);
  assert.match(route, /Anexe a evidência obrigatória/);
  assert.match(migration, /create table if not exists public\.approval_records/i);
  assert.match(migration, /create table if not exists public\.approval_event_records/i);
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
