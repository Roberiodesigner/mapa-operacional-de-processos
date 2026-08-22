import { env } from "cloudflare:workers";
import { normalizeReviewPin, publicReviewNode, visibleReviewNodeIds, type ReviewNodeSource } from "../../app/review-policy";
import { enforceReviewRateLimit, reviewLinkForToken } from "../_lib/review-links";
import { workspaceCommercialCanWrite } from "../_lib/commercial";

type StoredState = {
  maps: { id: string; title: string; archived?: boolean }[];
  nodes: (ReviewNodeSource & Record<string, unknown>)[];
  dependencies: { id: string; nodeId: string; dependsOnId: string }[];
};

type PublicCommentRow = {
  comment_id: string;
  node_id: string;
  parent_id: string | null;
  author: string;
  content: string;
  created_at: string;
  resolved_at: string | null;
  pin_type: "node" | "canvas" | null;
  pin_x: number | null;
  pin_y: number | null;
  pin_number: number | null;
};

function responseHeaders() {
  return { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
}

async function loadReviewComments(linkId: string, workspaceId: string) {
  const roots = await env.DB.prepare("SELECT c.comment_id, c.node_id, c.parent_id, c.author, c.content, c.created_at, c.resolved_at, m.pin_type, m.pin_x, m.pin_y, m.pin_number FROM review_comment_markers m INNER JOIN node_comment_records c ON c.comment_id = m.comment_id AND c.workspace_id = m.workspace_id WHERE m.review_link_id = ? AND m.workspace_id = ? ORDER BY m.pin_number")
    .bind(linkId, workspaceId).all<PublicCommentRow>();
  const replies = await env.DB.prepare("SELECT c.comment_id, c.node_id, c.parent_id, c.author, c.content, c.created_at, c.resolved_at, NULL AS pin_type, NULL AS pin_x, NULL AS pin_y, NULL AS pin_number FROM node_comment_records c WHERE c.workspace_id = ? AND c.parent_id IN (SELECT comment_id FROM review_comment_markers WHERE review_link_id = ? AND workspace_id = ?) ORDER BY c.created_at")
    .bind(workspaceId, linkId, workspaceId).all<PublicCommentRow>();
  return [...roots.results, ...replies.results].map(row => ({
    id: row.comment_id,
    nodeId: row.node_id,
    parentId: row.parent_id,
    authorName: row.author,
    content: row.content,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    marker: row.pin_number === null ? null : { pinType: row.pin_type, x: Number(row.pin_x), y: Number(row.pin_y), number: Number(row.pin_number) },
  }));
}

async function publicReviewPayload(token: string) {
  const match = await reviewLinkForToken(token);
  if (!match) return { error: "Link de revisão não encontrado", status: 404 } as const;
  if (!match.usable) return { error: "Este link expirou ou foi desativado", status: 410 } as const;
  const { link } = match;
  const row = await env.DB.prepare("SELECT payload FROM project_states WHERE workspace_id = ? LIMIT 1")
    .bind(link.workspace_id).first<{ payload: string }>();
  if (!row) return { error: "O mapa ainda não possui dados publicados", status: 404 } as const;
  const state = JSON.parse(row.payload) as StoredState;
  const map = state.maps.find(item => item.id === link.map_id && !item.archived);
  if (!map) return { error: "Mapa indisponível para revisão", status: 404 } as const;
  const mapNodes = state.nodes.filter(node => node.mapId === link.map_id);
  const rootNodeId = link.root_node_id || null;
  const visibleIds = visibleReviewNodeIds(mapNodes, rootNodeId);
  const visibleNodes = mapNodes.filter(node => visibleIds.has(node.id)).map(node => publicReviewNode(node, visibleIds));
  if (visibleNodes.length === 0) return { error: "O conteúdo compartilhado não está mais disponível", status: 404 } as const;
  const root = visibleNodes.find(node => node.id === rootNodeId) || visibleNodes.find(node => !node.parentId) || visibleNodes[0];
  const dependencies = state.dependencies.filter(item => visibleIds.has(item.nodeId) && visibleIds.has(item.dependsOnId));
  const comments = await loadReviewComments(link.id, link.workspace_id);
  const workspace = await env.DB.prepare("SELECT name FROM workspaces WHERE id = ? LIMIT 1").bind(link.workspace_id).first<{ name: string }>();
  await env.DB.prepare("UPDATE review_link_records SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?").bind(link.id).run();
  return {
    status: 200,
    payload: {
      review: { label: link.label, expiresAt: link.expires_at, allowComments: Boolean(link.allow_comments), scope: rootNodeId ? "branch" : "map" },
      workspaceName: workspace?.name || "Mapa Operacional",
      map: { id: map.id, title: map.title },
      rootNodeId: root.id,
      nodes: visibleNodes,
      dependencies,
      comments,
    },
  } as const;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  try {
    const result = await publicReviewPayload(token);
    if (!("payload" in result)) return Response.json({ error: result.error }, { status: result.status, headers: responseHeaders() });
    return Response.json(result.payload, { headers: responseHeaders() });
  } catch {
    return Response.json({ error: "Não foi possível carregar esta revisão" }, { status: 500, headers: responseHeaders() });
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12_000) return Response.json({ error: "Comentário muito grande" }, { status: 413, headers: responseHeaders() });
  const body = await request.json() as { token?: string; name?: string; content?: string; nodeId?: string; parentId?: string | null; pinType?: string; x?: number; y?: number };
  const match = await reviewLinkForToken(body.token || "");
  if (!match) return Response.json({ error: "Link de revisão não encontrado" }, { status: 404, headers: responseHeaders() });
  if (!match.usable) return Response.json({ error: "Este link expirou ou foi desativado" }, { status: 410, headers: responseHeaders() });
  const { link } = match;
  if (!link.allow_comments) return Response.json({ error: "Comentários estão desativados neste link" }, { status: 403, headers: responseHeaders() });
  if (!await workspaceCommercialCanWrite(link.workspace_id)) return Response.json({ error: "Este mapa está temporariamente disponível somente para visualização" }, { status: 402, headers: responseHeaders() });
  if (!await enforceReviewRateLimit(link.token_hash, request)) return Response.json({ error: "Muitos comentários em pouco tempo. Aguarde alguns minutos." }, { status: 429, headers: responseHeaders() });
  const name = (body.name || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const content = (body.content || "").trim().slice(0, 3000);
  if (name.length < 2) return Response.json({ error: "Informe seu nome" }, { status: 400, headers: responseHeaders() });
  if (!content) return Response.json({ error: "Escreva o comentário" }, { status: 400, headers: responseHeaders() });

  const payloadResult = await publicReviewPayload(body.token || "");
  if (!("payload" in payloadResult)) return Response.json({ error: payloadResult.error }, { status: payloadResult.status, headers: responseHeaders() });
  const visibleIds = new Set(payloadResult.payload.nodes.map(node => node.id));
  let nodeId = (body.nodeId || "").trim();
  let parentId: string | null = null;
  if (body.parentId) {
    const parent = await env.DB.prepare("SELECT c.comment_id, c.node_id FROM node_comment_records c WHERE c.workspace_id = ? AND c.comment_id = ? AND c.comment_id IN (SELECT comment_id FROM review_comment_markers WHERE review_link_id = ? AND workspace_id = ?) LIMIT 1")
      .bind(link.workspace_id, body.parentId, link.id, link.workspace_id).first<{ comment_id: string; node_id: string }>();
    if (!parent) return Response.json({ error: "Conversa não encontrada" }, { status: 404, headers: responseHeaders() });
    parentId = parent.comment_id;
    nodeId = parent.node_id;
  }
  if (!visibleIds.has(nodeId)) return Response.json({ error: "Escolha um ponto visível do mapa" }, { status: 400, headers: responseHeaders() });
  const pin = parentId ? null : normalizeReviewPin(body.pinType, body.x, body.y);
  if (!parentId && !pin) return Response.json({ error: "Marque o ponto que deseja comentar" }, { status: 400, headers: responseHeaders() });

  const id = crypto.randomUUID(), actor = "guest:" + link.id;
  const statements = [env.DB.prepare("INSERT INTO node_comment_records (storage_id, workspace_id, comment_id, map_id, node_id, parent_id, author, author_email, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(link.workspace_id + ":" + nodeId + ":" + id, link.workspace_id, id, link.map_id, nodeId, parentId, name, actor, content)];
  let marker = null as null | { pinType: "node" | "canvas"; x: number; y: number; number: number };
  if (pin) {
    const latest = await env.DB.prepare("SELECT COALESCE(MAX(pin_number), 0) AS value FROM review_comment_markers WHERE review_link_id = ?")
      .bind(link.id).first<{ value: number }>();
    const number = Number(latest?.value || 0) + 1;
    marker = { pinType: pin.type, x: pin.x, y: pin.y, number };
    statements.push(env.DB.prepare("INSERT INTO review_comment_markers (id, workspace_id, review_link_id, comment_id, map_id, node_id, pin_type, pin_x, pin_y, pin_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), link.workspace_id, link.id, id, link.map_id, nodeId, pin.type, pin.x, pin.y, number));
  }
  const owner = await env.DB.prepare("SELECT owner_email FROM workspaces WHERE id = ? LIMIT 1").bind(link.workspace_id).first<{ owner_email: string }>();
  if (owner?.owner_email) statements.push(env.DB.prepare("INSERT INTO notification_records (id, workspace_id, recipient_email, kind, actor_email, map_id, node_id, comment_id, message) VALUES (?, ?, ?, 'review_comment', ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), link.workspace_id, owner.owner_email, actor, link.map_id, nodeId, id, name + " marcou um ponto na revisão “" + link.label + "”"));
  statements.push(env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'public_review_comment', 'node_comment', ?, ?)")
    .bind(crypto.randomUUID(), link.workspace_id, actor, id, JSON.stringify({ reviewLinkId: link.id, mapId: link.map_id, nodeId, pin: marker })));
  await env.DB.batch(statements);
  return Response.json({ comment: { id, nodeId, parentId, authorName: name, content, createdAt: new Date().toISOString(), resolvedAt: null, marker } }, { status: 201, headers: responseHeaders() });
}
