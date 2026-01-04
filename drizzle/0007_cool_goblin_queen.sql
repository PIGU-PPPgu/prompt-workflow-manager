ALTER TABLE `prompts` ADD `isTemplate` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `prompts` ADD `templateCategory` varchar(100);