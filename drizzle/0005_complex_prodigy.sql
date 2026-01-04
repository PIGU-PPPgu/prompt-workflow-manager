ALTER TABLE `prompts` ADD `isFavorite` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `prompts` ADD `customMark` varchar(50);