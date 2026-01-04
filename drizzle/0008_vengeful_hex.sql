CREATE TABLE `categoryAssistantConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`messages` text NOT NULL,
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`generatedCategories` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categoryAssistantConversations_id` PRIMARY KEY(`id`)
);
