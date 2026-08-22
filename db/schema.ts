import { boolean, doublePrecision, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  ownerUserId: uuid("owner_user_id").unique(),
  ownerEmail: text("owner_email").notNull().unique(),
  name: text("name").notNull(),
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true, mode: "string" }).notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true, mode: "string" }).notNull(),
  plan: text("plan").notNull().default("trial"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const platformAdmins = pgTable("platform_admins", {
  email: text("email").primaryKey(),
  userId: uuid("user_id").unique(),
  role: text("role").notNull().default("super_admin"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const billingPlans = pgTable("billing_plans", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("BRL"),
  billingInterval: text("billing_interval").notNull(),
  providerPriceId: text("provider_price_id").notNull().default(""),
  trialDays: integer("trial_days").notNull().default(7),
  active: boolean("active").notNull().default(true),
  highlighted: boolean("highlighted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const workspaceLicenses = pgTable("workspace_licenses", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().unique().references(() => workspaces.id, { onDelete: "cascade" }),
  planCode: text("plan_code").notNull().default("trial"),
  status: text("status").notNull().default("trialing"),
  provider: text("provider").notNull().default("manual"),
  providerCustomerId: text("provider_customer_id").notNull().default(""),
  providerSubscriptionId: text("provider_subscription_id").notNull().default(""),
  currentPeriodStartedAt: timestamp("current_period_started_at", { withTimezone: true, mode: "string" }),
  currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true, mode: "string" }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  grantedBy: text("granted_by").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("workspace_licenses_status_idx").on(table.status, table.planCode)]);

export const billingEventRecords = pgTable("billing_event_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  provider: text("provider").notNull().default("manual"),
  providerEventId: text("provider_event_id").unique(),
  eventType: text("event_type").notNull(),
  status: text("status").notNull().default(""),
  amountCents: integer("amount_cents").notNull().default(0),
  currency: text("currency").notNull().default("BRL"),
  details: text("details").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [
  index("billing_events_workspace_idx").on(table.workspaceId, table.createdAt),
  index("billing_events_type_idx").on(table.eventType, table.createdAt),
]);

export const billingCheckoutRecords = pgTable("billing_checkout_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  planCode: text("plan_code").notNull(),
  provider: text("provider").notNull().default("asaas"),
  status: text("status").notNull().default("created"),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("billing_checkouts_workspace_idx").on(table.workspaceId, table.createdAt)]);

export const discountCodes = pgTable("discount_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  kind: text("kind").notNull().default("percent"),
  value: integer("value").notNull().default(0),
  active: boolean("active").notNull().default(true),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const projectStates = pgTable("project_states", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().unique().references(() => workspaces.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const mapRecords = pgTable("map_records", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  mapId: text("map_id").notNull(),
  title: text("title").notNull(),
  favorite: boolean("favorite").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("map_records_workspace_idx").on(table.workspaceId)]);

export const nodeRecords = pgTable("node_records", {
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
  evidenceRequired: boolean("evidence_required").notNull().default(false),
  evidence: text("evidence").notNull().default(""),
  approvalRequired: boolean("approval_required").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("node_records_workspace_map_idx").on(table.workspaceId, table.mapId)]);

export const nodeDependencies = pgTable("node_dependencies", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  dependencyId: text("dependency_id").notNull(),
  nodeId: text("node_id").notNull(),
  dependsOnId: text("depends_on_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("node_dependencies_workspace_node_idx").on(table.workspaceId, table.nodeId), index("node_dependencies_workspace_prerequisite_idx").on(table.workspaceId, table.dependsOnId)]);

export const nodeChecklistRecords = pgTable("node_checklist_records", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  checklistId: text("checklist_id").notNull(),
  nodeId: text("node_id").notNull(),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  position: integer("position").notNull().default(0),
}, table => [index("checklist_workspace_node_idx").on(table.workspaceId, table.nodeId)]);

export const nodeCommentRecords = pgTable("node_comment_records", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  commentId: text("comment_id").notNull(),
  mapId: text("map_id").notNull().default(""),
  nodeId: text("node_id").notNull(),
  parentId: text("parent_id"),
  author: text("author").notNull(),
  authorEmail: text("author_email").notNull().default(""),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  editedAt: timestamp("edited_at", { withTimezone: true, mode: "string" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
  resolvedBy: text("resolved_by").notNull().default(""),
}, table => [index("comments_workspace_node_idx").on(table.workspaceId, table.nodeId)]);

export const workspaceMembers = pgTable("workspace_members", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id"),
  email: text("email").notNull(),
  displayName: text("display_name").notNull().default(""),
  role: text("role").notNull().default("viewer"),
  status: text("status").notNull().default("pending"),
  allMaps: boolean("all_maps").notNull().default(false),
  invitedBy: text("invited_by").notNull(),
  invitedAt: timestamp("invited_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: "string" }),
}, table => [
  uniqueIndex("workspace_members_workspace_email_uidx").on(table.workspaceId, table.email),
  index("workspace_members_email_idx").on(table.email, table.status),
]);

export const mapPermissionRecords = pgTable("map_permission_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  mapId: text("map_id").notNull(),
  memberId: text("member_id").notNull().references(() => workspaceMembers.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [
  uniqueIndex("map_permissions_member_map_uidx").on(table.memberId, table.mapId),
  index("map_permissions_workspace_map_idx").on(table.workspaceId, table.mapId),
]);

export const commentReactionRecords = pgTable("comment_reaction_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  commentId: text("comment_id").notNull(),
  userEmail: text("user_email").notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [uniqueIndex("comment_reactions_user_uidx").on(table.commentId, table.userEmail, table.emoji)]);

export const notificationRecords = pgTable("notification_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  kind: text("kind").notNull(),
  actorEmail: text("actor_email").notNull(),
  mapId: text("map_id").notNull().default(""),
  nodeId: text("node_id").notNull().default(""),
  commentId: text("comment_id").notNull().default(""),
  message: text("message").notNull(),
  readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("notifications_recipient_idx").on(table.workspaceId, table.recipientEmail, table.readAt, table.createdAt)]);

export const workspacePresenceRecords = pgTable("workspace_presence_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userEmail: text("user_email").notNull(),
  displayName: text("display_name").notNull().default(""),
  mapId: text("map_id").notNull().default(""),
  nodeId: text("node_id").notNull().default(""),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [
  uniqueIndex("workspace_presence_workspace_user_uidx").on(table.workspaceId, table.userEmail),
  index("workspace_presence_map_seen_idx").on(table.workspaceId, table.mapId, table.lastSeenAt),
]);

export const activityLogRecords = pgTable("activity_log_records", {
  storageId: text("storage_id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  activityId: text("activity_id").notNull(),
  eventText: text("event_text").notNull(),
  eventAt: timestamp("event_at", { withTimezone: true, mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("activity_workspace_idx").on(table.workspaceId, table.createdAt)]);

export const nodeFileRecords = pgTable("node_file_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  mapId: text("map_id").notNull(),
  nodeId: text("node_id").notNull(),
  objectKey: text("object_key").notNull().unique(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("node_files_workspace_node_idx").on(table.workspaceId, table.nodeId), index("node_files_workspace_map_idx").on(table.workspaceId, table.mapId)]);

export const auditLogRecords = pgTable("audit_log_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  details: text("details").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("audit_workspace_created_idx").on(table.workspaceId, table.createdAt), index("audit_workspace_resource_idx").on(table.workspaceId, table.resourceType, table.resourceId)]);

export const approvalRecords = pgTable("approval_records", {
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
  requestedAt: timestamp("requested_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true, mode: "string" }),
  decidedBy: text("decided_by").notNull().default(""),
}, table => [index("approvals_workspace_map_idx").on(table.workspaceId, table.mapId), index("approvals_workspace_node_idx").on(table.workspaceId, table.nodeId), index("approvals_workspace_status_idx").on(table.workspaceId, table.status)]);

export const approvalEventRecords = pgTable("approval_event_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  approvalId: text("approval_id").notNull().references(() => approvalRecords.id, { onDelete: "cascade" }),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("approval_events_approval_idx").on(table.approvalId, table.createdAt), index("approval_events_workspace_idx").on(table.workspaceId, table.createdAt)]);

export const reviewLinkRecords = pgTable("review_link_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  mapId: text("map_id").notNull(),
  rootNodeId: text("root_node_id").notNull().default(""),
  label: text("label").notNull().default(""),
  tokenHash: text("token_hash").notNull().unique(),
  status: text("status").notNull().default("active"),
  allowComments: boolean("allow_comments").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true, mode: "string" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
}, table => [index("review_links_workspace_map_idx").on(table.workspaceId, table.mapId, table.status, table.createdAt), index("review_links_token_hash_idx").on(table.tokenHash)]);

export const reviewCommentMarkers = pgTable("review_comment_markers", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  reviewLinkId: text("review_link_id").notNull().references(() => reviewLinkRecords.id, { onDelete: "cascade" }),
  commentId: text("comment_id").notNull().unique(),
  mapId: text("map_id").notNull(),
  nodeId: text("node_id").notNull().default(""),
  pinType: text("pin_type").notNull().default("node"),
  pinX: doublePrecision("pin_x").notNull().default(0.5),
  pinY: doublePrecision("pin_y").notNull().default(0.5),
  pinNumber: integer("pin_number").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [index("review_markers_link_idx").on(table.reviewLinkId, table.pinNumber), index("review_markers_workspace_map_idx").on(table.workspaceId, table.mapId, table.createdAt)]);

export const reviewRateLimitRecords = pgTable("review_rate_limit_records", {
  rateKey: text("rate_key").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true, mode: "string" }).notNull(),
  requestCount: integer("request_count").notNull().default(0),
});
