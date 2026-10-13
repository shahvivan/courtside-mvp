CREATE TABLE IF NOT EXISTS `participant_metadata` (
	`rsvp` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL
);
