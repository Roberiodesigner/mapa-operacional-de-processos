import { env } from "@/platform/hostinger-env";
import { getChatGPTUser } from "../../chatgpt-auth";
import { asaasApiConfigured, asaasBillingConfigured, asaasEnvironment, asaasWebhookConfigured, ensureCommercialSchema, isPlatformAdmin, recordBillingEvent } from "../_lib/commercial";
import { asaasRequest } from "../_lib/asaas-billing";
import { normalizeCommercialStatus } from "../../commercial-policy";
import { publicOrigin } from "../../public-origin";

type AdminWorkspaceRow = {
  id: string;
  name: string;
  owner_email: string;
  created_at: string;
  trial_ends_at: string;
  workspace_plan: string;
  license_status: string | null;
  plan_code: string | null;
  provider: string | null;
  current_period_ends_at: string | null;
  member_count: number;
  map_count: number;
  node_count: number;
};

async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "Autenticação necessária" }, { status: 401 }) };
  if (!await isPlatformAdmin(user.email)) return { error: Response.json({ error: "Acesso exclusivo do Super Admin" }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  try {
    await ensureCommercialSchema();
    const [workspaces, plans, events] = await Promise.all([
      env.DB.prepare("SELECT w.id, w.name, w.owner_email, w.created_at, w.trial_ends_at, w.plan AS workspace_plan, l.status AS license_status, l.plan_code, l.provider, l.current_period_ends_at, (SELECT COUNT(*) FROM workspace_members m WHERE m.workspace_id = w.id AND m.status = 'active') AS member_count, (SELECT COUNT(*) FROM map_records mr WHERE mr.workspace_id = w.id) AS map_count, (SELECT COUNT(*) FROM node_records nr WHERE nr.workspace_id = w.id) AS node_count FROM workspaces w LEFT JOIN workspace_licenses l ON l.workspace_id = w.id ORDER BY w.created_at DESC LIMIT 500").all<AdminWorkspaceRow>(),
      env.DB.prepare("SELECT code, name, description, price_cents, currency, billing_interval, provider_price_id, trial_days, active, highlighted, updated_at FROM billing_plans ORDER BY highlighted DESC, price_cents ASC").all(),
      env.DB.prepare("SELECT id, workspace_id, provider, event_type, status, amount_cents, currency, details, created_at FROM billing_event_records ORDER BY created_at DESC LIMIT 100").all(),
    ]);
    const now = Date.now();
    const rows = workspaces.results.map(row => ({
      ...row,
      effective_status: row.license_status || (new Date(row.trial_ends_at).getTime() > now ? "trialing" : "expired"),
    }));
    const planRows = plans.results as Array<{ code: string; price_cents: number; billing_interval: string }>;
    const estimatedMrrCents = rows.filter(row => row.effective_status === "active").reduce((sum, row) => {
      const plan = planRows.find(candidate => candidate.code === row.plan_code);
      if (!plan) return sum;
      return sum + (plan.billing_interval === "year" ? Math.round(plan.price_cents / 12) : plan.price_cents);
    }, 0);
    return Response.json({
      currentAdmin: { name: auth.user.displayName, email: auth.user.email },
      metrics: {
        workspaces: rows.length,
        trials: rows.filter(row => row.effective_status === "trialing").length,
        subscribers: rows.filter(row => row.effective_status === "active").length,
        attention: rows.filter(row => ["past_due", "incomplete", "suspended"].includes(row.effective_status)).length,
        canceled: rows.filter(row => ["canceled", "expired"].includes(row.effective_status)).length,
        estimatedMrrCents,
        maps: rows.reduce((sum, row) => sum + Number(row.map_count || 0), 0),
        nodes: rows.reduce((sum, row) => sum + Number(row.node_count || 0), 0),
      },
      workspaces: rows,
      plans: plans.results,
      events: events.results,
      configuration: {
        checkoutConfigured: asaasBillingConfigured(),
        authentication: "E-mail e senha com autorização administrativa no servidor",
        publicAccessManagedSeparately: true,
        integration: {
          provider: "Asaas",
          environment: asaasEnvironment(),
          apiKeyConfigured: asaasApiConfigured(),
          webhookTokenConfigured: asaasWebhookConfigured(),
          webhookUrl: `${publicOrigin(request)}/api/billing/webhook`,
        },
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar o painel" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  try {
    await ensureCommercialSchema();
    const body = await request.json() as {
      action?: string;
      workspaceId?: string;
      status?: string;
      planCode?: string;
      validUntil?: string | null;
      days?: number;
      code?: string;
      priceCents?: number;
      active?: boolean;
      name?: string;
      description?: string;
      interval?: string;
      trialDays?: number;
      highlighted?: boolean;
      providerPriceId?: string;
    };
    if (body.action === "extend_trial") {
      const days = Math.max(1, Math.min(365, Math.round(Number(body.days) || 7)));
      const workspace = await env.DB.prepare("SELECT id, trial_ends_at FROM workspaces WHERE id = ? LIMIT 1").bind(body.workspaceId || "").first<{ id: string; trial_ends_at: string }>();
      if (!workspace) return Response.json({ error: "Workspace não encontrado" }, { status: 404 });
      const base = Math.max(Date.now(), new Date(workspace.trial_ends_at).getTime());
      const trialEndsAt = new Date(base + days * 86_400_000).toISOString();
      await env.DB.batch([
        env.DB.prepare("UPDATE workspaces SET plan = 'trial', trial_ends_at = ? WHERE id = ?").bind(trialEndsAt, workspace.id),
        env.DB.prepare("UPDATE workspace_licenses SET plan_code = 'trial', status = 'trialing', provider = 'manual', current_period_ends_at = ?, granted_by = ?, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ?").bind(trialEndsAt, auth.user.email.toLowerCase(), workspace.id),
      ]);
      await recordBillingEvent({ workspaceId: workspace.id, provider: "manual", eventType: "admin.trial_extended", status: "trialing", details: { days, actor: auth.user.email.toLowerCase() } });
      return Response.json({ ok: true, message: `Trial estendido por ${days} dias` });
    }
    if (body.action === "set_license") {
      const status = normalizeCommercialStatus(body.status);
      const planCode = body.planCode === "trial" ? "trial" : String(body.planCode || "");
      if (!status || !body.workspaceId) return Response.json({ error: "Dados da licença inválidos" }, { status: 400 });
      if (planCode !== "trial") {
        const validPlan = await env.DB.prepare("SELECT code FROM billing_plans WHERE code = ? LIMIT 1").bind(planCode).first();
        if (!validPlan) return Response.json({ error: "Plano não encontrado" }, { status: 404 });
      }
      const workspace = await env.DB.prepare("SELECT id FROM workspaces WHERE id = ? LIMIT 1").bind(body.workspaceId).first();
      if (!workspace) return Response.json({ error: "Workspace não encontrado" }, { status: 404 });
      const validUntil = body.validUntil && Number.isFinite(new Date(body.validUntil).getTime()) ? new Date(body.validUntil).toISOString() : null;
      await env.DB.batch([
        env.DB.prepare("UPDATE workspaces SET plan = ? WHERE id = ?").bind(planCode, body.workspaceId),
        env.DB.prepare("UPDATE workspace_licenses SET plan_code = ?, status = ?, provider = 'manual', current_period_started_at = CASE WHEN ? = 'active' THEN COALESCE(current_period_started_at, CURRENT_TIMESTAMP) ELSE current_period_started_at END, current_period_ends_at = ?, cancel_at_period_end = ?, granted_by = ?, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ?").bind(planCode, status, status, validUntil, false, auth.user.email.toLowerCase(), body.workspaceId),
      ]);
      await recordBillingEvent({ workspaceId: body.workspaceId, provider: "manual", eventType: "admin.license_updated", status, details: { planCode, validUntil, actor: auth.user.email.toLowerCase() } });
      return Response.json({ ok: true, message: "Licença atualizada" });
    }
    if (body.action === "upsert_plan") {
      const code = String(body.code || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim();
      const interval = body.interval === "year" ? "year" : "month";
      const priceCents = Math.round(Number(body.priceCents));
      const trialDays = Math.max(0, Math.min(90, Math.round(Number(body.trialDays) || 0)));
      const providerPriceId = String(body.providerPriceId || "").trim();
      if (!/^[a-z0-9-]{2,40}$/.test(code) || !name || !Number.isFinite(priceCents) || priceCents < 100) return Response.json({ error: "Dados do plano inválidos" }, { status: 400 });
      await env.DB.prepare("INSERT INTO billing_plans (code, name, description, price_cents, currency, billing_interval, provider_price_id, trial_days, active, highlighted) VALUES (?, ?, ?, ?, 'BRL', ?, ?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET name = excluded.name, description = excluded.description, price_cents = excluded.price_cents, billing_interval = excluded.billing_interval, provider_price_id = excluded.provider_price_id, trial_days = excluded.trial_days, active = excluded.active, highlighted = excluded.highlighted, updated_at = CURRENT_TIMESTAMP")
        .bind(code, name.slice(0, 80), description.slice(0, 300), priceCents, interval, providerPriceId.slice(0, 160), trialDays, body.active !== false, Boolean(body.highlighted)).run();
      await recordBillingEvent({ provider: "manual", eventType: "admin.plan_updated", status: body.active === false ? "inactive" : "active", details: { code, priceCents, interval, actor: auth.user.email.toLowerCase() } });
      return Response.json({ ok: true, message: "Plano salvo e sincronizado" });
    }
    if (body.action === "test_asaas") {
      if (!asaasApiConfigured()) return Response.json({ error: "Adicione ASAAS_API_KEY nas variáveis seguras da hospedagem antes de testar" }, { status: 503 });
      await asaasRequest("/customers?limit=1");
      await recordBillingEvent({ provider: "asaas", eventType: "admin.integration_tested", status: "success", details: { environment: asaasEnvironment(), actor: auth.user.email.toLowerCase() } });
      return Response.json({ ok: true, message: `Conexão Asaas (${asaasEnvironment() === "production" ? "produção" : "sandbox"}) validada` });
    }
    return Response.json({ error: "Ação administrativa inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível executar a ação" }, { status: 500 });
  }
}
