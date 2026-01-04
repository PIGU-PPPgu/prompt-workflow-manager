CREATE TABLE `scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`parentId` int,
	`level` int NOT NULL,
	`isCustom` boolean NOT NULL DEFAULT false,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agents` ADD `linkedPromptIds` text;--> statement-breakpoint
ALTER TABLE `prompts` ADD `scenarioId` int;--> statement-breakpoint
ALTER TABLE `prompts` ADD `variables` text;--> statement-breakpoint
ALTER TABLE `prompts` ADD `score` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `prompts` ADD `structureScore` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `prompts` ADD `clarityScore` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `prompts` ADD `scenarioScore` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `workflows` ADD `platform` varchar(50);--> statement-breakpoint
ALTER TABLE `workflows` ADD `externalUrl` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `externalJson` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `nodeCount` int DEFAULT 0;