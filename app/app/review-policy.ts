export type ReviewNodeSource = {
  id: string;
  mapId: string;
  parentId: string | null;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  assignee?: string;
  due?: string;
  progress?: number;
  x?: number;
  y?: number;
  variant?: string;
};

export function reviewDurationDays(value: unknown) {
  const duration = Number(value);
  return [7, 30, 90].includes(duration) ? duration : 30;
}

export function reviewLinkIsUsable(status: string, expiresAt: string | null, now = new Date()) {
  return status === "active" && (!expiresAt || new Date(expiresAt).getTime() > now.getTime());
}

export function visibleReviewNodeIds(nodes: Pick<ReviewNodeSource, "id" | "parentId">[], rootNodeId: string | null) {
  if (!rootNodeId) return new Set(nodes.map(node => node.id));
  const visible = new Set<string>();
  const pending = [rootNodeId];
  while (pending.length) {
    const current = pending.shift()!;
    if (visible.has(current)) continue;
    visible.add(current);
    nodes.filter(node => node.parentId === current).forEach(node => pending.push(node.id));
  }
  return visible;
}

export function publicReviewNode(node: ReviewNodeSource, visibleIds: Set<string>) {
  return {
    id: node.id,
    mapId: node.mapId,
    parentId: node.parentId && visibleIds.has(node.parentId) ? node.parentId : null,
    title: String(node.title || "Etapa").slice(0, 300),
    description: String(node.description || "").slice(0, 4000),
    type: String(node.type || "Etapa").slice(0, 80),
    status: String(node.status || "not_started").slice(0, 40),
    priority: String(node.priority || "Média").slice(0, 40),
    assignee: String(node.assignee || "").slice(0, 160),
    due: String(node.due || "").slice(0, 40),
    progress: Math.max(0, Math.min(100, Number(node.progress) || 0)),
    x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0,
    y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0,
    variant: String(node.variant || "").slice(0, 80),
  };
}

export function normalizeReviewPin(pinType: unknown, x: unknown, y: unknown) {
  const type = pinType === "canvas" ? "canvas" : "node";
  const rawX = Number(x), rawY = Number(y);
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return null;
  if (type === "node") return { type, x: Math.max(0, Math.min(1, rawX)), y: Math.max(0, Math.min(1, rawY)) } as const;
  return { type, x: Math.max(0, Math.min(2600, rawX)), y: Math.max(0, Math.min(1800, rawY)) } as const;
}
