CREATE TABLE `workspace_presence_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_email` text NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`map_id` text DEFAULT '' NOT NULL,
	`node_id` text DEFAULT '' NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_presence_workspace_user_uidx` ON `workspace_presence_records` (`workspace_id`,`user_email`);--> statement-breakpoint
CREATE INDEX `workspace_presence_map_seen_idx` ON `workspace_presence_records` (`workspace_id`,`map_id`,`last_seen_at`);