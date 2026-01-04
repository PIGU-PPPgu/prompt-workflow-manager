CREATE TABLE `promptFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promptId` int NOT NULL,
	`userId` int NOT NULL,
	`satisfactionScore` int NOT NULL DEFAULT 0,
	`hitExpectation` boolean NOT NULL DEFAULT false,
	`usable` boolean NOT NULL DEFAULT true,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promptFeedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `prompts` ADD `gradeLevel` varchar(100);--> statement-breakpoint
ALTER TABLE `prompts` ADD `subject` varchar(100);--> statement-breakpoint
ALTER TABLE `prompts` ADD `textbookVersion` varchar(200);--> statement-breakpoint
ALTER TABLE `prompts` ADD `teachingScene` varchar(100);