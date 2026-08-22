import { env } from "@/platform/hostinger-env";
import { getChatGPTUser } from "../../chatgpt-auth";
import { allowedMapIds, canWorkspace, getWorkspaceAccessContext, type WorkspaceAccessContext } from "../_lib/collaboration";
import { ensureCommercialSchema, ensureWorkspaceLicense, getWorkspaceEntitlement } from "../_lib/commercial";

type WorkspaceRow = { id: string; name: string; owner_email: string; owner_user_id?: string | null; trial_started_at: string; trial_ends_at: string; plan: string };
type StateRow = { payload: string; version: number; updated_at: string };

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function ensureSchema() {
  const db = env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY NOT NULL, owner_email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, trial_started_at TEXT NOT NULL, trial_ends_at TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'trial', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS project_states (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS map_records (storage_id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, map_id TEXT NOT NULL, title TEXT NOT NULL, favorite INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS node_records (storage_id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, node_id TEXT NOT NULL, map_id TEXT NOT NULL, parent_id TEXT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', type TEXT NOT NULL, status TEXT NOT NULL, priority TEXT NOT NULL, assignee TEXT NOT NULL DEFAULT '', start TEXT NOT NULL DEFAULT '', due TEXT NOT NULL DEFAULT '', progress INTEGER NOT NULL DEFAULT 0, blocked_reason TEXT NOT NULL DEFAULT '', info TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', evidence_required INTEGER NOT NULL DEFAULT 0, evidence TEXT NOT NULL DEFAULT '', approval_required INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS node_dependencies (storage_id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, dependency_id TEXT NOT NULL, node_id TEXT NOT NULL, depends_on_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS node_checklist_records (storage_id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, checklist_id TEXT NOT NULL, node_id TEXT NOT NULL, text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0)"),
    db.prepare("CREATE TABLE IF NOT EXISTS node_comment_records (storage_id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, comment_id TEXT NOT NULL, map_id TEXT NOT NULL DEFAULT '', node_id TEXT NOT NULL, parent_id TEXT, author TEXT NOT NULL, author_email TEXT NOT NULL DEFAULT '', content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, edited_at TEXT, resolved_at TEXT, resolved_by TEXT NOT NULL DEFAULT '')"),
    db.prepare("CREATE TABLE IF NOT EXISTS activity_log_records (storage_id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, activity_id TEXT NOT NULL, event_text TEXT NOT NULL, event_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS node_file_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, map_id TEXT NOT NULL, node_id TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, uploaded_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_log_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, actor_email TEXT NOT NULL, action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS approval_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, map_id TEXT NOT NULL, node_id TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'node', reviewer_name TEXT NOT NULL, reviewer_email TEXT NOT NULL DEFAULT '', requested_by TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', request_note TEXT NOT NULL DEFAULT '', decision_note TEXT NOT NULL DEFAULT '', requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, decided_at TEXT, decided_by TEXT NOT NULL DEFAULT '')"),
    db.prepare("CREATE TABLE IF NOT EXISTS approval_event_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, approval_id TEXT NOT NULL REFERENCES approval_records(id) ON DELETE CASCADE, actor_email TEXT NOT NULL, action TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workspaces_owner_email_idx ON workspaces(owner_email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS project_states_workspace_idx ON project_states(workspace_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS map_records_workspace_idx ON map_records(workspace_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS node_records_workspace_map_idx ON node_records(workspace_id, map_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS node_dependencies_workspace_node_idx ON node_dependencies(workspace_id, node_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS node_dependencies_workspace_prerequisite_idx ON node_dependencies(workspace_id, depends_on_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS checklist_workspace_node_idx ON node_checklist_records(workspace_id, node_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS comments_workspace_node_idx ON node_comment_records(workspace_id, node_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS activity_workspace_idx ON activity_log_records(workspace_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS node_files_workspace_node_idx ON node_file_records(workspace_id, node_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS node_files_workspace_map_idx ON node_file_records(workspace_id, map_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_workspace_created_idx ON audit_log_records(workspace_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_workspace_resource_idx ON audit_log_records(workspace_id, resource_type, resource_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS approvals_workspace_map_idx ON approval_records(workspace_id, map_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS approvals_workspace_node_idx ON approval_records(workspace_id, node_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS approvals_workspace_status_idx ON approval_records(workspace_id, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS approval_events_approval_idx ON approval_event_records(approval_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS approval_events_workspace_idx ON approval_event_records(workspace_id, created_at)"),
  ]);
}

async function workspaceFor(user: { id: string | null; email: string; displayName: string }) {
  await ensureSchema();
  await ensureCommercialSchema();
  const existing = await env.DB.prepare("SELECT id, name, owner_email, owner_user_id, trial_started_at, trial_ends_at, plan FROM workspaces WHERE owner_user_id = ? OR lower(owner_email) = ? LIMIT 1").bind(user.id, user.email.toLowerCase()).first<WorkspaceRow>();
  if (existing) {
    if (user.id && !existing.owner_user_id) {
      await env.DB.prepare("UPDATE workspaces SET owner_user_id = ? WHERE id = ? AND owner_user_id IS NULL").bind(user.id, existing.id).run();
      existing.owner_user_id = user.id;
    }
    await ensureWorkspaceLicense(existing);
    return existing;
  }
  const now = new Date();
  const workspace: WorkspaceRow = { id: crypto.randomUUID(), name: `${user.displayName.split(" ")[0] || "Meu"} Workspace`, owner_email: user.email.toLowerCase(), owner_user_id: user.id, trial_started_at: now.toISOString(), trial_ends_at: addDays(now, 7).toISOString(), plan: "trial" };
  await env.DB.prepare("INSERT INTO workspaces (id, owner_user_id, owner_email, name, trial_started_at, trial_ends_at, plan) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(workspace.id, user.id, user.email, workspace.name, workspace.trial_started_at, workspace.trial_ends_at, workspace.plan).run();
  await ensureWorkspaceLicense(workspace);
  return workspace;
}

async function resolveContext(user: { id: string | null; email: string; displayName: string }): Promise<WorkspaceAccessContext> {
  await ensureSchema();
  const existing = await getWorkspaceAccessContext();
  if (existing) return existing;
  const workspace = await workspaceFor(user);
  const commercial = await getWorkspaceEntitlement(workspace);
  return { user, workspace, memberId: null, role: "owner", allMaps: true, commercialCanWrite: commercial.entitlement.canEdit };
}

type PersistedMap = { id: string; title: string; favorite?: boolean; archived?: boolean; updatedAt?: string };
type PersistedChecklist = { id: string; text: string; done: boolean };
type PersistedComment = { id: string; author: string; text: string; at: string };
type PersistedNode = { id: string; mapId: string; parentId: string | null; title: string; description?: string; type: string; status: string; priority: string; assignee: string; start?: string; due: string; progress: number; blockedReason: string; info?: string; link?: string; evidenceRequired?: boolean; evidence?: string; approvalRequired?: boolean; checklist?: PersistedChecklist[]; comments?: PersistedComment[] };
type PersistedDependency = { id: string; nodeId: string; dependsOnId: string };
type PersistedActivity = { id: string; text: string; at: string };
type PersistedState = { maps: PersistedMap[]; nodes: PersistedNode[]; dependencies: PersistedDependency[]; activity?: PersistedActivity[] } & Record<string, unknown>;

function filterStateForMaps(state: PersistedState, mapIds: string[] | null) {
  if (mapIds === null) return state;
  const allowed = new Set(mapIds);
  const nodes = state.nodes.filter(node => allowed.has(node.mapId));
  const nodeIds = new Set(nodes.map(node => node.id));
  const maps = state.maps.filter(map => allowed.has(map.id));
  const activeMapId = allowed.has(String(state.activeMapId || "")) ? state.activeMapId : maps[0]?.id || "";
  return { ...state, maps, nodes, dependencies: state.dependencies.filter(dependency => nodeIds.has(dependency.nodeId) && nodeIds.has(dependency.dependsOnId)), activeMapId };
}

function mergeRestrictedState(current: PersistedState, incoming: PersistedState, mapIds: string[]) {
  const allowed = new Set(mapIds);
  const hiddenNodes = current.nodes.filter(node => !allowed.has(node.mapId));
  const hiddenNodeIds = new Set(hiddenNodes.map(node => node.id));
  const currentActivity = current.activity ?? [];
  const incomingActivity = incoming.activity ?? [];
  return {
    ...current,
    ...incoming,
    maps: [...current.maps.filter(map => !allowed.has(map.id)), ...incoming.maps.filter(map => allowed.has(map.id))],
    nodes: [...hiddenNodes, ...incoming.nodes.filter(node => allowed.has(node.mapId))],
    dependencies: [...current.dependencies.filter(dependency => hiddenNodeIds.has(dependency.nodeId) && hiddenNodeIds.has(dependency.dependsOnId)), ...incoming.dependencies],
    activity: [...incomingActivity, ...currentActivity.filter(item => !incomingActivity.some(candidate => candidate.id === item.id))].slice(0, 500),
  } as PersistedState;
}

function hasDependencyCycle(dependencies: PersistedDependency[]) {
  const graph = new Map<string, string[]>();
  dependencies.forEach(dependency => graph.set(dependency.nodeId, [...(graph.get(dependency.nodeId) ?? []), dependency.dependsOnId]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const target of graph.get(id) ?? []) if (visit(target)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return [...graph.keys()].some(visit);
}

async function runPreparedBatches(statements: ReturnType<typeof env.DB.prepare>[]) {
  for (let index = 0; index < statements.length; index += 75) await env.DB.batch(statements.slice(index, index + 75));
}

async function syncOperationalRecords(workspaceId: string, state: PersistedState) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM node_dependencies WHERE workspace_id = ?").bind(workspaceId),
    env.DB.prepare("DELETE FROM node_checklist_records WHERE workspace_id = ?").bind(workspaceId),
    env.DB.prepare("DELETE FROM node_records WHERE workspace_id = ?").bind(workspaceId),
    env.DB.prepare("DELETE FROM map_records WHERE workspace_id = ?").bind(workspaceId),
    env.DB.prepare("DELETE FROM activity_log_records WHERE workspace_id = ?").bind(workspaceId),
  ]);
  const statements: ReturnType<typeof env.DB.prepare>[] = [];
  state.maps.forEach(map => statements.push(env.DB.prepare("INSERT INTO map_records (storage_id, workspace_id, map_id, title, favorite, archived, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${workspaceId}:${map.id}`, workspaceId, map.id, map.title.slice(0, 240), Boolean(map.favorite), Boolean(map.archived), map.updatedAt || new Date().toISOString())));
  state.nodes.forEach(node => {
    statements.push(env.DB.prepare("INSERT INTO node_records (storage_id, workspace_id, node_id, map_id, parent_id, title, description, type, status, priority, assignee, start, due, progress, blocked_reason, info, link, evidence_required, evidence, approval_required, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)").bind(`${workspaceId}:${node.id}`, workspaceId, node.id, node.mapId, node.parentId, node.title.slice(0, 300), (node.description || "").slice(0, 4000), node.type, node.status, node.priority, node.assignee || "", node.start || "", node.due || "", Math.max(0, Math.min(100, Number(node.progress) || 0)), node.blockedReason || "", (node.info || "").slice(0, 4000), (node.link || "").slice(0, 2000), Boolean(node.evidenceRequired), (node.evidence || "").slice(0, 2000), Boolean(node.approvalRequired)));
    (node.checklist ?? []).forEach((item, position) => statements.push(env.DB.prepare("INSERT INTO node_checklist_records (storage_id, workspace_id, checklist_id, node_id, text, done, position) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${workspaceId}:${node.id}:${item.id}`, workspaceId, item.id, node.id, item.text.slice(0, 500), Boolean(item.done), position)));
  });
  state.dependencies.forEach(dependency => statements.push(env.DB.prepare("INSERT INTO node_dependencies (storage_id, workspace_id, dependency_id, node_id, depends_on_id) VALUES (?, ?, ?, ?, ?)").bind(`${workspaceId}:${dependency.id}`, workspaceId, dependency.id, dependency.nodeId, dependency.dependsOnId)));
  (state.activity ?? []).slice(0, 500).forEach(activity => statements.push(env.DB.prepare("INSERT INTO activity_log_records (storage_id, workspace_id, activity_id, event_text, event_at) VALUES (?, ?, ?, ?, ?)").bind(`${workspaceId}:${activity.id}`, workspaceId, activity.id, activity.text.slice(0, 1000), activity.at)));
  await runPreparedBatches(statements);
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  try {
    const context = await resolveContext(user);
    const commercial = await getWorkspaceEntitlement(context.workspace);
    const state = await env.DB.prepare("SELECT payload, version, updated_at FROM project_states WHERE workspace_id = ? LIMIT 1").bind(context.workspace.id).first<StateRow>();
    const mapIds = await allowedMapIds(context);
    const parsed = state ? filterStateForMaps(JSON.parse(state.payload) as PersistedState, mapIds) : null;
    return Response.json({ user, workspace: context.workspace, entitlement: commercial.entitlement, license: commercial.license ? { planCode: commercial.license.plan_code, status: commercial.license.status, provider: commercial.license.provider, currentPeriodEndsAt: commercial.license.current_period_ends_at } : null, access: { role: context.role, allMaps: context.allMaps, canEdit: canWorkspace(context, "edit"), canExecute: canWorkspace(context, "execute"), canComment: canWorkspace(context, "comment"), canApprove: canWorkspace(context, "approve"), canManageMembers: canWorkspace(context, "manage_members") }, state: parsed, version: state?.version ?? 0, serverTime: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar o Workspace" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 1_500_000) return Response.json({ error: "Mapa excede o limite permitido" }, { status: 413 });
    const incomingState = await request.json() as PersistedState;
    if (!incomingState || typeof incomingState !== "object" || !Array.isArray(incomingState.maps) || !Array.isArray(incomingState.nodes) || !Array.isArray(incomingState.dependencies)) return Response.json({ error: "Estado inválido" }, { status: 400 });
    const context = await resolveContext(user);
    if (!context.commercialCanWrite) return Response.json({ error: "Licença inativa. Seus dados permanecem disponíveis somente para leitura.", readOnly: true }, { status: 402 });
    if (!canWorkspace(context, "edit")) return Response.json({ error: "Seu perfil não pode editar a estrutura dos mapas" }, { status: 403 });
    const mapIds = await allowedMapIds(context);
    const currentRow = await env.DB.prepare("SELECT payload, version FROM project_states WHERE workspace_id = ? LIMIT 1").bind(context.workspace.id).first<{ payload: string; version: number }>();
    const expectedHeader = request.headers.get("x-workspace-version");
    const expectedVersion = expectedHeader === null ? null : Number(expectedHeader);
    const overwriteConflict = request.headers.get("x-workspace-conflict-resolution") === "overwrite";
    if (currentRow && !overwriteConflict && expectedVersion !== null && (!Number.isFinite(expectedVersion) || expectedVersion !== currentRow.version)) {
      return Response.json({ error: "Este mapa foi atualizado por outra pessoa", conflict: true, currentVersion: currentRow.version }, { status: 409 });
    }
    const state = mapIds === null || !currentRow ? incomingState : mergeRestrictedState(JSON.parse(currentRow.payload) as PersistedState, incomingState, mapIds);
    if (!state || typeof state !== "object" || !Array.isArray(state.maps) || !Array.isArray(state.nodes) || !Array.isArray(state.dependencies)) return Response.json({ error: "Estado inválido" }, { status: 400 });
    if (state.maps.length > 250 || state.nodes.length > 800 || state.dependencies.length > 2400) return Response.json({ error: "Limite de itens excedido" }, { status: 400 });
    const nodeIds = new Set(state.nodes.map(node => node.id));
    if (state.dependencies.some(dependency => dependency.nodeId === dependency.dependsOnId || !nodeIds.has(dependency.nodeId) || !nodeIds.has(dependency.dependsOnId))) return Response.json({ error: "Dependência inválida" }, { status: 400 });
    if (hasDependencyCycle(state.dependencies)) return Response.json({ error: "Dependência circular detectada" }, { status: 409 });
    const workspace = context.workspace;
    const payload = JSON.stringify(state);
    const write = currentRow
      ? await env.DB.prepare("UPDATE project_states SET payload = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND version = ?")
        .bind(payload, workspace.id, currentRow.version).run()
      : await env.DB.prepare("INSERT OR IGNORE INTO project_states (id, workspace_id, payload, version, updated_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)")
        .bind(crypto.randomUUID(), workspace.id, payload).run();
    if (!write.meta.changes) {
      const latest = await env.DB.prepare("SELECT version FROM project_states WHERE workspace_id = ? LIMIT 1").bind(workspace.id).first<{ version: number }>();
      return Response.json({ error: "Este mapa foi atualizado por outra pessoa", conflict: true, currentVersion: latest?.version ?? 0 }, { status: 409 });
    }
    const result = await env.DB.prepare("SELECT version, updated_at FROM project_states WHERE workspace_id = ? LIMIT 1")
      .bind(workspace.id).first<{ version: number; updated_at: string }>();
    await syncOperationalRecords(workspace.id, state);
    return Response.json({ ok: true, version: result?.version ?? 1, updatedAt: result?.updated_at ?? new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar" }, { status: 500 });
  }
}
