import assert from "node:assert/strict";
import test from "node:test";
import { calculateOperationalState, wouldCreateDependencyCycle } from "../app/app/operational-engine.ts";

const node = (id, overrides = {}) => ({ id, parentId: null, title: id, status: "not_started", progress: 0, priority: "Média", assignee: "Robério", due: "", blockedReason: "", ...overrides });

test("pai herda a média de progresso dos filhos", () => {
  const result = calculateOperationalState([
    node("pai"),
    node("a", { parentId: "pai", status: "done", progress: 100 }),
    node("b", { parentId: "pai", status: "in_progress", progress: 50 }),
  ], []);
  assert.equal(result.byId.get("pai").computedProgress, 75);
  assert.equal(result.byId.get("pai").computedStatus, "in_progress");
});

test("dependência pendente bloqueia e conclusão libera a tarefa", () => {
  const dependency = [{ id: "d1", nodeId: "publicar", dependsOnId: "aprovar" }];
  const blocked = calculateOperationalState([node("aprovar"), node("publicar")], dependency);
  assert.equal(blocked.byId.get("publicar").computedStatus, "blocked");
  assert.match(blocked.byId.get("publicar").computedBlockReason, /Aguardando aprovar/);
  const released = calculateOperationalState([node("aprovar", { status: "done", progress: 100 }), node("publicar")], dependency);
  assert.equal(released.byId.get("publicar").computedStatus, "not_started");
});

test("dependência circular é impedida", () => {
  const dependencies = [{ id: "d1", nodeId: "b", dependsOnId: "a" }];
  assert.equal(wouldCreateDependencyCycle(dependencies, "a", "b"), true);
  assert.equal(wouldCreateDependencyCycle(dependencies, "c", "b"), false);
});

test("saúde e próxima ação reagem a bloqueios", () => {
  const result = calculateOperationalState([
    node("integracoes", { title: "Integrações", status: "blocked", priority: "Crítica", blockedReason: "Aguardando API" }),
    node("testes", { title: "Testes" }),
  ], [{ id: "d1", nodeId: "testes", dependsOnId: "integracoes" }]);
  assert.ok(result.health < 100);
  assert.equal(result.blockedCount, 2);
  assert.match(result.nextAction.title, /Integrações/);
});
