import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeReviewPin, publicReviewNode, reviewDurationDays, reviewLinkIsUsable, visibleReviewNodeIds } from "../app/app/review-policy.ts";

test("link de revisão usa durações permitidas e expira com segurança", () => {
  assert.equal(reviewDurationDays(7), 7);
  assert.equal(reviewDurationDays(90), 90);
  assert.equal(reviewDurationDays(365), 30);
  assert.equal(reviewLinkIsUsable("active", "2026-09-01T00:00:00.000Z", new Date("2026-08-20T00:00:00.000Z")), true);
  assert.equal(reviewLinkIsUsable("revoked", "2026-09-01T00:00:00.000Z", new Date("2026-08-20T00:00:00.000Z")), false);
  assert.equal(reviewLinkIsUsable("active", "2026-08-01T00:00:00.000Z", new Date("2026-08-20T00:00:00.000Z")), false);
});

test("compartilhamento por ramo não revela nós fora da hierarquia", () => {
  const nodes = [
    { id: "root", parentId: null },
    { id: "a", parentId: "root" },
    { id: "a1", parentId: "a" },
    { id: "b", parentId: "root" },
  ];
  assert.deepEqual([...visibleReviewNodeIds(nodes, "a")].sort(), ["a", "a1"]);
  assert.deepEqual([...visibleReviewNodeIds(nodes, null)].sort(), ["a", "a1", "b", "root"]);
});

test("nó público remove informações internas e acessos", () => {
  const visible = new Set(["n1"]);
  const result = publicReviewNode({
    id: "n1", mapId: "map", parentId: "hidden", title: "Entrega", description: "Versão para revisão",
    type: "Etapa", status: "in_progress", priority: "Alta", assignee: "Equipe", due: "2026-08-30",
    progress: 140, x: 20, y: 30, variant: "template_stage",
    info: "segredo", accessUser: "admin@empresa.com", accountId: "123", evidence: "privado.pdf",
  }, visible);
  assert.equal(result.parentId, null);
  assert.equal(result.progress, 100);
  assert.equal("info" in result, false);
  assert.equal("accessUser" in result, false);
  assert.equal("accountId" in result, false);
  assert.equal("evidence" in result, false);
});

test("marcação visual normaliza coordenadas do card e do canvas", () => {
  assert.deepEqual(normalizeReviewPin("node", 1.5, -1), { type: "node", x: 1, y: 0 });
  assert.deepEqual(normalizeReviewPin("canvas", 3000, -20), { type: "canvas", x: 2600, y: 0 });
  assert.equal(normalizeReviewPin("node", "x", 0.5), null);
});

test("rotas de revisão usam token em hash, revogação, rate limit e isolamento", async () => {
  const [helper, ownerRoute, publicRoute, page] = await Promise.all([
    readFile(new URL("../app/api/_lib/review-links.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/review-links/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/public-review/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/review/[token]/public-review.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(helper, /SHA-256/);
  assert.match(helper, /review_rate_limit_records/);
  assert.match(ownerRoute, /review_link_revoked/);
  assert.match(ownerRoute, /canAccessMap/);
  assert.match(publicRoute, /visibleReviewNodeIds/);
  assert.match(publicRoute, /guest:/);
  assert.match(page, /Marcar ponto/);
  assert.match(page, /não precisa fazer login|Nenhuma alteração direta/i);
});
