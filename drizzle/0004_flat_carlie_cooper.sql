CREATE TABLE `approval_event_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`approval_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approval_id`) REFERENCES `approval_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `approval_events_approval_idx` ON `approval_event_records` (`approval_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `approval_events_workspace_idx` ON `approval_event_records` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `approval_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`map_id` text NOT NULL,
	`node_id` text NOT NULL,
	`scope` text DEFAULT 'node' NOT NULL,
	`reviewer_name` text NOT NULL,
	`reviewer_email` text DEFAULT '' NOT NULL,
	`requested_by` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`request_note` text DEFAULT '' NOT NULL,
	`decision_note` text DEFAULT '' NOT NULL,
	`requested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`decided_at` text,
	`decided_by` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `approvals_workspace_map_idx` ON `approval_records` (`workspace_id`,`map_id`);--> statement-breakpoint
CREATE INDEX `approvals_workspace_node_idx` ON `approval_records` (`workspace_id`,`node_id`);--> statement-breakpoint
CREATE INDEX `approvals_workspace_status_idx` ON `approval_records` (`workspace_id`,`status`);--> statement-breakpoint
ALTER TABLE `node_records` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `node_records` ADD `start` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `node_records` ADD `info` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `node_records` ADD `link` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `node_records` ADD `evidence_required` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `node_records` ADD `evidence` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `node_records` ADD `approval_required` integer DEFAULT false NOT NULL;