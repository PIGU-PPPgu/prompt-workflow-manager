CREATE TABLE `feishuConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`webhookUrl` text NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`syncOnCreate` boolean NOT NULL DEFAULT true,
	`syncOnUpdate` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feishuConfig_id` PRIMARY KEY(`id`)
);
