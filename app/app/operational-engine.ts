export type OperationalStatus = "not_started" | "in_progress" | "done" | "blocked";

export type OperationalNode = {
  id: string;
  parentId: string | null;
  title: string;
  status: OperationalStatus;
  progress: number;
  priority: string;
  assignee: string;
  due: string;
  blockedReason: string;
};

export type Dependency = { id: string; nodeId: string; dependsOnId: string };

export type EnrichedNode<T extends OperationalNode> = T & {
  computedProgress: number;
  computedStatus: OperationalStatus;
  computedBlockReason: string;
  isOverdue: boolean;
};

const priorityWeight: Record<string, number> = { Baixa: 1, Média: 2, Alta: 3, Crítica: 4 };

export function wouldCreateDependencyCycle(dependencies: Dependency[], nodeId: string, dependsOnId: string) {
  if (nodeId === dependsOnId) return true;
  const graph = new Map<string, string[]>();
  for (const dependency of dependencies) {
    const list = graph.get(dependency.nodeId) ?? [];
    list.push(dependency.dependsOnId);
    graph.set(dependency.nodeId, list);
  }
  const stack = [dependsOnId];
  const visited = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === nodeId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(graph.get(current) ?? []));
  }
  return false;
}

export function calculateOperationalState<T extends OperationalNode>(nodes: T[], dependencies: Dependency[], now = new Date()) {
  const children = new Map<string, T[]>();
  const byId = new Map(nodes.map(node => [node.id, node]));
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }

  const progressMemo = new Map<string, number>();
  const calculateProgress = (id: string, visiting = new Set<string>()): number => {
    if (progressMemo.has(id)) return progressMemo.get(id)!;
    if (visiting.has(id)) return byId.get(id)?.progress ?? 0;
    visiting.add(id);
    const descendants = children.get(id) ?? [];
    const progress = descendants.length
      ? Math.round(descendants.reduce((sum, child) => sum + calculateProgress(child.id, new Set(visiting)), 0) / descendants.length)
      : Math.max(0, Math.min(100, byId.get(id)?.progress ?? 0));
    progressMemo.set(id, progress);
    return progress;
  };
  nodes.forEach(node => calculateProgress(node.id));

  const dependenciesByNode = new Map<string, Dependency[]>();
  dependencies.forEach(dependency => {
    const list = dependenciesByNode.get(dependency.nodeId) ?? [];
    list.push(dependency);
    dependenciesByNode.set(dependency.nodeId, list);
  });

  const enriched = nodes.map(node => {
    const nodeDependencies = dependenciesByNode.get(node.id) ?? [];
    const pendingDependencies = nodeDependencies
      .map(dependency => byId.get(dependency.dependsOnId))
      .filter((dependency): dependency is T => Boolean(dependency) && calculateProgress(dependency!.id) < 100 && dependency!.status !== "done");
    const childNodes = children.get(node.id) ?? [];
    const progress = calculateProgress(node.id);
    let computedStatus: OperationalStatus = node.status;
    let computedBlockReason = node.blockedReason;
    if (pendingDependencies.length) {
      computedStatus = "blocked";
      computedBlockReason = `Aguardando ${pendingDependencies.map(item => item.title).join(", ")}`;
    } else if (node.status === "blocked" && node.blockedReason) {
      computedStatus = "blocked";
    } else if (progress === 100 || (childNodes.length > 0 && childNodes.every(child => calculateProgress(child.id) === 100))) {
      computedStatus = "done";
    } else if (childNodes.some(child => {
      const childDependencyBlocked = (dependenciesByNode.get(child.id) ?? []).some(dependency => calculateProgress(dependency.dependsOnId) < 100);
      return child.status === "blocked" || childDependencyBlocked;
    })) {
      computedStatus = "blocked";
      computedBlockReason = "Existe uma etapa filha bloqueada";
    } else if (progress > 0 || childNodes.some(child => child.status === "in_progress")) {
      computedStatus = "in_progress";
    } else {
      computedStatus = "not_started";
    }
    const isOverdue = computedStatus !== "done" && Boolean(node.due) && new Date(`${node.due}T23:59:59`).getTime() < now.getTime();
    return { ...node, computedProgress: progress, computedStatus, computedBlockReason, isOverdue } satisfies EnrichedNode<T>;
  });

  const enrichedById = new Map(enriched.map(node => [node.id, node]));
  const root = enriched.find(node => !node.parentId);
  const projectProgress = root?.computedProgress ?? (enriched.length ? Math.round(enriched.reduce((sum, node) => sum + node.computedProgress, 0) / enriched.length) : 0);
  const blockedCount = enriched.filter(node => node.computedStatus === "blocked").length;
  const overdueCount = enriched.filter(node => node.isOverdue).length;
  const unassignedCount = enriched.filter(node => !node.assignee.trim()).length;
  const health = Math.max(0, Math.min(100, 100 - blockedCount * 14 - overdueCount * 12 - unassignedCount * 4));
  const impactByNode = new Map<string, number>();
  dependencies.forEach(dependency => impactByNode.set(dependency.dependsOnId, (impactByNode.get(dependency.dependsOnId) ?? 0) + 1));
  const pending = enriched.filter(node => node.computedStatus !== "done");
  const ranked = [...pending].sort((a, b) => {
    const score = (node: EnrichedNode<T>) => (node.computedStatus === "blocked" ? 100 : 0) + (node.isOverdue ? 70 : 0) + (priorityWeight[node.priority] ?? 0) * 10 + (impactByNode.get(node.id) ?? 0) * 12;
    return score(b) - score(a);
  });
  const actionNode = ranked[0];
  const nextAction = actionNode ? {
    nodeId: actionNode.id,
    title: actionNode.computedStatus === "blocked" ? `Desbloquear “${actionNode.title}”` : `Avançar “${actionNode.title}”`,
    reason: actionNode.computedBlockReason || (actionNode.isOverdue ? "A tarefa está atrasada e afeta o prazo do projeto." : `${actionNode.priority} prioridade · ${impactByNode.get(actionNode.id) ?? 0} etapas dependentes.`),
  } : { nodeId: root?.id ?? "", title: "Projeto concluído", reason: "Todas as etapas foram finalizadas." };
  const criticalCount = enriched.filter(node => node.computedStatus !== "done" && (node.priority === "Crítica" || (impactByNode.get(node.id) ?? 0) > 0)).length;

  return { nodes: enriched, byId: enrichedById, projectProgress, blockedCount, overdueCount, health, nextAction, criticalCount };
}
