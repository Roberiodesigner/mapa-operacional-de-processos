import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull().unique(),
  name: text("name").notNull(),
  trialStartedAt: text("trial_started_at").notNull(),
  trialEndsAt: text("trial_ends_at").notNull(),
  plan: text("plan").notNull().default("trial"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const projectStates = sqliteTable("project_states", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().unique().references(() => workspaces.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const mapRecords = sqliteTable("map_records", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  mapId: text("map_id").notNull(),
  title: text("title").notNull(),
  favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("map_records_workspace_idx").on(table.workspaceId)]);

export const nodeRecords = sqliteTable("node_records", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(),
  mapId: text("map_id").notNull(),
  parentId: text("parent_id"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type").notNull(),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
  assignee: text("assignee").notNull().default(""),
  start: text("start").notNull().default(""),
  due: text("due").notNull().default(""),
  progress: integer("progress").notNull().default(0),
  blockedReason: text("blocked_reason").notNull().default(""),
  info: text("info").notNull().default(""),
  link: text("link").notNull().default(""),
  evidenceRequired: integer("evidence_required", { mode: "boolean" }).notNull().default(false),
  evidence: text("evidence").notNull().default(""),
  approvalRequired: integer("approval_required", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("node_records_workspace_map_idx").on(table.workspaceId, table.mapId)]);

export const nodeDependencies = sqliteTable("node_dependencies", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  dependencyId: text("dependency_id").notNull(),
  nodeId: text("node_id").notNull(),
  dependsOnId: text("depends_on_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("node_dependencies_workspace_node_idx").on(table.workspaceId, table.nodeId), index("node_dependencies_workspace_prerequisite_idx").on(table.workspaceId, table.dependsOnId)]);

export const nodeChecklistRecords = sqliteTable("node_checklist_records", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  checklistId: text("checklist_id").notNull(),
  nodeId: text("node_id").notNull(),
  text: text("text").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull().default(0),
}, table => [index("checklist_workspace_node_idx").on(table.workspaceId, table.nodeId)]);

export const nodeCommentRecords = sqliteTable("node_comment_records", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  commentId: text("comment_id").notNull(),
  mapId: text("map_id").notNull().default(""),
  nodeId: text("node_id").notNull(),
  parentId: text("parent_id"),
  author: text("author").notNull(),
  authorEmail: text("author_email").notNull().default(""),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  editedAt: text("edited_at"),
  resolvedAt: text("resolved_at"),
  resolvedBy: text("resolved_by").notNull().default(""),
}, table => [index("comments_workspace_node_idx").on(table.workspaceId, table.nodeId)]);

export const workspaceMembers = sqliteTable("workspace_members", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  displayName: text("display_name").notNull().default(""),
  role: text("role").notNull().default("viewer"),
  status: text("status").notNull().default("pending"),
  allMaps: integer("all_maps", { mode: "boolean" }).notNull().default(false),
  invitedBy: text("invited_by").notNull(),
  invitedAt: text("invited_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  joinedAt: text("joined_at"),
  lastActiveAt: text("last_active_at"),
}, table => [
  uniqueIndex("workspace_members_workspace_email_uidx").on(table.workspaceId, table.email),
  index("workspace_members_email_idx").on(table.email, table.status),
]);

export const mapPermissionRecords = sqliteTable("map_permission_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  mapId: text("map_id").notNull(),
  memberId: text("member_id").notNull().references(() => workspaceMembers.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [
  uniqueIndex("map_permissions_member_map_uidx").on(table.memberId, table.mapId),
  index("map_permissions_workspace_map_idx").on(table.workspaceId, table.mapId),
]);

export const commentReactionRecords = sqliteTable("comment_reaction_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  commentId: text("comment_id").notNull(),
  userEmail: text("user_email").notNull(),
  emoji: text("emoji").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("comment_reactions_user_uidx").on(table.commentId, table.userEmail, table.emoji)]);

export const notificationRecords = sqliteTable("notification_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  kind: text("kind").notNull(),
  actorEmail: text("actor_email").notNull(),
  mapId: text("map_id").notNull().default(""),
  nodeId: text("node_id").notNull().default(""),
  commentId: text("comment_id").notNull().default(""),
  message: text("message").notNull(),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("notifications_recipient_idx").on(table.workspaceId, table.recipientEmail, table.readAt, table.createdAt)]);

export const activityLogRecords = sqliteTable("activity_log_records", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  activityId: text("activity_id").notNull(),
  eventText: text("event_text").notNull(),
  eventAt: text("event_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("activity_workspace_idx").on(table.workspaceId, table.createdAt)]);

export const nodeFileRecords = sqliteTable("node_file_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  mapId: text("map_id").notNull(),
  nodeId: text("node_id").notNull(),
  objectKey: text("object_key").notNull().unique(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("node_files_workspace_node_idx").on(table.workspaceId, table.nodeId), index("node_files_workspace_map_idx").on(table.workspaceId, table.mapId)]);

export const auditLogRecords = sqliteTable("audit_log_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  details: text("details").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("audit_workspace_created_idx").on(table.workspaceId, table.createdAt), index("audit_workspace_resource_idx").on(table.workspaceId, table.resourceType, table.resourceId)]);

export const approvalRecords = sqliteTable("approval_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  mapId: text("map_id").notNull(),
  nodeId: text("node_id").notNull(),
  scope: text("scope").notNull().default("node"),
  reviewerName: text("reviewer_name").notNull(),
  reviewerEmail: text("reviewer_email").notNull().default(""),
  requestedBy: text("requested_by").notNull(),
  status: text("status").notNull().default("pending"),
  requestNote: text("request_note").notNull().default(""),
  decisionNote: text("decision_note").notNull().default(""),
  requestedAt: text("requested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  decidedAt: text("decided_at"),
  decidedBy: text("decided_by").notNull().default(""),
}, table => [index("approvals_workspace_map_idx").on(table.workspaceId, table.mapId), index("approvals_workspace_node_idx").on(table.workspaceId, table.nodeId), index("approvals_workspace_status_idx").on(table.workspaceId, table.status)]);

export const approvalEventRecords = sqliteTable("approval_event_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  approvalId: text("approval_id").notNull().references(() => approvalRecords.id, { onDelete: "cascade" }),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("approval_events_approval_idx").on(table.approvalId, table.createdAt), index("approval_events_workspace_idx").on(table.workspaceId, table.createdAt)]);
