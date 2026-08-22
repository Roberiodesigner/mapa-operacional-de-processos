import assert from "node:assert/strict";
import test from "node:test";
import { presenceIsActive, remoteSyncDecision } from "../app/app/realtime-policy.ts";

test("sincronização atualiza apenas quando o trabalho local está seguro", () => {
  assert.equal(remoteSyncDecision(4, 4, false, false), "noop");
  assert.equal(remoteSyncDecision(4, 5, false, false), "refresh");
  assert.equal(remoteSyncDecision(4, 5, true, false), "defer");
  assert.equal(remoteSyncDecision(4, 5, false, true), "defer");
});

test("presença expira para não mostrar pessoas que já saíram", () => {
  const now = Date.parse("2026-08-20T12:00:00.000Z");
  assert.equal(presenceIsActive("2026-08-20T11:59:30.000Z", now), true);
  assert.equal(presenceIsActive("2026-08-20T11:58:00.000Z", now), false);
});
