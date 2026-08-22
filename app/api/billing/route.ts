import { env } from "@/platform/hostinger-env";
import { getWorkspaceAccessContext } from "../_lib/collaboration";
import { asaasBillingConfigured, ensureCommercialSchema, getWorkspaceEntitlement, recordBillingEvent } from "../_lib/commercial";
import { asaasCheckoutUrl, asaasExternalReference, asaasRequest } from "../_lib/asaas-billing";

type PlanRow = { code: string; name: string; description: string; price_cents: number; currency: string; billing_interval: "month" | "year"; trial_days: number; active: number; highlighted: number };

export async function GET() {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  try {
    await ensureCommercialSchema();
    const commercial = await getWorkspaceEntitlement(context.workspace);
    const plans = await env.DB.prepare("SELECT code, name, description, price_cents, currency, billing_interval, trial_days, active, highlighted FROM billing_plans WHERE active = 1 ORDER BY highlighted DESC, price_cents ASC").all<PlanRow>();
    return Response.json({
      workspace: { id: context.workspace.id, name: context.workspace.name, ownerEmail: context.workspace.owner_email },
      canManageBilling: context.role === "owner",
      plans: plans.results,
      license: commercial.license ? {
        planCode: commercial.license.plan_code,
        status: commercial.license.status,
        provider: commercial.license.provider,
        currentPeriodEndsAt: commercial.license.current_period_ends_at,
        cancelAtPeriodEnd: Boolean(commercial.license.cancel_at_period_end),
      } : null,
      entitlement: commercial.entitlement,
      checkoutConfigured: asaasBillingConfigured(),
      checkoutProvider: "Asaas",
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar a assinatura" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  if (context.role !== "owner") return Response.json({ error: "Somente o proprietário administra a assinatura" }, { status: 403 });
  try {
    await ensureCommercialSchema();
    const body = await request.json() as { action?: string; planCode?: string };
    if (body.action !== "checkout") return Response.json({ error: "Ação inválida" }, { status: 400 });
    if (!body.planCode || !/^[a-z0-9-]{2,40}$/.test(body.planCode)) return Response.json({ error: "Plano inválido" }, { status: 400 });
    if (!asaasBillingConfigured()) return Response.json({ error: "O checkout Asaas está preparado, mas a integração ainda precisa ser conectada pelo administrador", configurationRequired: true }, { status: 503 });

    const [plan, commercial] = await Promise.all([
      env.DB.prepare("SELECT code, name, description, price_cents, currency, billing_interval, trial_days, active, highlighted FROM billing_plans WHERE code = ? AND active = 1 LIMIT 1").bind(body.planCode).first<PlanRow>(),
      getWorkspaceEntitlement(context.workspace),
    ]);
    if (!plan) return Response.json({ error: "Plano indisponível" }, { status: 404 });
    if (commercial.entitlement.status === "active" && commercial.entitlement.planCode === plan.code) return Response.json({ error: "Este já é o plano ativo do Workspace" }, { status: 409 });

    const reusable = await env.DB.prepare("SELECT id FROM billing_checkout_records WHERE workspace_id = ? AND plan_code = ? AND provider = 'asaas' AND status = 'created' AND created_at >= datetime('now', '-60 minutes') ORDER BY created_at DESC LIMIT 1")
      .bind(context.workspace.id, plan.code).first<{ id: string }>();
    if (reusable?.id) return Response.json({ url: asaasCheckoutUrl(reusable.id), reused: true });

    const origin = new URL(request.url).origin;
    const now = new Date();
    const nextDueDate = now.toISOString().slice(0, 19).replace("T", " ");
    const checkout = await asaasRequest<{ id?: string }>("/checkouts", {
      method: "POST",
      body: {
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        minutesToExpire: 60,
        externalReference: asaasExternalReference(context.workspace.id, plan.code),
        callback: {
          cancelUrl: `${origin}/conta?checkout=canceled`,
          expiredUrl: `${origin}/conta?checkout=expired`,
          successUrl: `${origin}/conta?checkout=success`,
        },
        items: [{ name: `Mapa Operacional — ${plan.name}`, description: plan.description || `Licença ${plan.name}`, quantity: 1, value: plan.price_cents / 100 }],
        customerData: { name: context.user.displayName, email: context.user.email },
        subscription: { cycle: plan.billing_interval === "year" ? "YEARLY" : "MONTHLY", nextDueDate },
      },
    });
    if (!checkout.id) throw new Error("O Asaas não retornou o identificador do checkout");
    const expiresAt = new Date(now.getTime() + 60 * 60_000).toISOString();
    await env.DB.prepare("INSERT INTO billing_checkout_records (id, workspace_id, plan_code, provider, status, expires_at) VALUES (?, ?, ?, 'asaas', 'created', ?)")
      .bind(checkout.id, context.workspace.id, plan.code, expiresAt).run();
    await recordBillingEvent({ workspaceId: context.workspace.id, provider: "asaas", eventType: "checkout.created", status: "created", amountCents: plan.price_cents, currency: plan.currency, details: { checkoutId: checkout.id, planCode: plan.code } });
    return Response.json({ url: asaasCheckoutUrl(checkout.id) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível abrir o checkout Asaas" }, { status: 500 });
  }
}
