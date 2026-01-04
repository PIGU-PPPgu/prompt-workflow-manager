-- TeachPT MySQL 初始化脚本
-- 这个脚本会在 MySQL 容器首次启动时自动执行

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 确保数据库存在
CREATE DATABASE IF NOT EXISTS prompt_workflow_manager
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 授予权限
GRANT ALL PRIVILEGES ON prompt_workflow_manager.* TO 'teachpt'@'%';
FLUSH PRIVILEGES;

-- 切换到数据库
USE prompt_workflow_manager;

-- 数据库表会由 Drizzle ORM 在应用启动时自动创建/迁移
-- 这里只做基础配置
