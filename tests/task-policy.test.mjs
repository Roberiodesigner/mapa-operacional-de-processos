import assert from "node:assert/strict";
import test from "node:test";
import { isAssignedTo, taskMatchesFilter, tasksForUser } from "../app/app/task-policy.ts";

const task = (overrides = {}) => ({ id: "n1", mapId: "m1", parentId: "root", title: "Configurar campanha", type: "Tarefa", status: "in_progress", priority: "Alta", assignee: "Robério", due: "2026-08-20", progress: 50, blockedReason: "", ...overrides });

test("atribuição reconhece nome com ou sem acento e e-mail", () => {
  const user = { name: "Roberio Lima", email: "roberio@empresa.com" };
  assert.equal(isAssignedTo(task(), user), true);
  assert.equal(isAssignedTo(task({ assignee: "roberio@empresa.com" }), user), true);
  assert.equal(isAssignedTo(task({ assignee: "Ana" }), user), false);
});

test("filtros separam hoje, atrasadas, bloqueadas e concluídas", () => {
  assert.equal(taskMatchesFilter(task(), "today", "2026-08-20"), true);
  assert.equal(taskMatchesFilter(task({ due: "2026-08-19" }), "overdue", "2026-08-20"), true);
  assert.equal(taskMatchesFilter(task({ status: "blocked" }), "blocked", "2026-08-20"), true);
  assert.equal(taskMatchesFilter(task({ status: "done" }), "done", "2026-08-20"), true);
});

test("central pessoal exclui notas de conhecimento", () => {
  const user = { name: "Roberio Lima", email: "roberio@empresa.com" };
  assert.equal(tasksForUser([task(), task({ id: "note", type: "Nota" })], user).length, 1);
});
