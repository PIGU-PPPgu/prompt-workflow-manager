CREATE TABLE `agentUsageStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`userId` int NOT NULL,
	`messageCount` int NOT NULL DEFAULT 0,
	`tokenCount` int NOT NULL DEFAULT 0,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentUsageStats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promptComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promptId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`rating` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promptComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promptFavorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`promptId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promptFavorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promptUsageStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promptId` int NOT NULL,
	`userId` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promptUsageStats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowUsageStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowId` int NOT NULL,
	`userId` int NOT NULL,
	`executionTime` int,
	`status` enum('success','failed') NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflowUsageStats_id` PRIMARY KEY(`id`)
);
