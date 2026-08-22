import { env } from "@/platform/hostinger-env";
import { allowedMapIds, canAccessMap, canWorkspace, getWorkspaceAccessContext, workspaceWriteAllowed } from "../_lib/collaboration";

type ApprovalRow = {
  id: string; workspace_id: string; map_id: string; node_id: string; scope: "node" | "branch";
  reviewer_name: string; reviewer_email: string; requested_by: string; status: "pending" | "approved" | "changes_requested" | "cancelled";
  request_note: string; decision_note: string; requested_at: string; decided_at: string | null; decided_by: string;
};

async function ensureApprovalSchema() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS approval_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, map_id TEXT NOT NULL, node_id TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'node', reviewer_name TEXT NOT NULL, reviewer_email TEXT NOT NULL DEFAULT '', requested_by TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', request_note TEXT NOT NULL DEFAULT '', decision_note TEXT NOT NULL DEFAULT '', requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, decided_at TEXT, decided_by TEXT NOT NULL DEFAULT '')"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS approval_event_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, approval_id TEXT NOT NULL REFERENCES approval_records(id) ON DELETE CASCADE, actor_email TEXT NOT NULL, action TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS audit_log_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, actor_email TEXT NOT NULL, action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS approvals_workspace_map_idx ON approval_records(workspace_id, map_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS approvals_workspace_node_idx ON approval_records(workspace_id, node_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS approvals_workspace_status_idx ON approval_records(workspace_id, status)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS approval_events_approval_idx ON approval_event_records(approval_id, created_at)"),
  ]);
}

async function context() {
  await ensureApprovalSchema();
  return getWorkspaceAccessContext();
}

function publicApproval(row: ApprovalRow) {
  return { id: row.id, mapId: row.map_id, nodeId: row.node_id, scope: row.scope, reviewerName: row.reviewer_name, reviewerEmail: row.reviewer_email, requestedBy: row.requested_by, status: row.status, requestNote: row.request_note, decisionNote: row.decision_note, requestedAt: row.requested_at, decidedAt: row.decided_at, decidedBy: row.decided_by };
}

async function snapshotNode(workspaceId: string, nodeId: string, mapId: string) {
  const snapshot = await env.DB.prepare("SELECT payload FROM project_states WHERE workspace_id = ? LIMIT 1").bind(workspaceId).first<{ payload: string }>();
  if (!snapshot) return null;
  try {
    const state = JSON.parse(snapshot.payload) as { nodes?: { id: string; mapId: string; title: string; evidenceRequired?: boolean; evidence?: string }[] };
    return state.nodes?.find(node => node.id === nodeId && node.mapId === mapId) ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const current = await context();
  if (!current) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const url = new URL(request.url);
  const mapId = url.searchParams.get("mapId");
  const nodeId = url.searchParams.get("nodeId");
  if (mapId && !await canAccessMap(current, mapId, "view")) return Response.json({ error: "Sem acesso a este mapa" }, { status: 403 });
  let sql = "SELECT * FROM approval_records WHERE workspace_id = ?";
  const values: string[] = [current.workspace.id];
  if (mapId) { sql += " AND map_id = ?"; values.push(mapId); }
  if (nodeId) { sql += " AND node_id = ?"; values.push(nodeId); }
  const permittedMapIds = mapId ? null : await allowedMapIds(current);
  if (permittedMapIds && permittedMapIds.length === 0) return Response.json({ approvals: [] }, { headers: { "cache-control": "private, no-store" } });
  if (permittedMapIds) { sql += ` AND map_id IN (${permittedMapIds.map(() => "?").join(",")})`; values.push(...permittedMapIds); }
  sql += " ORDER BY requested_at DESC LIMIT 300";
  const result = await env.DB.prepare(sql).bind(...values).all<ApprovalRow>();
  return Response.json({ approvals: result.results.map(publicApproval) }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const current = await context();
  if (!current) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const body = await request.json() as { mapId?: string; nodeId?: string; reviewerName?: string; reviewerEmail?: string; requestNote?: string; scope?: "node" | "branch" };
  const mapId = body.mapId?.trim() || "", nodeId = body.nodeId?.trim() || "", reviewerName = body.reviewerName?.trim() || "Cliente";
  if (!mapId || !nodeId) return Response.json({ error: "Mapa e etapa são obrigatórios" }, { status: 400 });
  if (!await canAccessMap(current, mapId, "edit")) return Response.json({ error: "Sem permissão para solicitar aprovação neste mapa" }, { status: 403 });
  const node = await snapshotNode(current.workspace.id, nodeId, mapId);
  if (!node) return Response.json({ error: "Etapa não encontrada neste Workspace" }, { status: 403 });
  if (node.evidenceRequired && !node.evidence?.trim()) return Response.json({ error: "Anexe a evidência obrigatória antes de solicitar aprovação" }, { status: 409 });
  const pending = await env.DB.prepare("SELECT id FROM approval_records WHERE workspace_id = ? AND node_id = ? AND status = 'pending' LIMIT 1").bind(current.workspace.id, nodeId).first();
  if (pending) return Response.json({ error: "Esta etapa já está aguardando aprovação" }, { status: 409 });
  const id = crypto.randomUUID(), note = (body.requestNote || "").trim().slice(0, 3000), scope = body.scope === "branch" ? "branch" : "node";
  await env.DB.batch([
    env.DB.prepare("INSERT INTO approval_records (id, workspace_id, map_id, node_id, scope, reviewer_name, reviewer_email, requested_by, request_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, current.workspace.id, mapId, nodeId, scope, reviewerName.slice(0, 160), (body.reviewerEmail || "").trim().toLowerCase().slice(0, 254), current.user.email, note),
    env.DB.prepare("INSERT INTO approval_event_records (id, workspace_id, approval_id, actor_email, action, note) VALUES (?, ?, ?, ?, 'requested', ?)").bind(crypto.randomUUID(), current.workspace.id, id, current.user.email, note),
    env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'approval_requested', 'node', ?, ?)").bind(crypto.randomUUID(), current.workspace.id, current.user.email, nodeId, JSON.stringify({ approvalId: id, reviewerName, scope })),
  ]);
  const row = await env.DB.prepare("SELECT * FROM approval_records WHERE id = ? AND workspace_id = ?").bind(id, current.workspace.id).first<ApprovalRow>();
  return Response.json({ approval: row ? publicApproval(row) : null }, { status: 201 });
}

export async function PATCH(request: Request) {
  const current = await context();
  if (!current) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  if (!workspaceWriteAllowed(current)) return Response.json({ error: "Licença inativa. A revisão permanece disponível somente para leitura." }, { status: 402 });
  const body = await request.json() as { id?: string; decision?: "approved" | "changes_requested"; note?: string };
  if (!body.id || !["approved", "changes_requested"].includes(body.decision || "")) return Response.json({ error: "Decisão inválida" }, { status: 400 });
  const approval = await env.DB.prepare("SELECT * FROM approval_records WHERE id = ? AND workspace_id = ? LIMIT 1").bind(body.id, current.workspace.id).first<ApprovalRow>();
  if (!approval) return Response.json({ error: "Aprovação não encontrada" }, { status: 404 });
  const isNamedReviewer = Boolean(approval.reviewer_email) && approval.reviewer_email.toLowerCase() === current.user.email.toLowerCase();
  if (!isNamedReviewer && (!canWorkspace(current, "approve") || !await canAccessMap(current, approval.map_id, "approve"))) return Response.json({ error: "Sem permissão para decidir esta aprovação" }, { status: 403 });
  if (approval.status !== "pending") return Response.json({ error: "Esta solicitação já foi respondida" }, { status: 409 });
  const decision = body.decision!, note = (body.note || "").trim().slice(0, 3000);
  if (decision === "changes_requested" && !note) return Response.json({ error: "Explique quais alterações precisam ser feitas" }, { status: 400 });
  const stateRow = await env.DB.prepare("SELECT payload FROM project_states WHERE workspace_id = ? LIMIT 1").bind(current.workspace.id).first<{ payload: string }>();
  let nextPayload: string | null = null;
  if (stateRow) {
    try {
      const state = JSON.parse(stateRow.payload) as { nodes?: { id: string; status: string; progress: number; blockedReason?: string }[] };
      const node = state.nodes?.find(item => item.id === approval.node_id);
      if (node) {
        if (decision === "approved") { node.status = "done"; node.progress = 100; node.blockedReason = ""; }
        else { node.status = "in_progress"; node.progress = Math.min(node.progress, 99); }
        nextPayload = JSON.stringify(state);
      }
    } catch { nextPayload = null; }
  }
  const statements = [
    env.DB.prepare("UPDATE approval_records SET status = ?, decision_note = ?, decided_at = CURRENT_TIMESTAMP, decided_by = ? WHERE id = ? AND workspace_id = ? AND status = 'pending'").bind(decision, note, current.user.email, approval.id, current.workspace.id),
    env.DB.prepare("INSERT INTO approval_event_records (id, workspace_id, approval_id, actor_email, action, note) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), current.workspace.id, approval.id, current.user.email, decision, note),
    env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, 'node', ?, ?)").bind(crypto.randomUUID(), current.workspace.id, current.user.email, decision === "approved" ? "approval_approved" : "approval_changes_requested", approval.node_id, JSON.stringify({ approvalId: approval.id, note })),
    env.DB.prepare("UPDATE node_records SET status = ?, progress = CASE WHEN ? = 'approved' THEN 100 WHEN progress > 99 THEN 99 ELSE progress END, blocked_reason = CASE WHEN ? = 'approved' THEN '' ELSE blocked_reason END, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND node_id = ?").bind(decision === "approved" ? "done" : "in_progress", decision, decision, current.workspace.id, approval.node_id),
  ];
  if (nextPayload) statements.push(env.DB.prepare("UPDATE project_states SET payload = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ?").bind(nextPayload, current.workspace.id));
  await env.DB.batch(statements);
  const row = await env.DB.prepare("SELECT * FROM approval_records WHERE id = ? AND workspace_id = ?").bind(approval.id, current.workspace.id).first<ApprovalRow>();
  return Response.json({ approval: row ? publicApproval(row) : null });
}
