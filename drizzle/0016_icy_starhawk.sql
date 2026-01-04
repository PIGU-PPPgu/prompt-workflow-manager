ALTER TABLE `agents` ADD `visitCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `lastVisitedAt` timestamp;--> statement-breakpoint
ALTER TABLE `workflows` ADD `visitCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workflows` ADD `lastVisitedAt` timestamp;