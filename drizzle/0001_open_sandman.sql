CREATE TABLE `activity_log_records` (
	`storage_id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`event_text` text NOT NULL,
	`event_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `map_records` (
	`storage_id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`map_id` text NOT NULL,
	`title` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `node_checklist_records` (
	`storage_id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`checklist_id` text NOT NULL,
	`node_id` text NOT NULL,
	`text` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `node_comment_records` (
	`storage_id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`comment_id` text NOT NULL,
	`node_id` text NOT NULL,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `node_dependencies` (
	`storage_id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`dependency_id` text NOT NULL,
	`node_id` text NOT NULL,
	`depends_on_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `node_records` (
	`storage_id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`node_id` text NOT NULL,
	`map_id` text NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`assignee` text DEFAULT '' NOT NULL,
	`due` text DEFAULT '' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`blocked_reason` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
