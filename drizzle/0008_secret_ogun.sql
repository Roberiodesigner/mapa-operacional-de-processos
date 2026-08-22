CREATE TABLE `billing_checkout_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`plan_code` text NOT NULL,
	`provider` text DEFAULT 'asaas' NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `billing_checkouts_workspace_idx` ON `billing_checkout_records` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `billing_event_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`provider` text DEFAULT 'manual' NOT NULL,
	`provider_event_id` text,
	`event_type` text NOT NULL,
	`status` text DEFAULT '' NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_event_records_provider_event_id_unique` ON `billing_event_records` (`provider_event_id`);--> statement-breakpoint
CREATE INDEX `billing_events_workspace_idx` ON `billing_event_records` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `billing_events_type_idx` ON `billing_event_records` (`event_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `billing_plans` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price_cents` integer NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`billing_interval` text NOT NULL,
	`provider_price_id` text DEFAULT '' NOT NULL,
	`trial_days` integer DEFAULT 7 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`highlighted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `discount_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`kind` text DEFAULT 'percent' NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`max_redemptions` integer,
	`redemption_count` integer DEFAULT 0 NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discount_codes_code_unique` ON `discount_codes` (`code`);--> statement-breakpoint
CREATE TABLE `platform_admins` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'super_admin' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_licenses` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`plan_code` text DEFAULT 'trial' NOT NULL,
	`status` text DEFAULT 'trialing' NOT NULL,
	`provider` text DEFAULT 'manual' NOT NULL,
	`provider_customer_id` text DEFAULT '' NOT NULL,
	`provider_subscription_id` text DEFAULT '' NOT NULL,
	`current_period_started_at` text,
	`current_period_ends_at` text,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`granted_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_licenses_workspace_id_unique` ON `workspace_licenses` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_licenses_status_idx` ON `workspace_licenses` (`status`,`plan_code`);