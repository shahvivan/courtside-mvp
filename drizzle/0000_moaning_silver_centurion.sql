CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`sport` text NOT NULL,
	`venue` text NOT NULL,
	`starts` text NOT NULL,
	`capacity` integer NOT NULL,
	`description` text NOT NULL,
	`access` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`demo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rsvps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event` text NOT NULL,
	`session` text NOT NULL,
	`role` text NOT NULL,
	`state` text NOT NULL,
	`created` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rsvp_identity` ON `rsvps` (`event`,`session`,`role`);--> statement-breakpoint
CREATE INDEX `idx_rsvp_event_role_state` ON `rsvps` (`event`,`role`,`state`);