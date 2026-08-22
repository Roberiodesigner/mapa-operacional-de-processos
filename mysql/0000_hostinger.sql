SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(191) PRIMARY KEY,
  owner_email VARCHAR(254) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  trial_started_at DATETIME(3) NOT NULL,
  trial_ends_at DATETIME(3) NOT NULL,
  plan VARCHAR(80) NOT NULL DEFAULT 'trial',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX workspaces_owner_email_idx (owner_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_admins (
  email VARCHAR(254) PRIMARY KEY,
  role VARCHAR(80) NOT NULL DEFAULT 'super_admin',
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS billing_plans (
  code VARCHAR(80) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  price_cents INT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  billing_interval VARCHAR(20) NOT NULL,
  provider_price_id VARCHAR(191) NOT NULL DEFAULT '',
  trial_days INT NOT NULL DEFAULT 7,
  active TINYINT(1) NOT NULL DEFAULT 1,
  highlighted TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_licenses (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL UNIQUE,
  plan_code VARCHAR(80) NOT NULL DEFAULT 'trial',
  status VARCHAR(40) NOT NULL DEFAULT 'trialing',
  provider VARCHAR(40) NOT NULL DEFAULT 'manual',
  provider_customer_id VARCHAR(191) NOT NULL DEFAULT '',
  provider_subscription_id VARCHAR(191) NOT NULL DEFAULT '',
  current_period_started_at DATETIME(3) NULL,
  current_period_ends_at DATETIME(3) NULL,
  cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
  granted_by VARCHAR(254) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX workspace_licenses_status_idx (status, plan_code),
  CONSTRAINT workspace_licenses_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS billing_event_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'manual',
  provider_event_id VARCHAR(191) NULL UNIQUE,
  event_type VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT '',
  amount_cents INT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  details LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX billing_events_workspace_idx (workspace_id, created_at),
  INDEX billing_events_type_idx (event_type, created_at),
  CONSTRAINT billing_events_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS billing_checkout_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  plan_code VARCHAR(80) NOT NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'asaas',
  status VARCHAR(40) NOT NULL DEFAULT 'created',
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX billing_checkouts_workspace_idx (workspace_id, created_at),
  CONSTRAINT billing_checkouts_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discount_codes (
  id VARCHAR(191) PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  kind VARCHAR(40) NOT NULL DEFAULT 'percent',
  value INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  max_redemptions INT NULL,
  redemption_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_states (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL UNIQUE,
  payload LONGTEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX project_states_workspace_idx (workspace_id),
  CONSTRAINT project_states_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS map_records (
  storage_id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  map_id VARCHAR(191) NOT NULL,
  title VARCHAR(500) NOT NULL,
  favorite TINYINT(1) NOT NULL DEFAULT 0,
  archived TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX map_records_workspace_idx (workspace_id),
  CONSTRAINT map_records_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS node_records (
  storage_id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  node_id VARCHAR(191) NOT NULL,
  map_id VARCHAR(191) NOT NULL,
  parent_id VARCHAR(191) NULL,
  title VARCHAR(500) NOT NULL,
  description LONGTEXT NOT NULL,
  type VARCHAR(60) NOT NULL,
  status VARCHAR(60) NOT NULL,
  priority VARCHAR(60) NOT NULL,
  assignee VARCHAR(254) NOT NULL DEFAULT '',
  start VARCHAR(40) NOT NULL DEFAULT '',
  due VARCHAR(40) NOT NULL DEFAULT '',
  progress INT NOT NULL DEFAULT 0,
  blocked_reason TEXT NOT NULL,
  info LONGTEXT NOT NULL,
  link TEXT NOT NULL,
  evidence_required TINYINT(1) NOT NULL DEFAULT 0,
  evidence LONGTEXT NOT NULL,
  approval_required TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX node_records_workspace_map_idx (workspace_id, map_id),
  CONSTRAINT node_records_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS node_dependencies (
  storage_id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  dependency_id VARCHAR(191) NOT NULL,
  node_id VARCHAR(191) NOT NULL,
  depends_on_id VARCHAR(191) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX node_dependencies_workspace_node_idx (workspace_id, node_id),
  INDEX node_dependencies_workspace_prerequisite_idx (workspace_id, depends_on_id),
  CONSTRAINT node_dependencies_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS node_checklist_records (
  storage_id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  checklist_id VARCHAR(191) NOT NULL,
  node_id VARCHAR(191) NOT NULL,
  text TEXT NOT NULL,
  done TINYINT(1) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  INDEX checklist_workspace_node_idx (workspace_id, node_id),
  CONSTRAINT checklist_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS node_comment_records (
  storage_id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  comment_id VARCHAR(191) NOT NULL,
  map_id VARCHAR(191) NOT NULL DEFAULT '',
  node_id VARCHAR(191) NOT NULL,
  parent_id VARCHAR(191) NULL,
  author VARCHAR(191) NOT NULL,
  author_email VARCHAR(254) NOT NULL DEFAULT '',
  content LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  edited_at DATETIME(3) NULL,
  resolved_at DATETIME(3) NULL,
  resolved_by VARCHAR(254) NOT NULL DEFAULT '',
  INDEX comments_workspace_node_idx (workspace_id, node_id),
  CONSTRAINT comments_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_members (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  email VARCHAR(254) NOT NULL,
  display_name VARCHAR(191) NOT NULL DEFAULT '',
  role VARCHAR(60) NOT NULL DEFAULT 'viewer',
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  all_maps TINYINT(1) NOT NULL DEFAULT 0,
  invited_by VARCHAR(254) NOT NULL,
  invited_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  joined_at DATETIME(3) NULL,
  last_active_at DATETIME(3) NULL,
  UNIQUE KEY workspace_members_workspace_email_uidx (workspace_id, email),
  INDEX workspace_members_email_idx (email, status),
  CONSTRAINT workspace_members_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS map_permission_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  map_id VARCHAR(191) NOT NULL,
  member_id VARCHAR(191) NOT NULL,
  permission VARCHAR(60) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY map_permissions_member_map_uidx (member_id, map_id),
  INDEX map_permissions_workspace_map_idx (workspace_id, map_id),
  CONSTRAINT map_permissions_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT map_permissions_member_fk FOREIGN KEY (member_id) REFERENCES workspace_members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comment_reaction_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  comment_id VARCHAR(191) NOT NULL,
  user_email VARCHAR(254) NOT NULL,
  emoji VARCHAR(32) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY comment_reactions_user_uidx (comment_id, user_email, emoji),
  CONSTRAINT comment_reactions_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  recipient_email VARCHAR(254) NOT NULL,
  kind VARCHAR(80) NOT NULL,
  actor_email VARCHAR(254) NOT NULL,
  map_id VARCHAR(191) NOT NULL DEFAULT '',
  node_id VARCHAR(191) NOT NULL DEFAULT '',
  comment_id VARCHAR(191) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX notifications_recipient_idx (workspace_id, recipient_email, read_at, created_at),
  CONSTRAINT notifications_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_presence_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  user_email VARCHAR(254) NOT NULL,
  display_name VARCHAR(191) NOT NULL DEFAULT '',
  map_id VARCHAR(191) NOT NULL DEFAULT '',
  node_id VARCHAR(191) NOT NULL DEFAULT '',
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY workspace_presence_workspace_user_uidx (workspace_id, user_email),
  INDEX workspace_presence_map_seen_idx (workspace_id, map_id, last_seen_at),
  CONSTRAINT workspace_presence_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_log_records (
  storage_id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  activity_id VARCHAR(191) NOT NULL,
  event_text TEXT NOT NULL,
  event_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX activity_workspace_idx (workspace_id, created_at),
  CONSTRAINT activity_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS node_file_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  map_id VARCHAR(191) NOT NULL,
  node_id VARCHAR(191) NOT NULL,
  object_key VARCHAR(700) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  content_type VARCHAR(191) NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_by VARCHAR(254) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY node_files_object_key_uidx (object_key(191)),
  INDEX node_files_workspace_node_idx (workspace_id, node_id),
  INDEX node_files_workspace_map_idx (workspace_id, map_id),
  CONSTRAINT node_files_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  actor_email VARCHAR(254) NOT NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id VARCHAR(191) NOT NULL,
  details LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX audit_workspace_created_idx (workspace_id, created_at),
  INDEX audit_workspace_resource_idx (workspace_id, resource_type, resource_id),
  CONSTRAINT audit_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approval_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  map_id VARCHAR(191) NOT NULL,
  node_id VARCHAR(191) NOT NULL,
  scope VARCHAR(40) NOT NULL DEFAULT 'node',
  reviewer_name VARCHAR(191) NOT NULL,
  reviewer_email VARCHAR(254) NOT NULL DEFAULT '',
  requested_by VARCHAR(254) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  request_note TEXT NOT NULL,
  decision_note VARCHAR(4000) NOT NULL DEFAULT '',
  requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  decided_at DATETIME(3) NULL,
  decided_by VARCHAR(254) NOT NULL DEFAULT '',
  INDEX approvals_workspace_map_idx (workspace_id, map_id),
  INDEX approvals_workspace_node_idx (workspace_id, node_id),
  INDEX approvals_workspace_status_idx (workspace_id, status),
  CONSTRAINT approvals_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approval_event_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  approval_id VARCHAR(191) NOT NULL,
  actor_email VARCHAR(254) NOT NULL,
  action VARCHAR(80) NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX approval_events_approval_idx (approval_id, created_at),
  INDEX approval_events_workspace_idx (workspace_id, created_at),
  CONSTRAINT approval_events_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT approval_events_approval_fk FOREIGN KEY (approval_id) REFERENCES approval_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_link_records (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  map_id VARCHAR(191) NOT NULL,
  root_node_id VARCHAR(191) NOT NULL DEFAULT '',
  label VARCHAR(255) NOT NULL DEFAULT '',
  token_hash CHAR(64) NOT NULL UNIQUE,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  allow_comments TINYINT(1) NOT NULL DEFAULT 1,
  expires_at DATETIME(3) NULL,
  created_by VARCHAR(254) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_accessed_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  INDEX review_links_workspace_map_idx (workspace_id, map_id, status, created_at),
  INDEX review_links_token_hash_idx (token_hash),
  CONSTRAINT review_links_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_comment_markers (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  review_link_id VARCHAR(191) NOT NULL,
  comment_id VARCHAR(191) NOT NULL UNIQUE,
  map_id VARCHAR(191) NOT NULL,
  node_id VARCHAR(191) NOT NULL DEFAULT '',
  pin_type VARCHAR(40) NOT NULL DEFAULT 'node',
  pin_x DOUBLE NOT NULL DEFAULT 0.5,
  pin_y DOUBLE NOT NULL DEFAULT 0.5,
  pin_number INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX review_markers_link_idx (review_link_id, pin_number),
  INDEX review_markers_workspace_map_idx (workspace_id, map_id, created_at),
  CONSTRAINT review_markers_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT review_markers_link_fk FOREIGN KEY (review_link_id) REFERENCES review_link_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_rate_limit_records (
  rate_key CHAR(64) PRIMARY KEY,
  window_started_at DATETIME(3) NOT NULL,
  request_count INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO billing_plans
  (code, name, description, price_cents, currency, billing_interval, trial_days, active, highlighted)
VALUES
  ('monthly', 'Mensal', 'Flexibilidade para organizar e executar sem fidelidade.', 500, 'BRL', 'month', 7, 1, 0),
  ('annual', 'Anual', 'Um ano completo com o melhor custo-benefício.', 4900, 'BRL', 'year', 7, 1, 1);
