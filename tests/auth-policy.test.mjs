import assert from "node:assert/strict";
import test from "node:test";
import { authErrorMessage, normalizeEmail, safeReturnTo, validEmail, validPassword } from "../app/auth-policy.ts";

test("retorno do login do cliente nunca aceita área administrativa ou URL externa", () => {
  assert.equal(safeReturnTo("/app?map=abc", "/app"), "/app?map=abc");
  assert.equal(safeReturnTo("/admin", "/app"), "/app");
  assert.equal(safeReturnTo("//malicioso.example", "/app"), "/app");
  assert.equal(safeReturnTo("https://malicioso.example", "/app"), "/app");
});

test("credenciais recebem validação mínima e mensagens administrativas discretas", () => {
  assert.equal(normalizeEmail("  Pessoa@Empresa.COM "), "pessoa@empresa.com");
  assert.equal(validEmail("pessoa@empresa.com"), true);
  assert.equal(validEmail("sem-email"), false);
  assert.equal(validPassword("12345678"), true);
  assert.equal(validPassword("1234567"), false);
  assert.equal(authErrorMessage("admin"), "Não foi possível autorizar este acesso.");
  assert.doesNotMatch(authErrorMessage("admin"), /administrador|cadastrado|existe/i);
});
