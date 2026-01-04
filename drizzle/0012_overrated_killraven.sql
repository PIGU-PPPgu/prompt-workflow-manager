CREATE TABLE `categoryTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`industry` varchar(50) NOT NULL,
	`icon` varchar(50),
	`templateData` text NOT NULL,
	`categoryCount` int NOT NULL DEFAULT 0,
	`level1Count` int NOT NULL DEFAULT 0,
	`level2Count` int NOT NULL DEFAULT 0,
	`level3Count` int NOT NULL DEFAULT 0,
	`isOfficial` boolean NOT NULL DEFAULT true,
	`downloadCount` int NOT NULL DEFAULT 0,
	`rating` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categoryTemplates_id` PRIMARY KEY(`id`)
);
