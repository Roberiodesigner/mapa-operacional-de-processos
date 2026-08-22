import { env } from "cloudflare:workers";
import { reviewDurationDays, reviewLinkIsUsable } from "../../app/review-policy";
import { canAccessMap, getWorkspaceAccessContext } from "../_lib/collaboration";
import { createReviewToken, ensureReviewSchema, hashReviewToken, type ReviewLinkRow } from "../_lib/review-links";

type MarkerRow = {
  id: string;
  review_link_id: string;
  comment_id: string;
  node_id: string;
  pin_type: "node" | "canvas";
  pin_x: number;
  pin_y: number;
  pin_number: number;
  author: string;
  content: string;
  created_at: string;
};

function publicLink(row: ReviewLinkRow) {
  return {
    id: row.id,
    mapId: row.map_id,
    rootNodeId: row.root_node_id || null,
    label: row.label,
    status: row.status,
    allowComments: Boolean(row.allow_comments),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at,
    usable: reviewLinkIsUsable(row.status, row.expires_at),
  };
}

function publicMarker(row: MarkerRow) {
  return {
    id: row.id,
    reviewLinkId: row.review_link_id,
    commentId: row.comment_id,
    nodeId: row.node_id,
    pinType: row.pin_type,
    x: Number(row.pin_x),
    y: Number(row.pin_y),
    number: row.pin_number,
    authorName: row.author,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function mapExists(workspaceId: string, mapId: string) {
  return Boolean(await env.DB.prepare("SELECT map_id FROM map_records WHERE workspace_id = ? AND map_id = ? AND archived = 0 LIMIT 1")
    .bind(workspaceId, mapId).first());
}

export async function GET(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const mapId = new URL(request.url).searchParams.get("mapId") || "";
  if (!mapId || !await canAccessMap(context, mapId, "view")) return Response.json({ error: "Mapa não encontrado ou sem acesso" }, { status: 403 });
  await ensureReviewSchema();
  const [links, markers] = await Promise.all([
    env.DB.prepare("SELECT * FROM review_link_records WHERE workspace_id = ? AND map_id = ? ORDER BY created_at DESC LIMIT 100")
      .bind(context.workspace.id, mapId).all<ReviewLinkRow>(),
    env.DB.prepare("SELECT m.id, m.review_link_id, m.comment_id, m.node_id, m.pin_type, m.pin_x, m.pin_y, m.pin_number, c.author, c.content, c.created_at FROM review_comment_markers m INNER JOIN node_comment_records c ON c.comment_id = m.comment_id AND c.workspace_id = m.workspace_id WHERE m.workspace_id = ? AND m.map_id = ? ORDER BY m.created_at DESC LIMIT 500")
      .bind(context.workspace.id, mapId).all<MarkerRow>(),
  ]);
  return Response.json({ links: links.results.map(publicLink), markers: markers.results.map(publicMarker) }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  await ensureReviewSchema();
  const body = await request.json() as { action?: "create" | "renew"; id?: string; mapId?: string; rootNodeId?: string | null; label?: string; expiresInDays?: number };
  const duration = reviewDurationDays(body.expiresInDays);
  const expiresAt = new Date(Date.now() + duration * 86_400_000).toISOString();
  const token = createReviewToken(), tokenHash = await hashReviewToken(token);

  if (body.action === "renew") {
    const link = body.id ? await env.DB.prepare("SELECT * FROM review_link_records WHERE id = ? AND workspace_id = ? LIMIT 1")
      .bind(body.id, context.workspace.id).first<ReviewLinkRow>() : null;
    if (!link || !await canAccessMap(context, link.map_id, "edit")) return Response.json({ error: "Link não encontrado ou sem permissão" }, { status: 404 });
    await env.DB.batch([
      env.DB.prepare("UPDATE review_link_records SET token_hash = ?, status = 'active', expires_at = ?, revoked_at = NULL WHERE id = ? AND workspace_id = ?")
        .bind(tokenHash, expiresAt, link.id, context.workspace.id),
      env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'review_link_renewed', 'review_link', ?, ?)")
        .bind(crypto.randomUUID(), context.workspace.id, context.user.email, link.id, JSON.stringify({ mapId: link.map_id, expiresAt })),
    ]);
    const updated = await env.DB.prepare("SELECT * FROM review_link_records WHERE id = ?").bind(link.id).first<ReviewLinkRow>();
    return Response.json({ link: updated ? publicLink(updated) : null, token });
  }

  const mapId = (body.mapId || "").trim(), rootNodeId = (body.rootNodeId || "").trim();
  if (!mapId || !await canAccessMap(context, mapId, "edit") || !await mapExists(context.workspace.id, mapId)) return Response.json({ error: "Mapa não encontrado ou sem permissão para compartilhar" }, { status: 403 });
  if (rootNodeId) {
    const node = await env.DB.prepare("SELECT node_id FROM node_records WHERE workspace_id = ? AND map_id = ? AND node_id = ? LIMIT 1")
      .bind(context.workspace.id, mapId, rootNodeId).first();
    if (!node) return Response.json({ error: "A etapa escolhida não pertence a este mapa" }, { status: 400 });
  }
  const id = crypto.randomUUID(), label = (body.label || "Revisão do cliente").trim().slice(0, 160) || "Revisão do cliente";
  await env.DB.batch([
    env.DB.prepare("INSERT INTO review_link_records (id, workspace_id, map_id, root_node_id, label, token_hash, status, allow_comments, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)")
      .bind(id, context.workspace.id, mapId, rootNodeId, label, tokenHash, expiresAt, context.user.email),
    env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'review_link_created', 'review_link', ?, ?)")
      .bind(crypto.randomUUID(), context.workspace.id, context.user.email, id, JSON.stringify({ mapId, rootNodeId, label, expiresAt })),
  ]);
  const created = await env.DB.prepare("SELECT * FROM review_link_records WHERE id = ?").bind(id).first<ReviewLinkRow>();
  return Response.json({ link: created ? publicLink(created) : null, token }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  await ensureReviewSchema();
  const body = await request.json() as { id?: string; action?: "revoke" };
  const link = body.id ? await env.DB.prepare("SELECT * FROM review_link_records WHERE id = ? AND workspace_id = ? LIMIT 1")
    .bind(body.id, context.workspace.id).first<ReviewLinkRow>() : null;
  if (!link || !await canAccessMap(context, link.map_id, "edit")) return Response.json({ error: "Link não encontrado ou sem permissão" }, { status: 404 });
  if (body.action !== "revoke") return Response.json({ error: "Ação inválida" }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare("UPDATE review_link_records SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?")
      .bind(link.id, context.workspace.id),
    env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'review_link_revoked', 'review_link', ?, ?)")
      .bind(crypto.randomUUID(), context.workspace.id, context.user.email, link.id, JSON.stringify({ mapId: link.map_id })),
  ]);
  return Response.json({ ok: true });
}
