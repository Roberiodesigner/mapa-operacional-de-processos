import { env } from "cloudflare:workers";
import { getWorkspaceAccessContext } from "../_lib/collaboration";

type NotificationRow = {
  id: string;
  kind: string;
  actor_email: string;
  map_id: string;
  node_id: string;
  comment_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

function publicNotification(row: NotificationRow) {
  return { id: row.id, kind: row.kind, actorEmail: row.actor_email, mapId: row.map_id, nodeId: row.node_id, commentId: row.comment_id, message: row.message, readAt: row.read_at, createdAt: row.created_at };
}

export async function GET() {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const result = await env.DB.prepare("SELECT id, kind, actor_email, map_id, node_id, comment_id, message, read_at, created_at FROM notification_records WHERE workspace_id = ? AND lower(recipient_email) = ? ORDER BY created_at DESC LIMIT 100")
    .bind(context.workspace.id, context.user.email.toLowerCase()).all<NotificationRow>();
  return Response.json({ notifications: result.results.map(publicNotification), unread: result.results.filter(row => !row.read_at).length }, { headers: { "cache-control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const body = await request.json() as { id?: string; all?: boolean };
  if (body.all) await env.DB.prepare("UPDATE notification_records SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE workspace_id = ? AND lower(recipient_email) = ?")
    .bind(context.workspace.id, context.user.email.toLowerCase()).run();
  else if (body.id) await env.DB.prepare("UPDATE notification_records SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND workspace_id = ? AND lower(recipient_email) = ?")
    .bind(body.id, context.workspace.id, context.user.email.toLowerCase()).run();
  else return Response.json({ error: "Notificação não informada" }, { status: 400 });
  return Response.json({ ok: true });
}
