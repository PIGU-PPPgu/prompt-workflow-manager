ALTER TABLE `imageGenerations` ADD CONSTRAINT `imageGenerations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imageGenerations` ADD CONSTRAINT `imageGenerations_apiKeyId_apiKeys_id_fk` FOREIGN KEY (`apiKeyId`) REFERENCES `apiKeys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `imageGenerations_userId_idx` ON `imageGenerations` (`userId`);--> statement-breakpoint
CREATE INDEX `imageGenerations_createdAt_idx` ON `imageGenerations` (`createdAt`);--> statement-breakpoint
CREATE INDEX `imageGenerations_userId_createdAt_idx` ON `imageGenerations` (`userId`,`createdAt`);