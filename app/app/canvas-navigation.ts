export type CanvasPoint = { x: number; y: number };
export type WheelIntent = "zoom" | "horizontal" | "vertical" | "none";

export function clampZoom(value: number, min = 0.45, max = 1.8) {
  return Math.min(max, Math.max(min, value));
}

export function resolveWheelIntent(input: { spacePressed: boolean; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }): WheelIntent {
  if (input.spacePressed) return "zoom";
  if (input.shiftKey) return "horizontal";
  if (input.ctrlKey || input.metaKey) return "vertical";
  return "none";
}

export function zoomAroundPoint(input: {
  zoom: number;
  pan: CanvasPoint;
  pointer: CanvasPoint;
  deltaY: number;
  min?: number;
  max?: number;
}) {
  const nextZoom = clampZoom(input.zoom * Math.exp(-input.deltaY * 0.0015), input.min, input.max);
  const worldX = (input.pointer.x - input.pan.x) / input.zoom;
  const worldY = (input.pointer.y - input.pan.y) / input.zoom;
  return {
    zoom: nextZoom,
    pan: {
      x: input.pointer.x - worldX * nextZoom,
      y: input.pointer.y - worldY * nextZoom,
    },
  };
}

export function panWithWheel(intent: "horizontal" | "vertical", pan: CanvasPoint, deltaX: number, deltaY: number) {
  if (intent === "horizontal") {
    const movement = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    return { ...pan, x: pan.x - movement };
  }
  return { ...pan, y: pan.y - deltaY };
}

export function moveOnlyNode<T extends { id: string; x: number; y: number }>(nodes: T[], nodeId: string, x: number, y: number) {
  return nodes.map(node => node.id === nodeId ? { ...node, x, y } : node);
}

export function centerNodeInViewport(input: {
  node: CanvasPoint;
  nodeWidth: number;
  nodeHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
}) {
  return {
    x: input.viewportWidth / 2 - (input.node.x + input.nodeWidth / 2) * input.zoom,
    y: input.viewportHeight / 2 - (input.node.y + input.nodeHeight / 2) * input.zoom,
  };
}

export function fitNodesInViewport(input: {
  nodes: Array<CanvasPoint & { width: number; height: number }>;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
}) {
  if (!input.nodes.length) return { zoom: 1, pan: { x: 0, y: 0 } };
  const padding = input.padding ?? 72;
  const minX = Math.min(...input.nodes.map(node => node.x));
  const minY = Math.min(...input.nodes.map(node => node.y));
  const maxX = Math.max(...input.nodes.map(node => node.x + node.width));
  const maxY = Math.max(...input.nodes.map(node => node.y + node.height));
  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);
  const zoom = clampZoom(Math.min((input.viewportWidth - padding * 2) / contentWidth, (input.viewportHeight - padding * 2) / contentHeight), 0.45, 1.35);
  return {
    zoom,
    pan: {
      x: (input.viewportWidth - contentWidth * zoom) / 2 - minX * zoom,
      y: (input.viewportHeight - contentHeight * zoom) / 2 - minY * zoom,
    },
  };
}
