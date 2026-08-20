CREATE TABLE `comment_reaction_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`comment_id` text NOT NULL,
	`user_email` text NOT NULL,
	`emoji` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_reactions_user_uidx` ON `comment_reaction_records` (`comment_id`,`user_email`,`emoji`);--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`all_maps` integer DEFAULT false NOT NULL,
	`invited_by` text NOT NULL,
	`invited_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`joined_at` text,
	`last_active_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_members_workspace_email_uidx` ON `workspace_members` (`workspace_id`,`email`);--> statement-breakpoint
CREATE INDEX `workspace_members_email_idx` ON `workspace_members` (`email`,`status`);--> statement-breakpoint
CREATE TABLE `map_permission_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`map_id` text NOT NULL,
	`member_id` text NOT NULL,
	`permission` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `workspace_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `map_permissions_member_map_uidx` ON `map_permission_records` (`member_id`,`map_id`);--> statement-breakpoint
CREATE INDEX `map_permissions_workspace_map_idx` ON `map_permission_records` (`workspace_id`,`map_id`);--> statement-breakpoint
CREATE TABLE `notification_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`recipient_email` text NOT NULL,
	`kind` text NOT NULL,
	`actor_email` text NOT NULL,
	`map_id` text DEFAULT '' NOT NULL,
	`node_id` text DEFAULT '' NOT NULL,
	`comment_id` text DEFAULT '' NOT NULL,
	`message` text NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notification_records` (`workspace_id`,`recipient_email`,`read_at`,`created_at`);--> statement-breakpoint
ALTER TABLE `node_comment_records` ADD `map_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `node_comment_records` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `node_comment_records` ADD `author_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `node_comment_records` ADD `edited_at` text;--> statement-breakpoint
ALTER TABLE `node_comment_records` ADD `resolved_at` text;--> statement-breakpoint
ALTER TABLE `node_comment_records` ADD `resolved_by` text DEFAULT '' NOT NULL;
