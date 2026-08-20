CREATE TABLE `audit_log_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_workspace_created_idx` ON `audit_log_records` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_workspace_resource_idx` ON `audit_log_records` (`workspace_id`,`resource_type`,`resource_id`);--> statement-breakpoint
CREATE TABLE `node_file_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`map_id` text NOT NULL,
	`node_id` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `node_file_records_object_key_unique` ON `node_file_records` (`object_key`);--> statement-breakpoint
CREATE INDEX `node_files_workspace_node_idx` ON `node_file_records` (`workspace_id`,`node_id`);--> statement-breakpoint
CREATE INDEX `node_files_workspace_map_idx` ON `node_file_records` (`workspace_id`,`map_id`);