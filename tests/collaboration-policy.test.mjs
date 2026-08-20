import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { groupCommentThreads, mentionedMemberEmails, normalizeMemberRole, permissionSummary, roleCan } from "../app/app/collaboration-policy.ts";

test("papéis aplicam permissões diferentes e seguras", () => {
  assert.equal(roleCan("admin", "manage_members"), true);
  assert.equal(roleCan("editor", "edit"), true);
  assert.equal(roleCan("executor", "execute"), true);
  assert.equal(roleCan("commenter", "comment"), true);
  assert.equal(roleCan("viewer", "comment"), false);
  assert.equal(normalizeMemberRole("desconhecido"), "viewer");
  assert.match(permissionSummary("executor"), /Executa etapas/);
});

test("comentários são agrupados em conversas e respostas", () => {
  const root = { id: "c1", parentId: null, resolvedAt: null };
  const reply = { id: "c2", parentId: "c1", resolvedAt: null };
  const grouped = groupCommentThreads([root, reply]);
  assert.deepEqual(grouped.roots.map(item => item.id), ["c1"]);
  assert.deepEqual(grouped.replies.get("c1")?.map(item => item.id), ["c2"]);
});

test("menções reconhecem pessoas do Workspace sem inventar destinatários", () => {
  const members = [{ name: "Ana Souza", email: "ana@empresa.com" }, { name: "Carlos Lima", email: "carlos@empresa.com" }];
  assert.deepEqual(mentionedMemberEmails("@Ana pode revisar?", members), ["ana@empresa.com"]);
  assert.deepEqual(mentionedMemberEmails("@fora teste", members), []);
});

test("rotas de colaboração usam autorização por Workspace e mapa", async () => {
  const [collaboration, comments, nodes, migration] = await Promise.all([
    readFile(new URL("../app/api/collaboration/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/comments/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/nodes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0005_motionless_pepper_potts.sql", import.meta.url), "utf8"),
  ]);
  assert.match(collaboration, /canWorkspace/);
  assert.match(collaboration, /map_permission_records/);
  assert.match(comments, /nodeBelongsToAccessibleMap/);
  assert.match(comments, /notification_records/);
  assert.match(nodes, /canAccessMap/);
  assert.match(nodes, /completionBlockReason/);
  assert.match(migration, /CREATE TABLE `workspace_members`/);
  assert.match(migration, /CREATE TABLE `notification_records`/);
});
