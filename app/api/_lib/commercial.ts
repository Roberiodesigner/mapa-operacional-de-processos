import { env } from "@/platform/hostinger-env";
import { DEFAULT_COMMERCIAL_PLANS, deriveWorkspaceEntitlement, type WorkspaceEntitlement } from "../../commercial-policy";

export type WorkspaceCommercialRow = {
  id: string;
  name: string;
  owner_email: string;
  trial_started_at: string;
  trial_ends_at: string;
  plan: string;
};

export type LicenseRow = {
  id: string;
  workspace_id: string;
  plan_code: string;
  status: string;
  provider: string;
  provider_customer_id: string;
  provider_subscription_id: string;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  cancel_at_period_end: number;
  granted_by: string;
  created_at: string;
  updated_at: string;
};

let schemaReady: Promise<void> | null = null;

export function runtimeValue(key: string) {
  const value = (env as unknown as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function ensureCommercialSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY NOT NULL, owner_email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, trial_started_at TEXT NOT NULL, trial_ends_at TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'trial', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS platform_admins (email TEXT PRIMARY KEY NOT NULL, role TEXT NOT NULL DEFAULT 'super_admin', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS billing_plans (code TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'BRL', billing_interval TEXT NOT NULL, provider_price_id TEXT NOT NULL DEFAULT '', trial_days INTEGER NOT NULL DEFAULT 7, active INTEGER NOT NULL DEFAULT 1, highlighted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS workspace_licenses (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE, plan_code TEXT NOT NULL DEFAULT 'trial', status TEXT NOT NULL DEFAULT 'trialing', provider TEXT NOT NULL DEFAULT 'manual', provider_customer_id TEXT NOT NULL DEFAULT '', provider_subscription_id TEXT NOT NULL DEFAULT '', current_period_started_at TEXT, current_period_ends_at TEXT, cancel_at_period_end INTEGER NOT NULL DEFAULT 0, granted_by TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS billing_event_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL, provider TEXT NOT NULL DEFAULT 'manual', provider_event_id TEXT UNIQUE, event_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT '', amount_cents INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'BRL', details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS billing_checkout_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, plan_code TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'asaas', status TEXT NOT NULL DEFAULT 'created', expires_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS discount_codes (id TEXT PRIMARY KEY NOT NULL, code TEXT NOT NULL UNIQUE, kind TEXT NOT NULL DEFAULT 'percent', value INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, max_redemptions INTEGER, redemption_count INTEGER NOT NULL DEFAULT 0, expires_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS workspace_licenses_status_idx ON workspace_licenses(status, plan_code)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS billing_events_workspace_idx ON billing_event_records(workspace_id, created_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS billing_events_type_idx ON billing_event_records(event_type, created_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS billing_checkouts_workspace_idx ON billing_checkout_records(workspace_id, created_at)"),
    ]);
    for (const plan of DEFAULT_COMMERCIAL_PLANS) {
      await env.DB.prepare("INSERT OR IGNORE INTO billing_plans (code, name, description, price_cents, currency, billing_interval, trial_days, active, highlighted) VALUES (?, ?, ?, ?, 'BRL', ?, 7, 1, ?)")
        .bind(plan.code, plan.name, plan.description, plan.priceCents, plan.interval, plan.code === "annual" ? 1 : 0)
        .run();
    }
    const configuredAdmin = runtimeValue("PLATFORM_ADMIN_EMAIL").toLowerCase();
    if (configuredAdmin) {
      await env.DB.prepare("INSERT OR IGNORE INTO platform_admins (email, role, status) VALUES (?, 'super_admin', 'active')")
        .bind(configuredAdmin).run();
    }
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM platform_admins WHERE status = 'active'").first<{ total: number }>();
    if (!Number(count?.total)) {
      const firstOwner = await env.DB.prepare("SELECT lower(owner_email) AS email FROM workspaces ORDER BY created_at ASC LIMIT 1").first<{ email: string }>();
      if (firstOwner?.email) {
        await env.DB.prepare("INSERT OR IGNORE INTO platform_admins (email, role, status) VALUES (?, 'super_admin', 'active')")
          .bind(firstOwner.email).run();
      }
    }
  })().catch(error => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

export async function isPlatformAdmin(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const configuredAdmin = runtimeValue("PLATFORM_ADMIN_EMAIL").toLowerCase();
  if (configuredAdmin && normalized === configuredAdmin) return true;
  await ensureCommercialSchema();
  const row = await env.DB.prepare("SELECT email FROM platform_admins WHERE lower(email) = ? AND role = 'super_admin' AND status = 'active' LIMIT 1")
    .bind(normalized).first();
  return Boolean(row);
}

export async function ensureWorkspaceLicense(workspace: WorkspaceCommercialRow) {
  await ensureCommercialSchema();
  await env.DB.prepare("INSERT OR IGNORE INTO workspace_licenses (id, workspace_id, plan_code, status, provider, current_period_started_at, current_period_ends_at) VALUES (?, ?, ?, ?, 'manual', ?, ?)")
    .bind(
      crypto.randomUUID(),
      workspace.id,
      workspace.plan === "trial" ? "trial" : workspace.plan,
      workspace.plan === "trial" ? "trialing" : "active",
      workspace.trial_started_at,
      workspace.plan === "trial" ? workspace.trial_ends_at : null,
    ).run();
  return env.DB.prepare("SELECT id, workspace_id, plan_code, status, provider, provider_customer_id, provider_subscription_id, current_period_started_at, current_period_ends_at, cancel_at_period_end, granted_by, created_at, updated_at FROM workspace_licenses WHERE workspace_id = ? LIMIT 1")
    .bind(workspace.id).first<LicenseRow>();
}

export async function getWorkspaceEntitlement(workspace: WorkspaceCommercialRow): Promise<{ license: LicenseRow | null; entitlement: WorkspaceEntitlement }> {
  const license = await ensureWorkspaceLicense(workspace);
  return {
    license: license ?? null,
    entitlement: deriveWorkspaceEntitlement({
      workspacePlan: license?.plan_code || workspace.plan,
      trialEndsAt: workspace.trial_ends_at,
      licenseStatus: license?.status,
      currentPeriodEndsAt: license?.current_period_ends_at,
    }),
  };
}

export async function workspaceCommercialCanWrite(workspaceId: string) {
  await ensureCommercialSchema();
  const workspace = await env.DB.prepare("SELECT w.id, w.name, w.owner_email, w.trial_started_at, w.trial_ends_at, w.plan, l.status AS license_status, l.current_period_ends_at AS license_period_ends_at FROM workspaces w LEFT JOIN workspace_licenses l ON l.workspace_id = w.id WHERE w.id = ? LIMIT 1")
    .bind(workspaceId).first<WorkspaceCommercialRow & { license_status: string | null; license_period_ends_at: string | null }>();
  if (!workspace) return false;
  return deriveWorkspaceEntitlement({ workspacePlan: workspace.plan, trialEndsAt: workspace.trial_ends_at, licenseStatus: workspace.license_status, currentPeriodEndsAt: workspace.license_period_ends_at }).canEdit;
}

export async function recordBillingEvent(input: {
  workspaceId?: string | null;
  provider: string;
  providerEventId?: string | null;
  eventType: string;
  status?: string;
  amountCents?: number;
  currency?: string;
  details?: Record<string, unknown>;
}) {
  await ensureCommercialSchema();
  return env.DB.prepare("INSERT OR IGNORE INTO billing_event_records (id, workspace_id, provider, provider_event_id, event_type, status, amount_cents, currency, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(
      crypto.randomUUID(),
      input.workspaceId || null,
      input.provider,
      input.providerEventId || null,
      input.eventType,
      input.status || "",
      Math.max(0, Math.round(input.amountCents || 0)),
      (input.currency || "BRL").toUpperCase(),
      JSON.stringify(input.details || {}),
    ).run();
}

export function asaasEnvironment(): "sandbox" | "production" {
  return runtimeValue("ASAAS_ENVIRONMENT").toLowerCase() === "production" ? "production" : "sandbox";
}

export function asaasApiConfigured() {
  return Boolean(runtimeValue("ASAAS_API_KEY"));
}

export function asaasWebhookConfigured() {
  const token = runtimeValue("ASAAS_WEBHOOK_TOKEN");
  return token.length >= 32 && token.length <= 255 && !/\s/.test(token);
}

export function asaasBillingConfigured() {
  return asaasApiConfigured() && asaasWebhookConfigured();
}

export async function updateLicenseFromProvider(input: {
  workspaceId: string;
  planCode: string;
  status: string;
  provider?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}) {
  await ensureCommercialSchema();
  const provider = input.provider || "manual";
  const existing = await env.DB.prepare("SELECT id FROM workspace_licenses WHERE workspace_id = ? LIMIT 1").bind(input.workspaceId).first<{ id: string }>();
  if (existing) {
    await env.DB.prepare("UPDATE workspace_licenses SET plan_code = ?, status = ?, provider = ?, provider_customer_id = CASE WHEN ? <> '' THEN ? ELSE provider_customer_id END, provider_subscription_id = CASE WHEN ? <> '' THEN ? ELSE provider_subscription_id END, current_period_started_at = COALESCE(?, current_period_started_at), current_period_ends_at = COALESCE(?, current_period_ends_at), cancel_at_period_end = ?, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ?")
      .bind(input.planCode, input.status, provider, input.providerCustomerId || "", input.providerCustomerId || "", input.providerSubscriptionId || "", input.providerSubscriptionId || "", input.periodStart || null, input.periodEnd || null, input.cancelAtPeriodEnd ? 1 : 0, input.workspaceId).run();
  } else {
    await env.DB.prepare("INSERT INTO workspace_licenses (id, workspace_id, plan_code, status, provider, provider_customer_id, provider_subscription_id, current_period_started_at, current_period_ends_at, cancel_at_period_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), input.workspaceId, input.planCode, input.status, provider, input.providerCustomerId || "", input.providerSubscriptionId || "", input.periodStart || null, input.periodEnd || null, input.cancelAtPeriodEnd ? 1 : 0).run();
  }
  if (/^[a-z0-9-]{2,40}$/.test(input.planCode)) await env.DB.prepare("UPDATE workspaces SET plan = ? WHERE id = ?").bind(input.planCode, input.workspaceId).run();
}
