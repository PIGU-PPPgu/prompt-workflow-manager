CREATE TABLE `imageGenerations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`prompt` text NOT NULL,
	`model` varchar(100) NOT NULL,
	`apiKeyId` int,
	`imageUrls` text NOT NULL,
	`parameters` text,
	`status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `imageGenerations_id` PRIMARY KEY(`id`)
);
