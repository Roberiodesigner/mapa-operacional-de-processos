import assert from "node:assert/strict";
import test from "node:test";
import { createTemplateStructure, duplicateMapBundle, processTemplates, suggestMapBlueprint } from "../app/app/map-operations.ts";

test("duplicação de mapa recria hierarquia e dependências sem compartilhar IDs", () => {
  let sequence = 0;
  const result = duplicateMapBundle(
    { id: "mapa-1", title: "Implantação", favorite: true, archived: false, updatedAt: "ontem" },
    [
      { id: "raiz", mapId: "mapa-1", parentId: null, title: "Projeto" },
      { id: "filho", mapId: "mapa-1", parentId: "raiz", title: "Etapa" },
      { id: "outro", mapId: "mapa-2", parentId: null, title: "Fora do mapa" },
    ],
    [{ id: "dep", nodeId: "filho", dependsOnId: "raiz" }],
    () => `novo-${++sequence}`,
    "agora",
  );

  assert.equal(result.map.title, "Implantação (cópia)");
  assert.equal(result.map.favorite, false);
  assert.equal(result.nodes.length, 2);
  assert.equal(result.nodes[1].parentId, result.nodes[0].id);
  assert.equal(result.dependencies.length, 1);
  assert.equal(result.dependencies[0].nodeId, result.nodes[1].id);
  assert.equal(result.dependencies[0].dependsOnId, result.nodes[0].id);
});

test("modelo cria mapa completo com etapas encadeadas", () => {
  let sequence = 0;
  const template = processTemplates.find(item => item.id === "marketing");
  assert.ok(template);
  const result = createTemplateStructure(template, () => `id-${++sequence}`);

  assert.equal(result.stages.length, template.stages.length);
  assert.equal(result.dependencies.length, template.stages.length - 1);
  assert.ok(result.stages.every(stage => stage.parentId === result.rootId));
  assert.equal(result.dependencies[0].dependsOnId, result.stages[0].id);
  assert.equal(result.dependencies[0].nodeId, result.stages[1].id);
});

test("modelo de tráfego pago cria mapa radial com dez frentes e 69 tarefas", () => {
  let sequence = 0;
  const template = processTemplates.find(item => item.id === "estrategia-trafego-pago-30");
  assert.ok(template);
  assert.equal(template.layout, "radial");
  assert.equal(template.stages.length, 10);
  assert.equal(template.stageDetails?.reduce((total, stage) => total + stage.tasks.length, 0), 69);

  const result = createTemplateStructure(template, () => `radial-${++sequence}`);
  assert.equal(result.stages.length, 10);
  assert.equal(result.dependencies.length, 0);
  assert.ok(result.stages.every(stage => stage.parentId === result.rootId));
  assert.ok(new Set(result.stages.map(stage => `${stage.x}:${stage.y}`)).size === 10);
});

test("modelo Segundo Cérebro cria oito áreas e 24 notas de conhecimento", () => {
  let sequence = 0;
  const template = processTemplates.find(item => item.id === "segundo-cerebro");
  assert.ok(template);
  assert.equal(template.layout, "knowledge");
  assert.equal(template.stages.length, 8);
  assert.equal(template.knowledgeClusters?.reduce((total, cluster) => total + cluster.notes.length, 0), 24);

  const result = createTemplateStructure(template, () => `knowledge-${++sequence}`);
  assert.equal(result.stages.length, 8);
  assert.equal(result.dependencies.length, 0);
  assert.ok(result.stages.every(stage => stage.parentId === result.rootId));
  assert.ok(new Set(result.stages.map(stage => `${stage.x}:${stage.y}`)).size === 8);
});

test("todos os modelos possuem etapas pré-preenchidas", () => {
  assert.equal(processTemplates.length, 18);
  for (const template of processTemplates) {
    assert.equal(template.stageDetails?.length, template.stages.length, template.title);
    for (const detail of template.stageDetails ?? []) {
      assert.ok(detail.tasks.length >= 5, `${template.title}: ${detail.title}`);
      assert.ok(detail.subtitle.trim().length > 0);
      assert.ok(detail.instructions?.trim().length > 0);
    }
  }
});

test("assistente sugere mapa de marketing a partir de uma frase", () => {
  const result = suggestMapBlueprint("Quero lançar uma campanha no Instagram");
  assert.equal(result.category, "Marketing");
  assert.ok(result.stages.includes("Conteúdo e criativos"));
  assert.ok(result.stages.length >= 6);
});

test("assistente sugere implantação tecnológica e possui fallback", () => {
  const crm = suggestMapBlueprint("Implantar um CRM para o time comercial");
  assert.equal(crm.category, "Tecnologia");
  assert.ok(crm.stages.includes("Integrações"));
  const generic = suggestMapBlueprint("Organizar minha nova ideia");
  assert.equal(generic.category, "Projetos");
  assert.ok(generic.stages.includes("Validação"));
});
