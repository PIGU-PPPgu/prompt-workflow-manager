-- Migration: Add isPublic, targetUserId, and description to coupons table
-- Purpose: Support public promotional coupons and targeted coupons

ALTER TABLE `coupons`
ADD COLUMN `isPublic` boolean NOT NULL DEFAULT false,
ADD COLUMN `targetUserId` int,
ADD COLUMN `description` text;

-- Add index for public coupons query optimization
CREATE INDEX `idx_coupons_isPublic` ON `coupons` (`isPublic`, `isActive`, `expiresAt`);

-- Add index for targeted coupons query optimization
CREATE INDEX `idx_coupons_targetUserId` ON `coupons` (`targetUserId`);
