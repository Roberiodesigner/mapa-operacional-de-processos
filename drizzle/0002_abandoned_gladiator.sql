CREATE INDEX `activity_workspace_idx` ON `activity_log_records` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `map_records_workspace_idx` ON `map_records` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `checklist_workspace_node_idx` ON `node_checklist_records` (`workspace_id`,`node_id`);--> statement-breakpoint
CREATE INDEX `comments_workspace_node_idx` ON `node_comment_records` (`workspace_id`,`node_id`);--> statement-breakpoint
CREATE INDEX `node_dependencies_workspace_node_idx` ON `node_dependencies` (`workspace_id`,`node_id`);--> statement-breakpoint
CREATE INDEX `node_dependencies_workspace_prerequisite_idx` ON `node_dependencies` (`workspace_id`,`depends_on_id`);--> statement-breakpoint
CREATE INDEX `node_records_workspace_map_idx` ON `node_records` (`workspace_id`,`map_id`);