ALTER TABLE `prompts` ADD `scoreReason` text;--> statement-breakpoint
ALTER TABLE `prompts` ADD `marketScore` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `prompts` ADD `isMarketEligible` boolean DEFAULT false NOT NULL;