import { env } from "@/platform/hostinger-env";
import { ensureCommercialSchema, recordBillingEvent, runtimeValue, updateLicenseFromProvider } from "../../_lib/commercial";
import { parseAsaasExternalReference, periodEnd, safeTokenEqual } from "../../_lib/asaas-billing";

type AsaasEntity = {
  id?: string;
  customer?: string;
  subscription?: string | { id?: string };
  externalReference?: string;
  status?: string;
  value?: number;
  netValue?: number;
};

type AsaasEvent = {
  id?: string;
  event?: string;
  payment?: AsaasEntity;
  subscription?: AsaasEntity;
  checkout?: AsaasEntity;
};

type EventContext = { workspaceId: string; planCode: string; checkoutId?: string };

async function resolveEventContext(event: AsaasEvent): Promise<EventContext | null> {
  const checkoutId = String(event.checkout?.id || "");
  if (checkoutId) {
    const checkout = await env.DB.prepare("SELECT workspace_id, plan_code FROM billing_checkout_records WHERE id = ? LIMIT 1").bind(checkoutId).first<{ workspace_id: string; plan_code: string }>();
    if (checkout) return { workspaceId: checkout.workspace_id, planCode: checkout.plan_code, checkoutId };
  }
  const external = parseAsaasExternalReference(event.payment?.externalReference || event.subscription?.externalReference || event.checkout?.externalReference);
  if (external) return { ...external, checkoutId: checkoutId || undefined };
  const subscriptionId = String(typeof event.payment?.subscription === "string" ? event.payment.subscription : event.subscription?.id || "");
  if (subscriptionId) {
    const license = await env.DB.prepare("SELECT workspace_id, plan_code FROM workspace_licenses WHERE provider_subscription_id = ? LIMIT 1").bind(subscriptionId).first<{ workspace_id: string; plan_code: string }>();
    if (license) return { workspaceId: license.workspace_id, planCode: license.plan_code, checkoutId: checkoutId || undefined };
  }
  const customerId = String(event.payment?.customer || event.subscription?.customer || event.checkout?.customer || "");
  if (customerId) {
    const license = await env.DB.prepare("SELECT workspace_id, plan_code FROM workspace_licenses WHERE provider_customer_id = ? LIMIT 1").bind(customerId).first<{ workspace_id: string; plan_code: string }>();
    if (license) return { workspaceId: license.workspace_id, planCode: license.plan_code, checkoutId: checkoutId || undefined };
  }
  return null;
}

export async function POST(request: Request) {
  const expectedToken = runtimeValue("ASAAS_WEBHOOK_TOKEN");
  if (!expectedToken) return Response.json({ error: "Webhook Asaas não configurado" }, { status: 503 });
  const receivedToken = request.headers.get("asaas-access-token") || "";
  if (!safeTokenEqual(receivedToken, expectedToken)) return Response.json({ error: "Token do webhook inválido" }, { status: 401 });

  let event: AsaasEvent;
  try {
    event = await request.json() as AsaasEvent;
  } catch {
    return Response.json({ error: "Evento inválido" }, { status: 400 });
  }
  if (!event.id || !event.event) return Response.json({ error: "Evento incompleto" }, { status: 400 });

  await ensureCommercialSchema();
  const duplicate = await env.DB.prepare("SELECT id FROM billing_event_records WHERE provider_event_id = ? LIMIT 1").bind(event.id).first();
  if (duplicate) return Response.json({ received: true, duplicate: true });

  const context = await resolveEventContext(event);
  const entity = event.payment || event.subscription || event.checkout || {};
  const subscriptionId = String(typeof event.payment?.subscription === "string" ? event.payment.subscription : event.subscription?.id || "");
  const customerId = String(event.payment?.customer || event.subscription?.customer || event.checkout?.customer || "");

  if (context?.checkoutId && event.event.startsWith("CHECKOUT_")) {
    const checkoutStatus = event.event === "CHECKOUT_PAID" ? "paid" : event.event === "CHECKOUT_CANCELED" ? "canceled" : event.event === "CHECKOUT_EXPIRED" ? "expired" : "created";
    await env.DB.prepare("UPDATE billing_checkout_records SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(checkoutStatus, context.checkoutId).run();
  }

  if (context) {
    const plan = await env.DB.prepare("SELECT billing_interval, price_cents FROM billing_plans WHERE code = ? LIMIT 1").bind(context.planCode).first<{ billing_interval: string; price_cents: number }>();
    const activatingEvents = new Set(["CHECKOUT_PAID", "PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
    const suspendedEvents = new Set(["PAYMENT_OVERDUE", "PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE"]);
    const canceledEvents = new Set(["SUBSCRIPTION_INACTIVATED", "SUBSCRIPTION_DELETED"]);
    if (activatingEvents.has(event.event)) {
      const startedAt = new Date();
      await updateLicenseFromProvider({
        workspaceId: context.workspaceId,
        planCode: context.planCode,
        status: "active",
        provider: "asaas",
        providerCustomerId: customerId,
        providerSubscriptionId: subscriptionId,
        periodStart: startedAt.toISOString(),
        periodEnd: periodEnd(plan?.billing_interval || "month", startedAt),
      });
    } else if (suspendedEvents.has(event.event)) {
      await updateLicenseFromProvider({
        workspaceId: context.workspaceId,
        planCode: context.planCode,
        status: event.event === "PAYMENT_OVERDUE" ? "past_due" : "suspended",
        provider: "asaas",
        providerCustomerId: customerId,
        providerSubscriptionId: subscriptionId,
      });
    } else if (canceledEvents.has(event.event)) {
      await updateLicenseFromProvider({
        workspaceId: context.workspaceId,
        planCode: context.planCode,
        status: "canceled",
        provider: "asaas",
        providerCustomerId: customerId,
        providerSubscriptionId: subscriptionId,
        cancelAtPeriodEnd: true,
      });
    } else if (event.event === "SUBSCRIPTION_CREATED" || event.event === "SUBSCRIPTION_UPDATED") {
      await env.DB.prepare("UPDATE workspace_licenses SET provider = 'asaas', provider_customer_id = CASE WHEN ? <> '' THEN ? ELSE provider_customer_id END, provider_subscription_id = CASE WHEN ? <> '' THEN ? ELSE provider_subscription_id END, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ?")
        .bind(customerId, customerId, subscriptionId, subscriptionId, context.workspaceId).run();
    }

    const amountCents = Math.round(Number(entity.value || 0) * 100) || Number(plan?.price_cents || 0);
    await recordBillingEvent({
      workspaceId: context.workspaceId,
      provider: "asaas",
      providerEventId: event.id,
      eventType: event.event,
      status: String(entity.status || ""),
      amountCents,
      currency: "BRL",
      details: { objectId: String(entity.id || ""), checkoutId: context.checkoutId || "", planCode: context.planCode },
    });
  } else {
    await recordBillingEvent({ provider: "asaas", providerEventId: event.id, eventType: event.event, status: String(entity.status || ""), amountCents: Math.round(Number(entity.value || 0) * 100), currency: "BRL", details: { unresolved: true, objectId: String(entity.id || "") } });
  }
  return Response.json({ received: true });
}
