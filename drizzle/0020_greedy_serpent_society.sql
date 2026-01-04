CREATE TABLE `subscriptionHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` enum('upgrade','renew','cancel','expire','downgrade') NOT NULL,
	`fromTier` enum('free','basic','pro'),
	`toTier` enum('free','basic','pro') NOT NULL,
	`durationDays` int,
	`amount` int,
	`paymentMethod` varchar(50),
	`operatorId` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptionHistory_id` PRIMARY KEY(`id`)
);
