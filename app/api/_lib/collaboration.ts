import { env } from "@/platform/hostinger-env";
import { getChatGPTUser } from "../../chatgpt-auth";
import { roleCan, type CollaborationAction, type MemberRole } from "../../app/collaboration-policy";
import { deriveWorkspaceEntitlement } from "../../commercial-policy";
import { ensureCommercialSchema } from "./commercial";

export type WorkspaceAccessContext = {
  user: { email: string; displayName: string };
  workspace: { id: string; name: string; owner_email: string; trial_started_at: string; trial_ends_at: string; plan: string; license_status?: string | null; license_period_ends_at?: string | null };
  memberId: string | null;
  role: MemberRole;
  allMaps: boolean;
  commercialCanWrite: boolean;
};

export async function ensureCollaborationSchema() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS workspace_members (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, email TEXT NOT NULL, display_name TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'viewer', status TEXT NOT NULL DEFAULT 'pending', all_maps INTEGER NOT NULL DEFAULT 0, invited_by TEXT NOT NULL, invited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, joined_at TEXT, last_active_at TEXT)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_workspace_email_uidx ON workspace_members(workspace_id, email)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS workspace_members_email_idx ON workspace_members(email, status)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS map_permission_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, map_id TEXT NOT NULL, member_id TEXT NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE, permission TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS map_permissions_member_map_uidx ON map_permission_records(member_id, map_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS map_permissions_workspace_map_idx ON map_permission_records(workspace_id, map_id)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS comment_reaction_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, comment_id TEXT NOT NULL, user_email TEXT NOT NULL, emoji TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS comment_reactions_user_uidx ON comment_reaction_records(comment_id, user_email, emoji)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS notification_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, recipient_email TEXT NOT NULL, kind TEXT NOT NULL, actor_email TEXT NOT NULL, map_id TEXT NOT NULL DEFAULT '', node_id TEXT NOT NULL DEFAULT '', comment_id TEXT NOT NULL DEFAULT '', message TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON notification_records(workspace_id, recipient_email, read_at, created_at)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS workspace_presence_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, user_email TEXT NOT NULL, display_name TEXT NOT NULL DEFAULT '', map_id TEXT NOT NULL DEFAULT '', node_id TEXT NOT NULL DEFAULT '', last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS workspace_presence_workspace_user_uidx ON workspace_presence_records(workspace_id, user_email)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS workspace_presence_map_seen_idx ON workspace_presence_records(workspace_id, map_id, last_seen_at)"),
  ]);
}

export async function getWorkspaceAccessContext(): Promise<WorkspaceAccessContext | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  await ensureCommercialSchema();
  await ensureCollaborationSchema();
  const email = user.email.trim().toLowerCase();
  const owner = await env.DB.prepare("SELECT w.id, w.name, w.owner_email, w.trial_started_at, w.trial_ends_at, w.plan, l.status AS license_status, l.current_period_ends_at AS license_period_ends_at FROM workspaces w LEFT JOIN workspace_licenses l ON l.workspace_id = w.id WHERE lower(w.owner_email) = ? LIMIT 1")
    .bind(email).first<WorkspaceAccessContext["workspace"]>();
  if (owner) {
    const entitlement = deriveWorkspaceEntitlement({ workspacePlan: owner.plan, trialEndsAt: owner.trial_ends_at, licenseStatus: owner.license_status, currentPeriodEndsAt: owner.license_period_ends_at });
    return { user, workspace: owner, memberId: null, role: "owner", allMaps: true, commercialCanWrite: entitlement.canEdit };
  }
  const member = await env.DB.prepare("SELECT m.id AS member_id, m.role, m.status, m.all_maps, w.id, w.name, w.owner_email, w.trial_started_at, w.trial_ends_at, w.plan, l.status AS license_status, l.current_period_ends_at AS license_period_ends_at FROM workspace_members m INNER JOIN workspaces w ON w.id = m.workspace_id LEFT JOIN workspace_licenses l ON l.workspace_id = w.id WHERE lower(m.email) = ? AND m.status IN ('pending', 'active') ORDER BY m.invited_at DESC LIMIT 1")
    .bind(email).first<WorkspaceAccessContext["workspace"] & { member_id: string; role: MemberRole; status: string; all_maps: number }>();
  if (!member) return null;
  if (member.status === "pending") {
    await env.DB.prepare("UPDATE workspace_members SET status = 'active', joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP), last_active_at = CURRENT_TIMESTAMP, display_name = CASE WHEN display_name = '' THEN ? ELSE display_name END WHERE id = ?")
      .bind(user.displayName, member.member_id).run();
  } else {
    await env.DB.prepare("UPDATE workspace_members SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?").bind(member.member_id).run();
  }
  return {
    user,
    workspace: { id: member.id, name: member.name, owner_email: member.owner_email, trial_started_at: member.trial_started_at, trial_ends_at: member.trial_ends_at, plan: member.plan, license_status: member.license_status, license_period_ends_at: member.license_period_ends_at },
    memberId: member.member_id,
    role: member.role,
    allMaps: Boolean(member.all_maps),
    commercialCanWrite: deriveWorkspaceEntitlement({ workspacePlan: member.plan, trialEndsAt: member.trial_ends_at, licenseStatus: member.license_status, currentPeriodEndsAt: member.license_period_ends_at }).canEdit,
  };
}

export function canWorkspace(context: WorkspaceAccessContext, action: CollaborationAction) {
  return (action === "view" || context.commercialCanWrite) && roleCan(context.role, action);
}

export function workspaceWriteAllowed(context: WorkspaceAccessContext) {
  return context.commercialCanWrite;
}

export async function canAccessMap(context: WorkspaceAccessContext, mapId: string, action: CollaborationAction) {
  if (action !== "view" && !context.commercialCanWrite) return false;
  if (!roleCan(context.role, action)) return false;
  if (context.role === "owner" || context.role === "admin" || context.allMaps) return true;
  if (!context.memberId) return false;
  const row = await env.DB.prepare("SELECT permission FROM map_permission_records WHERE workspace_id = ? AND member_id = ? AND map_id = ? LIMIT 1")
    .bind(context.workspace.id, context.memberId, mapId).first<{ permission: MemberRole }>();
  return Boolean(row && roleCan(row.permission, action));
}

export async function allowedMapIds(context: WorkspaceAccessContext) {
  if (context.role === "owner" || context.role === "admin" || context.allMaps) return null;
  if (!context.memberId) return [];
  const result = await env.DB.prepare("SELECT map_id FROM map_permission_records WHERE workspace_id = ? AND member_id = ?")
    .bind(context.workspace.id, context.memberId).all<{ map_id: string }>();
  return result.results.map(row => row.map_id);
}

export async function nodeBelongsToAccessibleMap(context: WorkspaceAccessContext, nodeId: string, mapId: string, action: CollaborationAction) {
  if (!await canAccessMap(context, mapId, action)) return false;
  const row = await env.DB.prepare("SELECT node_id FROM node_records WHERE workspace_id = ? AND node_id = ? AND map_id = ? LIMIT 1")
    .bind(context.workspace.id, nodeId, mapId).first();
  return Boolean(row);
}
