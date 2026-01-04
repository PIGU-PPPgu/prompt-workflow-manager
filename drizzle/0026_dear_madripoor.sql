CREATE TABLE `invitationCodeUsage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codeId` int NOT NULL,
	`userId` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `invitationCodeUsage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitationCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`createdBy` int NOT NULL,
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`grantTier` enum('free','basic','pro') DEFAULT 'free',
	`grantDays` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invitationCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitationCodes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `siteSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
	`isPublic` boolean NOT NULL DEFAULT false,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `siteSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `coupons` ADD `isPublic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `coupons` ADD `targetUserId` int;--> statement-breakpoint
ALTER TABLE `coupons` ADD `description` text;--> statement-breakpoint
ALTER TABLE `users` ADD `invitationCodeId` int;--> statement-breakpoint
ALTER TABLE `invitationCodeUsage` ADD CONSTRAINT `invitationCodeUsage_codeId_invitationCodes_id_fk` FOREIGN KEY (`codeId`) REFERENCES `invitationCodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitationCodeUsage` ADD CONSTRAINT `invitationCodeUsage_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitationCodes` ADD CONSTRAINT `invitationCodes_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `siteSettings` ADD CONSTRAINT `siteSettings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `invitationCodeUsage_codeId_idx` ON `invitationCodeUsage` (`codeId`);--> statement-breakpoint
CREATE INDEX `invitationCodeUsage_userId_idx` ON `invitationCodeUsage` (`userId`);--> statement-breakpoint
CREATE INDEX `invitationCodeUsage_usedAt_idx` ON `invitationCodeUsage` (`usedAt`);--> statement-breakpoint
CREATE INDEX `invitationCodeUsage_unique_user_code` ON `invitationCodeUsage` (`codeId`,`userId`);--> statement-breakpoint
CREATE INDEX `invitationCodes_code_idx` ON `invitationCodes` (`code`);--> statement-breakpoint
CREATE INDEX `invitationCodes_active_expires_idx` ON `invitationCodes` (`isActive`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `invitationCodes_createdAt_idx` ON `invitationCodes` (`createdAt`);--> statement-breakpoint
CREATE INDEX `siteSettings_key_idx` ON `siteSettings` (`key`);