import assert from "node:assert/strict";
import test from "node:test";
import { approvalStatusLabel, completionBlockReason } from "../app/app/approval-policy.ts";

test("evidência obrigatória bloqueia conclusão antes da aprovação", () => {
  assert.match(completionBlockReason({ evidenceRequired: true, evidence: "", approvalRequired: true }, "pending"), /evidência/);
});

test("aprovação pendente e pedido de alteração mantêm a etapa aberta", () => {
  assert.match(completionBlockReason({ evidence: "ata.pdf", approvalRequired: true }, "pending"), /aguardando aprovação/);
  assert.match(completionBlockReason({ evidence: "ata.pdf", approvalRequired: true }, "changes_requested"), /alterações solicitadas/);
  assert.equal(approvalStatusLabel("changes_requested"), "Alterações solicitadas");
});

test("aprovação recebida libera a conclusão", () => {
  assert.equal(completionBlockReason({ evidenceRequired: true, evidence: "ata.pdf", approvalRequired: true }, "approved"), null);
});
