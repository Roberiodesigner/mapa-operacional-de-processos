import { env } from "cloudflare:workers";
import { canAccessMap, getWorkspaceAccessContext, nodeBelongsToAccessibleMap } from "../_lib/collaboration";

type PresenceRow = { user_email: string; display_name: string; map_id: string; node_id: string; last_seen_at: string };

function serializePresence(row: PresenceRow) {
  return {
    email: row.user_email,
    name: row.display_name || row.user_email.split("@")[0],
    mapId: row.map_id,
    nodeId: row.node_id,
    lastSeenAt: `${row.last_seen_at.replace(" ", "T")}Z`,
  };
}

export async function POST(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const body = await request.json() as { mapId?: string; nodeId?: string; clientVersion?: number };
  const mapId = String(body.mapId || "").trim().slice(0, 120);
  let nodeId = String(body.nodeId || "").trim().slice(0, 120);
  if (mapId && !await canAccessMap(context, mapId, "view")) return Response.json({ error: "Mapa sem permissão de acesso" }, { status: 403 });
  if (nodeId && (!mapId || !await nodeBelongsToAccessibleMap(context, nodeId, mapId, "view"))) nodeId = "";
  const email = context.user.email.trim().toLowerCase();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM workspace_presence_records WHERE last_seen_at < datetime('now', '-2 minutes')"),
    env.DB.prepare("INSERT INTO workspace_presence_records (id, workspace_id, user_email, display_name, map_id, node_id, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(workspace_id, user_email) DO UPDATE SET display_name = excluded.display_name, map_id = excluded.map_id, node_id = excluded.node_id, last_seen_at = CURRENT_TIMESTAMP")
      .bind(crypto.randomUUID(), context.workspace.id, email, context.user.displayName.slice(0, 160), mapId, nodeId),
  ]);
  const presence = mapId ? await env.DB.prepare("SELECT user_email, display_name, map_id, node_id, last_seen_at FROM workspace_presence_records WHERE workspace_id = ? AND map_id = ? AND last_seen_at >= datetime('now', '-45 seconds') ORDER BY last_seen_at DESC").bind(context.workspace.id, mapId).all<PresenceRow>() : { results: [] as PresenceRow[] };
  const version = await env.DB.prepare("SELECT version, updated_at FROM project_states WHERE workspace_id = ? LIMIT 1").bind(context.workspace.id).first<{ version: number; updated_at: string }>();
  return Response.json({ presence: presence.results.map(serializePresence), version: version?.version ?? 0, updatedAt: version?.updated_at ?? null, hasChanges: (version?.version ?? 0) > Math.max(0, Number(body.clientVersion) || 0) });
}

export async function DELETE() {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  await env.DB.prepare("DELETE FROM workspace_presence_records WHERE workspace_id = ? AND user_email = ?").bind(context.workspace.id, context.user.email.trim().toLowerCase()).run();
  return Response.json({ ok: true });
}
