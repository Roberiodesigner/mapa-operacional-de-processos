import { env } from "@/platform/hostinger-env";
import { completionBlockReason } from "../../app/approval-policy";
import { canAccessMap, getWorkspaceAccessContext } from "../_lib/collaboration";

type ExecutionPatch = {
  status?: "not_started" | "in_progress" | "done" | "blocked";
  progress?: number;
  blockedReason?: string;
  evidence?: string;
  checklist?: { id: string; text: string; done: boolean }[];
};

export async function PATCH(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const body = await request.json() as { mapId?: string; nodeId?: string; updates?: ExecutionPatch };
  const mapId = (body.mapId || "").trim(), nodeId = (body.nodeId || "").trim(), updates = body.updates || {};
  if (!mapId || !nodeId || !await canAccessMap(context, mapId, "execute")) return Response.json({ error: "Etapa não encontrada ou sem permissão para executar" }, { status: 403 });
  const allowedKeys = new Set(["status", "progress", "blockedReason", "evidence", "checklist"]);
  if (Object.keys(updates).some(key => !allowedKeys.has(key))) return Response.json({ error: "Alteração não permitida para o perfil executor" }, { status: 403 });
  const stateRow = await env.DB.prepare("SELECT payload FROM project_states WHERE workspace_id = ? LIMIT 1").bind(context.workspace.id).first<{ payload: string }>();
  if (!stateRow) return Response.json({ error: "Workspace sem estado salvo" }, { status: 404 });
  const state = JSON.parse(stateRow.payload) as { nodes: ({ id: string; mapId: string; status: string; progress: number; blockedReason: string; evidenceRequired?: boolean; evidence?: string; approvalRequired?: boolean; checklist?: { id: string; text: string; done: boolean }[] } & Record<string, unknown>)[] } & Record<string, unknown>;
  const node = state.nodes.find(item => item.id === nodeId && item.mapId === mapId);
  if (!node) return Response.json({ error: "Etapa não encontrada" }, { status: 404 });
  const next: ExecutionPatch = {};
  if (updates.status && ["not_started", "in_progress", "done", "blocked"].includes(updates.status)) next.status = updates.status;
  if (updates.progress !== undefined) next.progress = Math.max(0, Math.min(100, Number(updates.progress) || 0));
  if (updates.blockedReason !== undefined) next.blockedReason = String(updates.blockedReason).slice(0, 2000);
  if (updates.evidence !== undefined) next.evidence = String(updates.evidence).slice(0, 2000);
  if (updates.checklist !== undefined) next.checklist = Array.isArray(updates.checklist) ? updates.checklist.slice(0, 300).map(item => ({ id: String(item.id).slice(0, 100), text: String(item.text).slice(0, 500), done: Boolean(item.done) })) : [];
  const approval = await env.DB.prepare("SELECT status FROM approval_records WHERE workspace_id = ? AND node_id = ? ORDER BY requested_at DESC LIMIT 1").bind(context.workspace.id, nodeId).first<{ status: string }>();
  const candidate = { ...node, ...next };
  const wantsCompletion = next.status === "done" || Number(next.progress) >= 100;
  const block = wantsCompletion ? completionBlockReason(candidate, approval?.status as "pending" | "approved" | "changes_requested" | "cancelled" | undefined) : null;
  if (block) { next.status = "in_progress"; next.progress = 99; }
  Object.assign(node, next);
  const statements = [
    env.DB.prepare("UPDATE project_states SET payload = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ?").bind(JSON.stringify(state), context.workspace.id),
    env.DB.prepare("UPDATE node_records SET status = ?, progress = ?, blocked_reason = ?, evidence = ?, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND node_id = ? AND map_id = ?").bind(node.status, node.progress, node.blockedReason || "", node.evidence || "", context.workspace.id, nodeId, mapId),
    env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'node_execution_updated', 'node', ?, ?)").bind(crypto.randomUUID(), context.workspace.id, context.user.email, nodeId, JSON.stringify({ fields: Object.keys(next), completionBlocked: block })),
  ];
  if (next.checklist) {
    statements.push(env.DB.prepare("DELETE FROM node_checklist_records WHERE workspace_id = ? AND node_id = ?").bind(context.workspace.id, nodeId));
    next.checklist.forEach((item, position) => statements.push(env.DB.prepare("INSERT INTO node_checklist_records (storage_id, workspace_id, checklist_id, node_id, text, done, position) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${context.workspace.id}:${nodeId}:${item.id}`, context.workspace.id, item.id, nodeId, item.text, item.done ? 1 : 0, position)));
  }
  for (let index = 0; index < statements.length; index += 75) await env.DB.batch(statements.slice(index, index + 75));
  return Response.json({ node, completionBlocked: block });
}
