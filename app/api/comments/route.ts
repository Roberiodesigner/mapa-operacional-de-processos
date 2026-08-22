import { env } from "@/platform/hostinger-env";
import { canAccessMap, canWorkspace, getWorkspaceAccessContext, nodeBelongsToAccessibleMap, workspaceWriteAllowed } from "../_lib/collaboration";
import { ensureReviewSchema } from "../_lib/review-links";

type CommentRow = {
  comment_id: string;
  map_id: string;
  node_id: string;
  parent_id: string | null;
  author: string;
  author_email: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  resolved_at: string | null;
  resolved_by: string;
  review_pin_number: number | null;
};

type ReactionRow = { comment_id: string; emoji: string; user_email: string };

function publicComments(rows: CommentRow[], reactions: ReactionRow[], currentEmail: string) {
  return rows.map(row => {
    const groups = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();
    reactions.filter(reaction => reaction.comment_id === row.comment_id).forEach(reaction => {
      const current = groups.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, reactedByMe: false };
      current.count += 1;
      if (reaction.user_email.toLowerCase() === currentEmail.toLowerCase()) current.reactedByMe = true;
      groups.set(reaction.emoji, current);
    });
    return {
      id: row.comment_id,
      mapId: row.map_id,
      nodeId: row.node_id,
      parentId: row.parent_id,
      authorName: row.author,
      authorEmail: row.author_email,
      content: row.content,
      createdAt: row.created_at,
      editedAt: row.edited_at,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      reviewPinNumber: row.review_pin_number === null ? null : Number(row.review_pin_number),
      reactions: [...groups.values()],
    };
  });
}

async function loadComments(workspaceId: string, nodeId: string, currentEmail: string) {
  await ensureReviewSchema();
  const result = await env.DB.prepare("SELECT c.comment_id, c.map_id, c.node_id, c.parent_id, c.author, c.author_email, c.content, c.created_at, c.edited_at, c.resolved_at, c.resolved_by, m.pin_number AS review_pin_number FROM node_comment_records c LEFT JOIN review_comment_markers m ON m.comment_id = c.comment_id AND m.workspace_id = c.workspace_id WHERE c.workspace_id = ? AND c.node_id = ? ORDER BY c.created_at ASC LIMIT 500")
    .bind(workspaceId, nodeId).all<CommentRow>();
  if (result.results.length === 0) return [];
  const reactions = await env.DB.prepare("SELECT comment_id, emoji, user_email FROM comment_reaction_records WHERE workspace_id = ? AND comment_id IN (SELECT comment_id FROM node_comment_records WHERE workspace_id = ? AND node_id = ?)")
    .bind(workspaceId, workspaceId, nodeId).all<ReactionRow>();
  return publicComments(result.results, reactions.results, currentEmail);
}

async function allowedMentionEmails(workspaceId: string) {
  const owner = await env.DB.prepare("SELECT owner_email FROM workspaces WHERE id = ? LIMIT 1").bind(workspaceId).first<{ owner_email: string }>();
  const members = await env.DB.prepare("SELECT email FROM workspace_members WHERE workspace_id = ? AND status IN ('pending', 'active')")
    .bind(workspaceId).all<{ email: string }>();
  return new Set([owner?.owner_email, ...members.results.map(row => row.email)].filter(Boolean).map(email => email!.toLowerCase()));
}

export async function GET(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const url = new URL(request.url), nodeId = url.searchParams.get("nodeId") || "", mapId = url.searchParams.get("mapId") || "";
  if (!nodeId || !mapId || !await nodeBelongsToAccessibleMap(context, nodeId, mapId, "view")) return Response.json({ error: "Etapa não encontrada ou sem acesso" }, { status: 403 });
  return Response.json({ comments: await loadComments(context.workspace.id, nodeId, context.user.email) }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const body = await request.json() as { action?: "create" | "react"; mapId?: string; nodeId?: string; parentId?: string | null; content?: string; mentions?: string[]; commentId?: string; emoji?: string };
  if (body.action === "react") {
    const comment = body.commentId ? await env.DB.prepare("SELECT comment_id, map_id, node_id FROM node_comment_records WHERE comment_id = ? AND workspace_id = ? LIMIT 1")
      .bind(body.commentId, context.workspace.id).first<{ comment_id: string; map_id: string; node_id: string }>() : null;
    if (!comment || !await canAccessMap(context, comment.map_id, "comment")) return Response.json({ error: "Comentário não encontrado ou sem acesso" }, { status: 403 });
    const emoji = (body.emoji || "").trim();
    if (!["👍", "✅", "👀", "💡"].includes(emoji)) return Response.json({ error: "Reação inválida" }, { status: 400 });
    const existing = await env.DB.prepare("SELECT id FROM comment_reaction_records WHERE workspace_id = ? AND comment_id = ? AND user_email = ? AND emoji = ? LIMIT 1")
      .bind(context.workspace.id, comment.comment_id, context.user.email.toLowerCase(), emoji).first<{ id: string }>();
    if (existing) await env.DB.prepare("DELETE FROM comment_reaction_records WHERE id = ? AND workspace_id = ?").bind(existing.id, context.workspace.id).run();
    else await env.DB.prepare("INSERT INTO comment_reaction_records (id, workspace_id, comment_id, user_email, emoji) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), context.workspace.id, comment.comment_id, context.user.email.toLowerCase(), emoji).run();
    return Response.json({ comments: await loadComments(context.workspace.id, comment.node_id, context.user.email) });
  }

  const mapId = (body.mapId || "").trim(), nodeId = (body.nodeId || "").trim(), content = (body.content || "").trim().slice(0, 4000);
  if (!content) return Response.json({ error: "Escreva um comentário" }, { status: 400 });
  if (!await nodeBelongsToAccessibleMap(context, nodeId, mapId, "comment")) return Response.json({ error: "Etapa não encontrada ou sem permissão para comentar" }, { status: 403 });
  let parent: { comment_id: string; author_email: string } | null = null;
  if (body.parentId) {
    parent = await env.DB.prepare("SELECT comment_id, author_email FROM node_comment_records WHERE comment_id = ? AND workspace_id = ? AND node_id = ? LIMIT 1")
      .bind(body.parentId, context.workspace.id, nodeId).first<{ comment_id: string; author_email: string }>() ?? null;
    if (!parent) return Response.json({ error: "Comentário original não encontrado" }, { status: 404 });
  }
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO node_comment_records (storage_id, workspace_id, comment_id, map_id, node_id, parent_id, author, author_email, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(`${context.workspace.id}:${nodeId}:${id}`, context.workspace.id, id, mapId, nodeId, parent?.comment_id || null, context.user.displayName, context.user.email.toLowerCase(), content).run();

  const validRecipients = await allowedMentionEmails(context.workspace.id);
  const requestedMentions = Array.isArray(body.mentions) ? body.mentions.map(email => email.toLowerCase()).filter(email => validRecipients.has(email)) : [];
  const recipients = new Set(requestedMentions);
  if (parent?.author_email && !parent.author_email.startsWith("guest:")) recipients.add(parent.author_email.toLowerCase());
  recipients.delete(context.user.email.toLowerCase());
  const statements = [...recipients].map(recipient => env.DB.prepare("INSERT INTO notification_records (id, workspace_id, recipient_email, kind, actor_email, map_id, node_id, comment_id, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), context.workspace.id, recipient, parent && recipient === parent.author_email.toLowerCase() ? "comment_reply" : "mention", context.user.email, mapId, nodeId, id, parent ? `${context.user.displayName} respondeu ao seu comentário` : `${context.user.displayName} mencionou você em um comentário`));
  statements.push(env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'comment_created', 'node_comment', ?, ?)")
    .bind(crypto.randomUUID(), context.workspace.id, context.user.email, id, JSON.stringify({ mapId, nodeId, parentId: parent?.comment_id || null, mentions: [...recipients] })));
  await env.DB.batch(statements);
  return Response.json({ comments: await loadComments(context.workspace.id, nodeId, context.user.email) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  if (!workspaceWriteAllowed(context)) return Response.json({ error: "Licença inativa. Os comentários permanecem disponíveis somente para leitura." }, { status: 402 });
  const body = await request.json() as { id?: string; action?: "resolve" | "reopen" | "edit"; content?: string };
  const comment = body.id ? await env.DB.prepare("SELECT * FROM node_comment_records WHERE comment_id = ? AND workspace_id = ? LIMIT 1")
    .bind(body.id, context.workspace.id).first<CommentRow>() : null;
  if (!comment || !await canAccessMap(context, comment.map_id, "view")) return Response.json({ error: "Comentário não encontrado" }, { status: 404 });
  const isAuthor = comment.author_email.toLowerCase() === context.user.email.toLowerCase();
  if (body.action === "edit") {
    if (!isAuthor) return Response.json({ error: "Somente o autor pode editar este comentário" }, { status: 403 });
    const content = (body.content || "").trim().slice(0, 4000);
    if (!content) return Response.json({ error: "O comentário não pode ficar vazio" }, { status: 400 });
    await env.DB.prepare("UPDATE node_comment_records SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE comment_id = ? AND workspace_id = ?")
      .bind(content, comment.comment_id, context.workspace.id).run();
  } else {
    if (!isAuthor && !canWorkspace(context, "edit")) return Response.json({ error: "Sem permissão para resolver esta conversa" }, { status: 403 });
    if (body.action === "resolve") await env.DB.prepare("UPDATE node_comment_records SET resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE comment_id = ? AND workspace_id = ?")
      .bind(context.user.email, comment.comment_id, context.workspace.id).run();
    else if (body.action === "reopen") await env.DB.prepare("UPDATE node_comment_records SET resolved_at = NULL, resolved_by = '' WHERE comment_id = ? AND workspace_id = ?")
      .bind(comment.comment_id, context.workspace.id).run();
    else return Response.json({ error: "Ação inválida" }, { status: 400 });
  }
  return Response.json({ comments: await loadComments(context.workspace.id, comment.node_id, context.user.email) });
}

export async function DELETE(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  if (!workspaceWriteAllowed(context)) return Response.json({ error: "Licença inativa. Os comentários permanecem disponíveis somente para leitura." }, { status: 402 });
  const id = new URL(request.url).searchParams.get("id") || "";
  const comment = await env.DB.prepare("SELECT * FROM node_comment_records WHERE comment_id = ? AND workspace_id = ? LIMIT 1").bind(id, context.workspace.id).first<CommentRow>();
  if (!comment || !await canAccessMap(context, comment.map_id, "view")) return Response.json({ error: "Comentário não encontrado" }, { status: 404 });
  if (comment.author_email.toLowerCase() !== context.user.email.toLowerCase() && !canWorkspace(context, "edit")) return Response.json({ error: "Sem permissão para excluir este comentário" }, { status: 403 });
  await ensureReviewSchema();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM review_comment_markers WHERE workspace_id = ? AND comment_id = ?").bind(context.workspace.id, id),
    env.DB.prepare("DELETE FROM comment_reaction_records WHERE workspace_id = ? AND (comment_id = ? OR comment_id IN (SELECT comment_id FROM node_comment_records WHERE workspace_id = ? AND parent_id = ?))").bind(context.workspace.id, id, context.workspace.id, id),
    env.DB.prepare("DELETE FROM node_comment_records WHERE workspace_id = ? AND (comment_id = ? OR parent_id = ?)").bind(context.workspace.id, id, id),
    env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id) VALUES (?, ?, ?, 'comment_deleted', 'node_comment', ?)").bind(crypto.randomUUID(), context.workspace.id, context.user.email, id),
  ]);
  return Response.json({ comments: await loadComments(context.workspace.id, comment.node_id, context.user.email) });
}
