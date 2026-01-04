CREATE TABLE `promptShares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promptId` int NOT NULL,
	`userId` int NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`permission` enum('view','edit') NOT NULL DEFAULT 'view',
	`isPublic` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp,
	`accessCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promptShares_id` PRIMARY KEY(`id`),
	CONSTRAINT `promptShares_shareToken_unique` UNIQUE(`shareToken`)
);
