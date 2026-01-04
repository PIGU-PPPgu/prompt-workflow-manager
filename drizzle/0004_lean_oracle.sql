ALTER TABLE `apiKeys` ADD `apiUrl` text;--> statement-breakpoint
ALTER TABLE `apiKeys` ADD `models` text;--> statement-breakpoint
ALTER TABLE `prompts` ADD `useCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `prompts` ADD `lastUsedAt` timestamp;