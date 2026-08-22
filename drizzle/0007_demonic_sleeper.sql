CREATE TABLE `review_comment_markers` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`review_link_id` text NOT NULL,
	`comment_id` text NOT NULL,
	`map_id` text NOT NULL,
	`node_id` text DEFAULT '' NOT NULL,
	`pin_type` text DEFAULT 'node' NOT NULL,
	`pin_x` real DEFAULT 0.5 NOT NULL,
	`pin_y` real DEFAULT 0.5 NOT NULL,
	`pin_number` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`review_link_id`) REFERENCES `review_link_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_comment_markers_comment_id_unique` ON `review_comment_markers` (`comment_id`);--> statement-breakpoint
CREATE INDEX `review_markers_link_idx` ON `review_comment_markers` (`review_link_id`,`pin_number`);--> statement-breakpoint
CREATE INDEX `review_markers_workspace_map_idx` ON `review_comment_markers` (`workspace_id`,`map_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `review_link_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`map_id` text NOT NULL,
	`root_node_id` text DEFAULT '' NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`allow_comments` integer DEFAULT true NOT NULL,
	`expires_at` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_accessed_at` text,
	`revoked_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_link_records_token_hash_unique` ON `review_link_records` (`token_hash`);--> statement-breakpoint
CREATE INDEX `review_links_workspace_map_idx` ON `review_link_records` (`workspace_id`,`map_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `review_links_token_hash_idx` ON `review_link_records` (`token_hash`);--> statement-breakpoint
CREATE TABLE `review_rate_limit_records` (
	`rate_key` text PRIMARY KEY NOT NULL,
	`window_started_at` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL
);
