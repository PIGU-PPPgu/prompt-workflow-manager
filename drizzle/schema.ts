import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Subscription fields
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "basic", "pro"]).default("free").notNull(),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "canceled", "past_due", "trialing"]),
  subscriptionEndDate: timestamp("subscriptionEndDate"),
  // Invitation code tracking
  invitationCodeId: int("invitationCodeId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Categories for organizing prompts, workflows, and agents
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["prompt", "workflow", "agent"]).notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Application scenarios - multi-level classification system
 */
export const scenarios = mysqlTable("scenarios", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  parentId: int("parentId"), // null for level 1
  level: int("level").notNull(), // 1, 2, or 3
  isCustom: boolean("isCustom").default(false).notNull(),
  userId: int("userId"), // null for system scenarios, set for custom
  sortOrder: int("sortOrder").default(0).notNull(), // 用于自定义排序
  icon: varchar("icon", { length: 50 }), // Emoji或图标名称
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = typeof scenarios.$inferInsert;

/**
 * Prompts library table
 */
export const prompts = mysqlTable("prompts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  description: text("description"),
  categoryId: int("categoryId"),
  scenarioId: int("scenarioId"), // link to scenario
  userId: int("userId").notNull(),
  version: int("version").default(1).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  tags: text("tags"), // JSON array of tags
  variables: text("variables"), // JSON array of variable definitions
  gradeLevel: varchar("gradeLevel", { length: 100 }), // 学段/年级: 小学/初中/高中/大学等
  subject: varchar("subject", { length: 100 }), // 学科: 语文/数学/英语/物理等
  textbookVersion: varchar("textbookVersion", { length: 200 }), // 教材版本或出版社
  teachingScene: varchar("teachingScene", { length: 100 }), // 教学场景: 备课/授课/作业/答疑/考试
  score: int("score").default(0), // AI-generated score 0-100
  structureScore: int("structureScore").default(0),
  clarityScore: int("clarityScore").default(0),
  scenarioScore: int("scenarioScore").default(0),
  useCount: int("useCount").default(0), // 使用次数
  lastUsedAt: timestamp("lastUsedAt"), // 最近使用时间
  isFavorite: boolean("isFavorite").default(false).notNull(), // 是否收藏
  customMark: varchar("customMark", { length: 50 }), // 自定义标记: 常用/待优化/已验证
  isTemplate: boolean("isTemplate").default(false).notNull(), // 是否为官方模板
  templateCategory: varchar("templateCategory", { length: 100 }), // 模板分类
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = typeof prompts.$inferInsert;

/**
 * Prompt version history
 */
export const promptVersions = mysqlTable("promptVersions", {
  id: int("id").autoincrement().primaryKey(),
  promptId: int("promptId").notNull(),
  content: text("content").notNull(),
  version: int("version").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PromptVersion = typeof promptVersions.$inferSelect;
export type InsertPromptVersion = typeof promptVersions.$inferInsert;

/**
 * Workflows table
 */
export const workflows = mysqlTable("workflows", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  categoryId: int("categoryId"),
  userId: int("userId").notNull(),
  steps: text("steps").notNull(), // JSON array of workflow steps
  platform: varchar("platform", { length: 50 }), // dify, coze, n8n
  externalUrl: text("externalUrl"), // link to external platform
  externalJson: text("externalJson"), // imported JSON config
  nodeCount: int("nodeCount").default(0),
  isTemplate: boolean("isTemplate").default(false).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  tags: text("tags"), // JSON array of tags
  visitCount: int("visitCount").default(0).notNull(), // 访问次数
  lastVisitedAt: timestamp("lastVisitedAt"), // 最近访问时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;

/**
 * Workflow execution history
 */
export const workflowExecutions = mysqlTable("workflowExecutions", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflowId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed"]).notNull(),
  input: text("input"),
  output: text("output"),
  error: text("error"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = typeof workflowExecutions.$inferInsert;

/**
 * AI Agents table
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  externalUrl: text("externalUrl"), // URL to external agent (e.g., GPTs, Coze, Dify)
  platform: varchar("platform", { length: 50 }), // gpts, coze, dify, custom
  categoryId: int("categoryId"),
  userId: int("userId").notNull(),
  systemPrompt: text("systemPrompt"),
  linkedPromptIds: text("linkedPromptIds"), // JSON array of prompt IDs
  model: varchar("model", { length: 100 }),
  temperature: varchar("temperature", { length: 10 }).default("0.7"),
  maxTokens: int("maxTokens").default(2000),
  isPublic: boolean("isPublic").default(false).notNull(),
  tags: text("tags"), // JSON array of tags
  visitCount: int("visitCount").default(0).notNull(), // 访问次数
  lastVisitedAt: timestamp("lastVisitedAt"), // 最近访问时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Agent conversation history
 */
export const agentConversations = mysqlTable("agentConversations", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  messages: text("messages").notNull(), // JSON array of messages
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentConversation = typeof agentConversations.$inferSelect;
export type InsertAgentConversation = typeof agentConversations.$inferInsert;

/**
 * API Keys for AI services
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // openai, anthropic, etc.
  apiUrl: text("apiUrl"), // API base URL
  keyValue: text("keyValue").notNull(), // encrypted
  models: text("models"), // JSON array of available models
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Prompt favorites for marketplace
 */
export const promptFavorites = mysqlTable("promptFavorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  promptId: int("promptId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PromptFavorite = typeof promptFavorites.$inferSelect;
export type InsertPromptFavorite = typeof promptFavorites.$inferInsert;

/**
 * Prompt comments for marketplace
 */
export const promptComments = mysqlTable("promptComments", {
  id: int("id").autoincrement().primaryKey(),
  promptId: int("promptId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  rating: int("rating"), // 1-5 stars
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromptComment = typeof promptComments.$inferSelect;
export type InsertPromptComment = typeof promptComments.$inferInsert;

/**
 * Usage statistics for prompts
 */
export const promptUsageStats = mysqlTable("promptUsageStats", {
  id: int("id").autoincrement().primaryKey(),
  promptId: int("promptId").notNull(),
  userId: int("userId").notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type PromptUsageStat = typeof promptUsageStats.$inferSelect;
export type InsertPromptUsageStat = typeof promptUsageStats.$inferInsert;

/**
 * Usage statistics for workflows
 */
export const workflowUsageStats = mysqlTable("workflowUsageStats", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflowId").notNull(),
  userId: int("userId").notNull(),
  executionTime: int("executionTime"), // in milliseconds
  status: mysqlEnum("status", ["success", "failed"]).notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type WorkflowUsageStat = typeof workflowUsageStats.$inferSelect;
export type InsertWorkflowUsageStat = typeof workflowUsageStats.$inferInsert;

/**
 * Usage statistics for agents
 */
export const agentUsageStats = mysqlTable("agentUsageStats", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  messageCount: int("messageCount").default(0).notNull(),
  tokenCount: int("tokenCount").default(0).notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type AgentUsageStat = typeof agentUsageStats.$inferSelect;
export type InsertAgentUsageStat = typeof agentUsageStats.$inferInsert;

/**
 * AI Category Assistant Conversations
 */
export const categoryAssistantConversations = mysqlTable("categoryAssistantConversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  messages: text("messages").notNull(), // JSON array of messages
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
  generatedCategories: text("generatedCategories"), // JSON of generated category structure
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CategoryAssistantConversation = typeof categoryAssistantConversations.$inferSelect;
export type InsertCategoryAssistantConversation = typeof categoryAssistantConversations.$inferInsert;

/**
 * Prompt shares for collaboration
 */
export const promptShares = mysqlTable("promptShares", {
  id: int("id").autoincrement().primaryKey(),
  promptId: int("promptId").notNull(),
  userId: int("userId").notNull(), // owner
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  permission: mysqlEnum("permission", ["view", "edit"]).default("view").notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  accessCount: int("accessCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromptShare = typeof promptShares.$inferSelect;
export type InsertPromptShare = typeof promptShares.$inferInsert;

/**
 * Feishu (Lark) integration configuration
 */
export const feishuConfig = mysqlTable("feishuConfig", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  webhookUrl: text("webhookUrl").notNull(), // 飞书Webhook URL
  enabled: boolean("enabled").default(true).notNull(),
  syncOnCreate: boolean("syncOnCreate").default(true).notNull(), // 创建时同步
  syncOnUpdate: boolean("syncOnUpdate").default(true).notNull(), // 更新时同步
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeishuConfig = typeof feishuConfig.$inferSelect;
export type InsertFeishuConfig = typeof feishuConfig.$inferInsert;

/**
 * Category template marketplace - pre-built classification structures
 */
export const categoryTemplates = mysqlTable("categoryTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 模板名称,如"教育行业分类"
  description: text("description"), // 模板描述
  industry: varchar("industry", { length: 50 }).notNull(), // 行业分类:教育/电商/医疗/内容创作等
  icon: varchar("icon", { length: 50 }), // 行业图标
  templateData: text("templateData").notNull(), // JSON格式的完整分类结构
  categoryCount: int("categoryCount").default(0).notNull(), // 包含的分类数量
  level1Count: int("level1Count").default(0).notNull(), // 一级分类数量
  level2Count: int("level2Count").default(0).notNull(), // 二级分类数量
  level3Count: int("level3Count").default(0).notNull(), // 三级分类数量
  isOfficial: boolean("isOfficial").default(true).notNull(), // 是否为官方模板
  downloadCount: int("downloadCount").default(0).notNull(), // 下载次数
  rating: int("rating").default(0), // 评分(0-5星)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CategoryTemplate = typeof categoryTemplates.$inferSelect;
export type InsertCategoryTemplate = typeof categoryTemplates.$inferInsert;

/**
 * Prompt optimization history - saves user's optimization sessions
 */
export const optimizationHistory = mysqlTable("optimizationHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 200 }), // 会话标题(自动生成或用户自定义)
  systemPrompt: text("systemPrompt"), // 系统提示词
  conversationData: text("conversationData").notNull(), // JSON格式的完整对话历史
  settings: text("settings"), // JSON格式的优化设置(模型、强度、框架等)
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(), // 最后一条消息时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OptimizationHistory = typeof optimizationHistory.$inferSelect;
export type InsertOptimizationHistory = typeof optimizationHistory.$inferInsert;

/**
 * Prompt feedback - collect satisfaction and comments after usage
 */
export const promptFeedback = mysqlTable("promptFeedback", {
  id: int("id").autoincrement().primaryKey(),
  promptId: int("promptId").notNull(),
  userId: int("userId").notNull(),
  satisfactionScore: int("satisfactionScore").default(0).notNull(), // 0-5
  hitExpectation: boolean("hitExpectation").default(false).notNull(), // 是否命中预期
  usable: boolean("usable").default(true).notNull(), // 是否可用
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PromptFeedback = typeof promptFeedback.$inferSelect;
export type InsertPromptFeedback = typeof promptFeedback.$inferInsert;


/**
 * User notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["system", "subscription", "operation", "achievement"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  link: varchar("link", { length: 500 }), // Optional link to related resource
  isRead: int("isRead").default(0).notNull(), // 0 = unread, 1 = read
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Subscription history - records all subscription operations
 */
export const subscriptionHistory = mysqlTable("subscriptionHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: mysqlEnum("action", ["upgrade", "renew", "cancel", "expire", "downgrade"]).notNull(),
  fromTier: mysqlEnum("fromTier", ["free", "basic", "pro"]),
  toTier: mysqlEnum("toTier", ["free", "basic", "pro"]).notNull(),
  durationDays: int("durationDays"), // 订阅时长(天)
  amount: int("amount"), // 金额(分)
  paymentMethod: varchar("paymentMethod", { length: 50 }), // 支付方式
  operatorId: int("operatorId"), // 操作人ID(管理员手动操作时记录)
  note: text("note"), // 备注
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type InsertSubscriptionHistory = typeof subscriptionHistory.$inferInsert;

/**
 * Coupon codes for subscription discounts
 */
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(), // 百分比折扣或固定金额
  discountValue: int("discountValue").notNull(), // 折扣值(百分比1-100或固定金额分)
  tier: mysqlEnum("tier", ["basic", "pro"]), // 适用的订阅计划,null表示全部
  maxUses: int("maxUses"), // 最大使用次数,null表示无限制
  usedCount: int("usedCount").default(0).notNull(), // 已使用次数
  expiresAt: timestamp("expiresAt"), // 过期时间,null表示永久有效
  isActive: boolean("isActive").default(true).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(), // 是否为公开促销券
  targetUserId: int("targetUserId"), // 定向发放的用户ID,null表示非定向券
  description: text("description"), // 优惠券描述(公开券展示用)
  createdBy: int("createdBy").notNull(), // 创建者用户ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

/**
 * Coupon usage history
 */
export const couponUsage = mysqlTable("couponUsage", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("couponId").notNull(),
  userId: int("userId").notNull(),
  orderId: varchar("orderId", { length: 100 }), // 订单ID(如果有)
  discountAmount: int("discountAmount").notNull(), // 实际折扣金额(分)
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type CouponUsage = typeof couponUsage.$inferSelect;
export type InsertCouponUsage = typeof couponUsage.$inferInsert;

/**
 * Audit logs for tracking user actions
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, execute, login, etc.
  resourceType: varchar("resourceType", { length: 50 }).notNull(), // prompt, workflow, agent, subscription, etc.
  resourceId: int("resourceId"), // ID of the affected resource
  details: text("details"), // JSON with additional details
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Image generation history - tracks all AI image generation requests
 */
export const imageGenerations = mysqlTable("imageGenerations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  prompt: text("prompt").notNull(), // 生成图片的提示词
  model: varchar("model", { length: 100 }).notNull(), // 使用的模型名称
  apiKeyId: int("apiKeyId").references(() => apiKeys.id), // 使用的API Key ID
  imageUrls: text("imageUrls").notNull(), // 生成的图片URL列表(JSON数组)
  parameters: text("parameters"), // 生成参数(JSON): size, n, quality, style等
  status: mysqlEnum("status", ["pending", "success", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"), // 错误信息(如果失败)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("imageGenerations_userId_idx").on(table.userId),
  createdAtIdx: index("imageGenerations_createdAt_idx").on(table.createdAt),
  userCreatedIdx: index("imageGenerations_userId_createdAt_idx").on(table.userId, table.createdAt),
}));

export type ImageGeneration = typeof imageGenerations.$inferSelect;
export type InsertImageGeneration = typeof imageGenerations.$inferInsert;

/**
 * Invitation codes for controlling user registration access
 * Security: Uses nanoid for code generation, enforces transaction-based usage tracking
 */
export const invitationCodes = mysqlTable("invitationCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  maxUses: int("maxUses"), // null = unlimited
  usedCount: int("usedCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  grantTier: mysqlEnum("grantTier", ["free", "basic", "pro"]).default("free"),
  grantDays: int("grantDays").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codeIdx: index("invitationCodes_code_idx").on(table.code),
  activeExpiresIdx: index("invitationCodes_active_expires_idx").on(table.isActive, table.expiresAt),
  createdAtIdx: index("invitationCodes_createdAt_idx").on(table.createdAt),
}));

export type InvitationCode = typeof invitationCodes.$inferSelect;
export type InsertInvitationCode = typeof invitationCodes.$inferInsert;

/**
 * Invitation code usage history
 * Security: Prevents duplicate usage with unique constraint on (codeId, userId)
 */
export const invitationCodeUsage = mysqlTable("invitationCodeUsage", {
  id: int("id").autoincrement().primaryKey(),
  codeId: int("codeId").notNull().references(() => invitationCodes.id),
  userId: int("userId").notNull().references(() => users.id),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
}, (table) => ({
  codeIdIdx: index("invitationCodeUsage_codeId_idx").on(table.codeId),
  userIdIdx: index("invitationCodeUsage_userId_idx").on(table.userId),
  usedAtIdx: index("invitationCodeUsage_usedAt_idx").on(table.usedAt),
  // Unique constraint to prevent duplicate usage
  uniqueUserCode: index("invitationCodeUsage_unique_user_code").on(table.codeId, table.userId),
}));

export type InvitationCodeUsageRecord = typeof invitationCodeUsage.$inferSelect;
export type InsertInvitationCodeUsage = typeof invitationCodeUsage.$inferInsert;

/**
 * Global site settings (key-value store)
 * Only accessible by admins
 */
export const siteSettings = mysqlTable("siteSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"), // 设置项说明
  type: mysqlEnum("type", ["string", "number", "boolean", "json"]).default("string").notNull(),
  isPublic: boolean("isPublic").default(false).notNull(), // 是否对外公开（前端可读取）
  updatedBy: int("updatedBy").references(() => users.id), // 最后修改人
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  keyIdx: index("siteSettings_key_idx").on(table.key),
  isPublicIdx: index("siteSettings_isPublic_idx").on(table.isPublic),
  updatedAtIdx: index("siteSettings_updatedAt_idx").on(table.updatedAt),
}));

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;
