import { env } from "cloudflare:workers";
import { normalizeMemberRole, permissionSummary, roleCan, roleLabels, type MemberRole } from "../../app/collaboration-policy";
import { canWorkspace, getWorkspaceAccessContext } from "../_lib/collaboration";

type MemberRow = {
  id: string;
  email: string;
  display_name: string;
  role: MemberRole;
  status: "pending" | "active";
  all_maps: number;
  invited_by: string;
  invited_at: string;
  joined_at: string | null;
  last_active_at: string | null;
};

async function mapIdsForMember(workspaceId: string, memberId: string) {
  const result = await env.DB.prepare("SELECT map_id FROM map_permission_records WHERE workspace_id = ? AND member_id = ? ORDER BY map_id")
    .bind(workspaceId, memberId).all<{ map_id: string }>();
  return result.results.map(row => row.map_id);
}

async function publicMember(workspaceId: string, row: MemberRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.display_name || row.email.split("@")[0],
    role: row.role,
    roleLabel: roleLabels[row.role],
    permissionSummary: permissionSummary(row.role),
    status: row.status,
    allMaps: Boolean(row.all_maps),
    mapIds: row.all_maps ? [] : await mapIdsForMember(workspaceId, row.id),
    invitedBy: row.invited_by,
    invitedAt: row.invited_at,
    joinedAt: row.joined_at,
    lastActiveAt: row.last_active_at,
  };
}

async function listMembers(context: NonNullable<Awaited<ReturnType<typeof getWorkspaceAccessContext>>>) {
  const result = await env.DB.prepare("SELECT * FROM workspace_members WHERE workspace_id = ? ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, display_name, email")
    .bind(context.workspace.id).all<MemberRow>();
  const invited = await Promise.all(result.results.map(row => publicMember(context.workspace.id, row)));
  return [{
    id: "owner",
    email: context.workspace.owner_email,
    name: context.workspace.owner_email === context.user.email ? context.user.displayName : "Proprietário",
    role: "owner" as const,
    roleLabel: roleLabels.owner,
    permissionSummary: permissionSummary("owner"),
    status: "active" as const,
    allMaps: true,
    mapIds: [],
    invitedBy: "",
    invitedAt: "",
    joinedAt: null,
    lastActiveAt: null,
  }, ...invited];
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function replaceMapPermissions(workspaceId: string, memberId: string, role: Exclude<MemberRole, "owner">, allMaps: boolean, requestedMapIds: unknown) {
  const mapRows = await env.DB.prepare("SELECT map_id FROM map_records WHERE workspace_id = ?")
    .bind(workspaceId).all<{ map_id: string }>();
  const allowed = new Set(mapRows.results.map(row => row.map_id));
  const mapIds = Array.isArray(requestedMapIds)
    ? [...new Set(requestedMapIds.filter((value): value is string => typeof value === "string" && allowed.has(value)).slice(0, 250))]
    : [];
  const statements = [env.DB.prepare("DELETE FROM map_permission_records WHERE workspace_id = ? AND member_id = ?").bind(workspaceId, memberId)];
  if (!allMaps) {
    mapIds.forEach(mapId => statements.push(env.DB.prepare("INSERT INTO map_permission_records (id, workspace_id, map_id, member_id, permission) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), workspaceId, mapId, memberId, role)));
  }
  await env.DB.batch(statements);
  return mapIds;
}

export async function GET() {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const [members, maps] = await Promise.all([
    listMembers(context),
    env.DB.prepare("SELECT map_id, title, archived FROM map_records WHERE workspace_id = ? ORDER BY archived, title")
      .bind(context.workspace.id).all<{ map_id: string; title: string; archived: number }>(),
  ]);
  return Response.json({
    currentUser: { email: context.user.email, name: context.user.displayName, role: context.role },
    capabilities: {
      manageMembers: canWorkspace(context, "manage_members"),
      edit: roleCan(context.role, "edit"),
      execute: roleCan(context.role, "execute"),
      comment: roleCan(context.role, "comment"),
      approve: roleCan(context.role, "approve"),
    },
    members,
    maps: maps.results.map(map => ({ id: map.map_id, title: map.title, archived: Boolean(map.archived) })),
  }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  if (!canWorkspace(context, "manage_members")) return Response.json({ error: "Sem permissão para convidar pessoas" }, { status: 403 });
  const body = await request.json() as { email?: string; name?: string; role?: string; allMaps?: boolean; mapIds?: string[] };
  const email = (body.email || "").trim().toLowerCase();
  if (!validEmail(email)) return Response.json({ error: "Informe um e-mail válido" }, { status: 400 });
  if (email === context.workspace.owner_email.toLowerCase()) return Response.json({ error: "O proprietário já faz parte do Workspace" }, { status: 409 });
  const role = normalizeMemberRole(body.role);
  const allMaps = role === "admin" ? true : Boolean(body.allMaps);
  if (!allMaps && (!Array.isArray(body.mapIds) || body.mapIds.length === 0)) return Response.json({ error: "Escolha pelo menos um mapa ou libere todos" }, { status: 400 });
  const existing = await env.DB.prepare("SELECT id FROM workspace_members WHERE workspace_id = ? AND lower(email) = ? LIMIT 1")
    .bind(context.workspace.id, email).first<{ id: string }>();
  const id = existing?.id || crypto.randomUUID();
  await env.DB.prepare("INSERT INTO workspace_members (id, workspace_id, email, display_name, role, status, all_maps, invited_by) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?) ON CONFLICT(workspace_id, email) DO UPDATE SET display_name = excluded.display_name, role = excluded.role, all_maps = excluded.all_maps, invited_by = excluded.invited_by, invited_at = CURRENT_TIMESTAMP")
    .bind(id, context.workspace.id, email, (body.name || "").trim().slice(0, 160), role, allMaps ? 1 : 0, context.user.email).run();
  await replaceMapPermissions(context.workspace.id, id, role, allMaps, body.mapIds);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO notification_records (id, workspace_id, recipient_email, kind, actor_email, message) VALUES (?, ?, ?, 'workspace_invite', ?, ?)")
      .bind(crypto.randomUUID(), context.workspace.id, email, context.user.email, `${context.user.displayName} convidou você para ${context.workspace.name}`),
    env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'member_invited', 'workspace_member', ?, ?)")
      .bind(crypto.randomUUID(), context.workspace.id, context.user.email, id, JSON.stringify({ email, role, allMaps })),
  ]);
  const row = await env.DB.prepare("SELECT * FROM workspace_members WHERE id = ? AND workspace_id = ?").bind(id, context.workspace.id).first<MemberRow>();
  return Response.json({ member: row ? await publicMember(context.workspace.id, row) : null }, { status: existing ? 200 : 201 });
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  if (!canWorkspace(context, "manage_members")) return Response.json({ error: "Sem permissão para alterar a equipe" }, { status: 403 });
  const body = await request.json() as { id?: string; role?: string; allMaps?: boolean; mapIds?: string[]; name?: string };
  const member = body.id ? await env.DB.prepare("SELECT * FROM workspace_members WHERE id = ? AND workspace_id = ? LIMIT 1").bind(body.id, context.workspace.id).first<MemberRow>() : null;
  if (!member) return Response.json({ error: "Membro não encontrado" }, { status: 404 });
  const role = normalizeMemberRole(body.role ?? member.role);
  const allMaps = role === "admin" ? true : Boolean(body.allMaps);
  if (!allMaps && (!Array.isArray(body.mapIds) || body.mapIds.length === 0)) return Response.json({ error: "Escolha pelo menos um mapa ou libere todos" }, { status: 400 });
  await env.DB.prepare("UPDATE workspace_members SET display_name = ?, role = ?, all_maps = ? WHERE id = ? AND workspace_id = ?")
    .bind((body.name ?? member.display_name).trim().slice(0, 160), role, allMaps ? 1 : 0, member.id, context.workspace.id).run();
  await replaceMapPermissions(context.workspace.id, member.id, role, allMaps, body.mapIds);
  await env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'member_permissions_updated', 'workspace_member', ?, ?)")
    .bind(crypto.randomUUID(), context.workspace.id, context.user.email, member.id, JSON.stringify({ role, allMaps })).run();
  const row = await env.DB.prepare("SELECT * FROM workspace_members WHERE id = ? AND workspace_id = ?").bind(member.id, context.workspace.id).first<MemberRow>();
  return Response.json({ member: row ? await publicMember(context.workspace.id, row) : null });
}

export async function DELETE(request: Request) {
  const context = await getWorkspaceAccessContext();
  if (!context) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  if (!canWorkspace(context, "manage_members")) return Response.json({ error: "Sem permissão para remover pessoas" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") || "";
  const member = await env.DB.prepare("SELECT email FROM workspace_members WHERE id = ? AND workspace_id = ? LIMIT 1").bind(id, context.workspace.id).first<{ email: string }>();
  if (!member) return Response.json({ error: "Membro não encontrado" }, { status: 404 });
  await env.DB.batch([
    env.DB.prepare("DELETE FROM workspace_members WHERE id = ? AND workspace_id = ?").bind(id, context.workspace.id),
    env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'member_removed', 'workspace_member', ?, ?)")
      .bind(crypto.randomUUID(), context.workspace.id, context.user.email, id, JSON.stringify({ email: member.email })),
  ]);
  return Response.json({ ok: true });
}
