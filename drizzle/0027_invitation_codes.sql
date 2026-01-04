-- Migration: Add invitation code system with enhanced security
-- Based on: INVITATION_CODE_SYSTEM.md + Codex security review recommendations

-- 创建邀请码表
CREATE TABLE `invitationCodes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `code` varchar(50) NOT NULL UNIQUE,
  `description` text,
  `createdBy` int NOT NULL,
  `maxUses` int CHECK (`maxUses` IS NULL OR `maxUses` > 0), -- 改进：添加非负检查
  `usedCount` int NOT NULL DEFAULT 0 CHECK (`usedCount` >= 0), -- 改进：添加非负检查
  `expiresAt` timestamp,
  `isActive` boolean NOT NULL DEFAULT true,
  `grantTier` enum('free', 'basic', 'pro') DEFAULT 'free',
  `grantDays` int DEFAULT 0 CHECK (`grantDays` >= 0), -- 改进：添加非负检查
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 改进：添加外键约束
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 创建邀请码使用记录表
CREATE TABLE `invitationCodeUsage` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `codeId` int NOT NULL,
  `userId` int NOT NULL,
  `usedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ipAddress` varchar(45),
  `userAgent` text,

  -- 改进：添加外键约束
  FOREIGN KEY (`codeId`) REFERENCES `invitationCodes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,

  -- 改进：防止同一用户重复使用同一邀请码
  UNIQUE KEY `unique_user_code` (`codeId`, `userId`)
);

-- users 表添加邀请码字段
ALTER TABLE `users`
ADD COLUMN `invitationCodeId` int,
ADD FOREIGN KEY (`invitationCodeId`) REFERENCES `invitationCodes`(`id`) ON DELETE SET NULL;

-- 创建索引优化查询性能
CREATE INDEX `idx_invitationCodes_code` ON `invitationCodes` (`code`);
CREATE INDEX `idx_invitationCodes_active_expires` ON `invitationCodes` (`isActive`, `expiresAt`); -- 改进：复合索引优化查询
CREATE INDEX `idx_invitationCodes_createdAt` ON `invitationCodes` (`createdAt` DESC); -- 改进：支持按时间排序
CREATE INDEX `idx_invitationCodeUsage_codeId` ON `invitationCodeUsage` (`codeId`);
CREATE INDEX `idx_invitationCodeUsage_userId` ON `invitationCodeUsage` (`userId`);
CREATE INDEX `idx_invitationCodeUsage_usedAt` ON `invitationCodeUsage` (`usedAt` DESC); -- 改进：支持按时间排序
