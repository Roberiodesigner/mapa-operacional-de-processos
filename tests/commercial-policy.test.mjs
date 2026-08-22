import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_COMMERCIAL_PLANS, deriveWorkspaceEntitlement, normalizeCommercialStatus } from "../app/commercial-policy.ts";

test("catálogo padrão preserva os planos mensal e anual", () => {
  assert.deepEqual(DEFAULT_COMMERCIAL_PLANS.map(plan => [plan.code, plan.priceCents]), [["monthly", 500], ["annual", 4900]]);
});

test("trial ativo permite edição e trial vencido preserva somente leitura", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");
  const active = deriveWorkspaceEntitlement({ workspacePlan: "trial", trialEndsAt: "2026-08-27T12:00:00.000Z", licenseStatus: "trialing", now });
  const expired = deriveWorkspaceEntitlement({ workspacePlan: "trial", trialEndsAt: "2026-08-19T12:00:00.000Z", licenseStatus: "trialing", now });
  assert.equal(active.canEdit, true);
  assert.equal(active.daysRemaining, 7);
  assert.equal(expired.status, "expired");
  assert.equal(expired.readOnly, true);
});

test("licença paga ativa respeita validade e status comerciais são validados", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");
  assert.equal(deriveWorkspaceEntitlement({ workspacePlan: "monthly", trialEndsAt: "", licenseStatus: "active", currentPeriodEndsAt: "2026-09-20T12:00:00.000Z", now }).canEdit, true);
  assert.equal(deriveWorkspaceEntitlement({ workspacePlan: "monthly", trialEndsAt: "", licenseStatus: "past_due", now }).canEdit, false);
  assert.equal(normalizeCommercialStatus("suspended"), "suspended");
  assert.equal(normalizeCommercialStatus("owner"), null);
});
