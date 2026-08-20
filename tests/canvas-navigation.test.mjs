import assert from "node:assert/strict";
import test from "node:test";
import { centerNodeInViewport, fitNodesInViewport, moveOnlyNode, panWithWheel, resolveWheelIntent, zoomAroundPoint } from "../app/app/canvas-navigation.ts";

test("atalhos de rolagem priorizam espaço, shift e ctrl", () => {
  assert.equal(resolveWheelIntent({ spacePressed: true, shiftKey: true, ctrlKey: true, metaKey: false }), "zoom");
  assert.equal(resolveWheelIntent({ spacePressed: false, shiftKey: true, ctrlKey: false, metaKey: false }), "horizontal");
  assert.equal(resolveWheelIntent({ spacePressed: false, shiftKey: false, ctrlKey: true, metaKey: false }), "vertical");
  assert.equal(resolveWheelIntent({ spacePressed: false, shiftKey: false, ctrlKey: false, metaKey: false }), "none");
});

test("zoom mantém o ponto do mouse na mesma posição visual", () => {
  const result = zoomAroundPoint({ zoom: 1, pan: { x: 0, y: 0 }, pointer: { x: 400, y: 300 }, deltaY: -120 });
  assert.ok(result.zoom > 1);
  assert.ok(Math.abs((400 - result.pan.x) / result.zoom - 400) < 0.001);
  assert.ok(Math.abs((300 - result.pan.y) / result.zoom - 300) < 0.001);
});

test("rolagem controlada move somente no eixo solicitado", () => {
  assert.deepEqual(panWithWheel("horizontal", { x: 10, y: 20 }, 0, 30), { x: -20, y: 20 });
  assert.deepEqual(panWithWheel("vertical", { x: 10, y: 20 }, 0, 30), { x: 10, y: -10 });
});

test("arrastar um card altera somente aquele card", () => {
  const original = [{ id: "a", x: 10, y: 20 }, { id: "b", x: 300, y: 400 }];
  const moved = moveOnlyNode(original, "a", 80, 120);
  assert.deepEqual(moved[0], { id: "a", x: 80, y: 120 });
  assert.deepEqual(moved[1], original[1]);
});

test("foco e enquadramento calculam o centro do viewport", () => {
  assert.deepEqual(centerNodeInViewport({ node: { x: 100, y: 200 }, nodeWidth: 200, nodeHeight: 100, viewportWidth: 800, viewportHeight: 600, zoom: 1 }), { x: 200, y: 50 });
  const fitted = fitNodesInViewport({ nodes: [{ x: 0, y: 0, width: 200, height: 100 }, { x: 800, y: 500, width: 200, height: 100 }], viewportWidth: 900, viewportHeight: 600, padding: 50 });
  assert.ok(fitted.zoom < 1);
  assert.ok(Number.isFinite(fitted.pan.x) && Number.isFinite(fitted.pan.y));
});
