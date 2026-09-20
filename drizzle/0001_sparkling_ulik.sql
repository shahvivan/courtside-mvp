PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_rsvps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event` text NOT NULL,
	`session` text NOT NULL,
	`role` text NOT NULL,
	`state` text NOT NULL,
	`created` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO `__new_rsvps`("id", "event", "session", "role", "state", "created") SELECT "id", "event", "session", "role", "state", "created" FROM `rsvps`;--> statement-breakpoint
DROP TABLE `rsvps`;--> statement-breakpoint
ALTER TABLE `__new_rsvps` RENAME TO `rsvps`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rsvp_identity` ON `rsvps` (`event`,`session`,`role`);--> statement-breakpoint
CREATE INDEX `idx_rsvp_event_role_state` ON `rsvps` (`event`,`role`,`state`);