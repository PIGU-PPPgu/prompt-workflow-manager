import { eq, and, or, desc, sql, isNull, gt } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import {
  InsertUser, users,
  prompts, InsertPrompt,
  promptVersions, InsertPromptVersion,
  workflows, InsertWorkflow,
  workflowExecutions, InsertWorkflowExecution,
  agents, InsertAgent,
  agentConversations, InsertAgentConversation,
  promptFavorites, promptComments, promptUsageStats, workflowUsageStats, agentUsageStats,
  categories, InsertCategory,
  apiKeys, InsertApiKey,
  scenarios, InsertScenario,
  feishuConfig, InsertFeishuConfig,
  categoryTemplates, InsertCategoryTemplate,
  optimizationHistory, InsertOptimizationHistory,
  notifications, InsertNotification,
  subscriptionHistory, InsertSubscriptionHistory,
  coupons, InsertCoupon,
  couponUsage, InsertCouponUsage,
  promptFeedback, InsertPromptFeedback,
  auditLogs, InsertAuditLog,
  imageGenerations, InsertImageGeneration,
  invitationCodes, InsertInvitationCode,
  invitationCodeUsage, InsertInvitationCodeUsage,
  siteSettings, InsertSiteSetting
} from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import { nanoid } from "nanoid";
import { ENV } from './_core/env';

let _db: MySql2Database<typeof schema> | null = null;

export async function getDb(): Promise<MySql2Database<typeof schema> | null> {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool: Pool = createPool(process.env.DATABASE_URL);
      _db = drizzle(pool, { schema, mode: 'default' });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Functions ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    // Extended text fields including phoneNumber
    const textFields = ["name", "email", "loginMethod", "phoneNumber"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      // We do NOT add these to updateSet to avoid overwriting user's local changes
      // on every login. We only use them for the initial INSERT.
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function updateUser(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, userId));
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Category Functions ============
export async function getUserCategories(userId: number, type?: "prompt" | "workflow" | "agent") {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(categories.userId, userId)];
  if (type) {
    conditions.push(eq(categories.type, type));
  }

  return await db.select().from(categories).where(and(...conditions)).orderBy(desc(categories.createdAt));
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(categories).values(data);
  return result;
}

export async function deleteCategory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

// ============ Prompt Functions ============
type PromptFilters = {
  gradeLevel?: string;
  subject?: string;
  teachingScene?: string;
  textbookVersion?: string;
};

export async function getUserPrompts(userId: number, filters?: PromptFilters) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(prompts.userId, userId)];

  if (filters?.gradeLevel) conditions.push(eq(prompts.gradeLevel, filters.gradeLevel));
  if (filters?.subject) conditions.push(eq(prompts.subject, filters.subject));
  if (filters?.teachingScene) conditions.push(eq(prompts.teachingScene, filters.teachingScene));
  if (filters?.textbookVersion) conditions.push(eq(prompts.textbookVersion, filters.textbookVersion));

  return await db
    .select()
    .from(prompts)
    .where(and(...conditions))
    .orderBy(desc(prompts.updatedAt));
}

export async function getPromptById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(prompts).where(and(eq(prompts.id, id), eq(prompts.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPrompt(data: InsertPrompt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(prompts).values(data);
  const insertId = Number(result[0].insertId);

  // Create initial version
  await db.insert(promptVersions).values({
    promptId: insertId,
    content: data.content,
    version: 1,
  });

  return insertId;
}

export async function updatePrompt(id: number, userId: number, data: Partial<InsertPrompt>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getPromptById(id, userId);
  if (!existing) throw new Error("Prompt not found");

  // If content changed, create new version
  if (data.content && data.content !== existing.content) {
    const newVersion = existing.version + 1;
    await db.insert(promptVersions).values({
      promptId: id,
      content: data.content,
      version: newVersion,
    });
    data.version = newVersion;
  }

  await db.update(prompts).set(data).where(and(eq(prompts.id, id), eq(prompts.userId, userId)));
}

export async function deletePrompt(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(promptVersions).where(eq(promptVersions.promptId, id));
  await db.delete(prompts).where(and(eq(prompts.id, id), eq(prompts.userId, userId)));
}

export async function createPromptFeedback(data: InsertPromptFeedback) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 验证提示词存在
  const promptExists = await db
    .select({ id: prompts.id })
    .from(prompts)
    .where(eq(prompts.id, data.promptId))
    .limit(1);
  if (promptExists.length === 0) throw new Error("Prompt not found");

  await db.insert(promptFeedback).values({
    ...data,
    satisfactionScore: Math.max(0, Math.min(5, data.satisfactionScore ?? 0)),
  });
}

export async function getPromptFeedbackSummary(promptId: number) {
  const db = await getDb();
  if (!db) return { count: 0, avgSatisfaction: 0, hitRate: 0, usableRate: 0, recent: [] };

  const summary = await db.execute(
    sql`SELECT 
          COUNT(*) as count,
          AVG(satisfactionScore) as avgSatisfaction,
          AVG(CASE WHEN hitExpectation = 1 THEN 1 ELSE 0 END) as hitRate,
          AVG(CASE WHEN usable = 1 THEN 1 ELSE 0 END) as usableRate
        FROM ${promptFeedback}
        WHERE ${promptFeedback.promptId} = ${promptId}`
  );

  const recent = await db
    .select()
    .from(promptFeedback)
    .where(eq(promptFeedback.promptId, promptId))
    .orderBy(desc(promptFeedback.createdAt))
    .limit(10);

  const row = (summary as any)?.[0] || {};
  return {
    count: Number(row.count || 0),
    avgSatisfaction: Number(row.avgSatisfaction || 0),
    hitRate: Number(row.hitRate || 0),
    usableRate: Number(row.usableRate || 0),
    recent,
  };
}

export async function getPromptVersions(promptId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(promptVersions).where(eq(promptVersions.promptId, promptId)).orderBy(desc(promptVersions.version));
}

// ============ Workflow Functions ============
export async function getUserWorkflows(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(workflows).where(eq(workflows.userId, userId)).orderBy(desc(workflows.updatedAt));
}

export async function getWorkflowById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(workflows).where(and(eq(workflows.id, id), eq(workflows.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createWorkflow(data: InsertWorkflow) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(workflows).values(data);
  return Number(result[0].insertId);
}

export async function updateWorkflow(id: number, userId: number, data: Partial<InsertWorkflow>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(workflows).set(data).where(and(eq(workflows.id, id), eq(workflows.userId, userId)));
}

export async function deleteWorkflow(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(workflowExecutions).where(eq(workflowExecutions.workflowId, id));
  await db.delete(workflows).where(and(eq(workflows.id, id), eq(workflows.userId, userId)));
}

export async function createWorkflowExecution(data: InsertWorkflowExecution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(workflowExecutions).values(data);
  return Number(result[0].insertId);
}

export async function updateWorkflowExecution(id: number, data: Partial<InsertWorkflowExecution>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(workflowExecutions).set(data).where(eq(workflowExecutions.id, id));
}

export async function getWorkflowExecutions(workflowId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(workflowExecutions)
    .where(and(eq(workflowExecutions.workflowId, workflowId), eq(workflowExecutions.userId, userId)))
    .orderBy(desc(workflowExecutions.startedAt));
}

// ============ Agent Functions ============
export async function getUserAgents(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.updatedAt));
}

export async function getAgentById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(agents).where(and(eq(agents.id, id), eq(agents.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAgent(data: InsertAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agents).values(data);
  return Number(result[0].insertId);
}

export async function updateAgent(id: number, userId: number, data: Partial<InsertAgent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(agents).set(data).where(and(eq(agents.id, id), eq(agents.userId, userId)));
}

export async function deleteAgent(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(agentConversations).where(eq(agentConversations.agentId, id));
  await db.delete(agents).where(and(eq(agents.id, id), eq(agents.userId, userId)));
}

export async function getAgentConversations(agentId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(agentConversations)
    .where(and(eq(agentConversations.agentId, agentId), eq(agentConversations.userId, userId)))
    .orderBy(desc(agentConversations.updatedAt));
}

export async function createAgentConversation(data: InsertAgentConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agentConversations).values(data);
  return Number(result[0].insertId);
}

export async function updateAgentConversation(id: number, userId: number, data: Partial<InsertAgentConversation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(agentConversations).set(data).where(and(eq(agentConversations.id, id), eq(agentConversations.userId, userId)));
}

// ============ API Key Functions ============
export async function getUserApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
}

export async function createApiKey(data: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(apiKeys).values(data);
  return Number(result[0].insertId);
}

export async function updateApiKey(id: number, userId: number, data: Partial<InsertApiKey>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(apiKeys).set(data).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}

export async function deleteApiKey(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}

export async function getApiKeyById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 获取解密后的 API Key（用于实际调用 AI 服务）
 */
export async function getDecryptedApiKey(userId: number, provider?: string) {
  const db = await getDb();
  if (!db) return null;

  const { decrypt } = await import('./_core/crypto');

  let query = db.select().from(apiKeys).where(
    and(
      eq(apiKeys.userId, userId),
      eq(apiKeys.isActive, true)
    )
  );

  const keys = await query;

  // 如果指定了 provider，过滤
  const filteredKeys = provider
    ? keys.filter(k => k.provider === provider)
    : keys;

  if (filteredKeys.length === 0) return null;

  const key = filteredKeys[0];
  return {
    ...key,
    keyValue: decrypt(key.keyValue) || key.keyValue, // 解密，如果失败返回原值
  };
}

// ============ Scenario Functions ============
export async function getAllScenarios(userId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (userId) {
    // 已登录用户：返回系统预设 + 自己的自定义场景
    return await db.select()
      .from(scenarios)
      .where(
        or(
          eq(scenarios.isCustom, false),  // 系统预设场景
          eq(scenarios.userId, userId)    // 用户自己的自定义场景
        )
      )
      .orderBy(scenarios.level, scenarios.sortOrder, scenarios.id);
  } else {
    // 未登录用户：只返回系统预设场景
    return await db.select()
      .from(scenarios)
      .where(eq(scenarios.isCustom, false))
      .orderBy(scenarios.level, scenarios.sortOrder, scenarios.id);
  }
}

export async function getScenariosByLevel(level: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(scenarios).where(eq(scenarios.level, level));
}

export async function getScenariosByParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(scenarios).where(eq(scenarios.parentId, parentId));
}

export async function createScenario(scenario: InsertScenario) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scenarios).values(scenario);
  return Number(result[0].insertId);
}

// ============ AI Optimization & Scoring Functions ============
import { invokeLLM } from "./_core/llm";

export async function optimizePrompt(
  content: string,
  targetModel?: "gpt" | "claude" | "general",
  intensity?: "light" | "medium" | "deep"
) {
  const intensityMap = {
    light: "轻度优化:主要修正语法和格式",
    medium: "中度优化:添加结构化元素和明确约束",
    deep: "深度优化:全面重构,添加角色、任务、格式、示例等完整结构"
  };

  const modelMap = {
    gpt: "适配ChatGPT/GPT-4风格,使用对话式、友好的语气",
    claude: "适配Claude风格,使用结构化、详细的描述",
    general: "通用优化,适配多种模型"
  };

  const systemPrompt = `你是一个专业的提示词优化专家。你的任务是优化用户提供的提示词,使其更加清晰、结构化和有效。

优化目标:
- ${intensityMap[intensity || "medium"]}
- ${modelMap[targetModel || "general"]}

优化原则:
1. 结构化:添加明确的角色定义、任务描述、输出格式
2. 清晰度:消除歧义,使用精确的描述
3. 可执行性:确保提示词可以直接使用,产生预期结果

请直接返回优化后的提示词,不要添加额外说明。`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请优化以下提示词:\n\n${content}` }
    ],
  });

  const messageContent = response.choices[0]?.message?.content;
  const optimizedContent = typeof messageContent === 'string' ? messageContent : content;

  return {
    original: content,
    optimized: optimizedContent,
    improvements: await analyzeImprovements(content, optimizedContent),
  };
}

async function analyzeImprovements(original: string, optimized: string) {
  const improvements = [];
  
  // 检查是否添加了角色定义
  if (!original.includes("你是") && optimized.includes("你是")) {
    improvements.push("添加了角色定义");
  }
  
  // 检查是否添加了输出格式
  if (!original.includes("格式") && !original.includes("输出") && 
      (optimized.includes("格式") || optimized.includes("输出"))) {
    improvements.push("明确了输出格式");
  }
  
  // 检查是否添加了约束条件
  if (!original.includes("要求") && !original.includes("注意") && 
      (optimized.includes("要求") || optimized.includes("注意"))) {
    improvements.push("添加了约束条件");
  }
  
  return improvements;
}

export async function calculatePromptScore(promptId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const prompt = await getPromptById(promptId, userId);
  if (!prompt) throw new Error("Prompt not found");

  const content = prompt.content;

  // 使用AI评分
  const systemPrompt = `你是一个专业的提示词质量评估专家。你的任务是评估提示词的质量并给出详细评分。

评估维度（每项0-100分）：
1. **结构完整性**：是否包含角色定义、任务描述、输出格式、约束条件等完整结构
2. **清晰度**：语言是否精确、无歧义、易于理解
3. **场景适配度**：是否针对特定场景、有明确分类和标签

请以JSON格式返回评分结果，格式如下：
\`\`\`json
{
  "structureScore": 85,
  "clarityScore": 90,
  "scenarioScore": 70,
  "structureReason": "包含明确的角色定义和任务描述，但缺少输出格式说明",
  "clarityReason": "语言精确，逻辑清晰，无明显歧义",
  "scenarioReason": "适用场景较通用，建议添加具体场景分类"
}
\`\`\`

请直接返回JSON，不要添加其他文字说明。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请评估以下提示词的质量:\n\n${content}` }
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent || typeof messageContent !== 'string') {
      throw new Error("AI返回结果为空");
    }

    // 提取JSON（可能被代码块包裹）
    const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                     messageContent.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("AI返回格式错误");
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const scoreData = JSON.parse(jsonStr);

    const structureScore = Math.max(0, Math.min(100, scoreData.structureScore || 0));
    const clarityScore = Math.max(0, Math.min(100, scoreData.clarityScore || 0));
    const scenarioScore = Math.max(0, Math.min(100, scoreData.scenarioScore || 0));

    // 综合评分
    const totalScore = Math.round(
      structureScore * 0.4 +
      clarityScore * 0.35 +
      scenarioScore * 0.25
    );

    // 组合详细理由
    const scoreReason = JSON.stringify({
      structureReason: scoreData.structureReason || "",
      clarityReason: scoreData.clarityReason || "",
      scenarioReason: scoreData.scenarioReason || "",
    });

    // 更新数据库
    await db.update(prompts)
      .set({
        score: totalScore,
        structureScore,
        clarityScore,
        scenarioScore,
        scoreReason,
      })
      .where(eq(prompts.id, promptId));

    return {
      totalScore,
      structureScore,
      clarityScore,
      scenarioScore,
      scoreReason,
    };
  } catch (error: any) {
    console.error("AI评分失败，使用规则评分:", error);

    // 降级：使用原有的规则评分
    let structureScore = 0;
    if (content.includes("你是") || content.includes("你的角色")) structureScore += 25;
    if (content.includes("请") || content.includes("任务")) structureScore += 25;
    if (content.includes("格式") || content.includes("输出")) structureScore += 25;
    if (content.includes("要求") || content.includes("注意") || content.includes("约束")) structureScore += 25;

    const sentences = content.split(/[。.!?]/);
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    let clarityScore = 100;
    if (avgLength > 50) clarityScore -= 20;
    if (content.includes("等") || content.includes("之类")) clarityScore -= 10;

    let scenarioScore = 50;
    if (prompt.scenarioId) scenarioScore = 80;
    if (prompt.tags) scenarioScore += 20;

    const totalScore = Math.round(
      structureScore * 0.4 +
      clarityScore * 0.35 +
      scenarioScore * 0.25
    );

    const scoreReason = JSON.stringify({
      structureReason: "使用规则评分（AI评分失败）",
      clarityReason: "使用规则评分（AI评分失败）",
      scenarioReason: "使用规则评分（AI评分失败）",
    });

    await db.update(prompts)
      .set({
        score: totalScore,
        structureScore,
        clarityScore,
        scenarioScore,
        scoreReason,
      })
      .where(eq(prompts.id, promptId));

    return {
      totalScore,
      structureScore,
      clarityScore,
      scenarioScore,
      scoreReason,
    };
  }
}

// ============ Marketplace Functions ============

export async function getPublicPrompts() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.isPublic, true),
        eq(prompts.isMarketEligible, true)
      )
    );

  return result;
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(promptFavorites)
    .where(eq(promptFavorites.userId, userId));
}

export async function toggleFavorite(userId: number, promptId: number) {
  const db = await getDb();
  if (!db) return;
  
  const existing = await db
    .select()
    .from(promptFavorites)
    .where(
      and(
        eq(promptFavorites.userId, userId),
        eq(promptFavorites.promptId, promptId)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    await db
      .delete(promptFavorites)
      .where(eq(promptFavorites.id, existing[0].id));
  } else {
    await db.insert(promptFavorites).values({ userId, promptId });
  }
}

export async function getPromptComments(promptId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(promptComments)
    .where(eq(promptComments.promptId, promptId));
}

export async function addPromptComment(data: { promptId: number; userId: number; content: string; rating?: number }) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(promptComments).values(data);
}

export async function importPromptToUser(promptId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  
  const original = await db
    .select()
    .from(prompts)
    .where(eq(prompts.id, promptId))
    .limit(1);
  
  if (original.length === 0) return;
  
  const prompt = original[0];
  const [result] = await db.insert(prompts).values({
    title: prompt.title + " (导入)",
    description: prompt.description,
    content: prompt.content,
    scenarioId: prompt.scenarioId,
    variables: prompt.variables,
    userId,
    isPublic: false,
  });
  
  return result.insertId;
}

export async function recordPromptUsage(promptId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(promptUsageStats).values({ promptId, userId });
}

export async function recordWorkflowUsage(data: { workflowId: number; userId: number; executionTime?: number; status: "success" | "failed" }) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(workflowUsageStats).values(data);
}

export async function recordAgentUsage(data: { agentId: number; userId: number; messageCount?: number; tokenCount?: number }) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(agentUsageStats).values(data);
}

export async function getPromptUsageStats(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Use Drizzle ORM for stats (simplified)
  const userPrompts = await db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, userId));
  
  return userPrompts.slice(0, 10);
}

export async function getWorkflowUsageStats(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Use Drizzle ORM for stats (simplified)
  const userWorkflows = await db
    .select()
    .from(workflows)
    .where(eq(workflows.userId, userId));
  
  return userWorkflows.slice(0, 10);
}

export async function getAgentUsageStats(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Use Drizzle ORM for stats (simplified)
  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, userId));
  
  return userAgents.slice(0, 10);
}

export async function recordPromptUse(promptId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const prompt = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  if (prompt.length === 0) {
    throw new Error("Prompt not found");
  }
  // 允许: 自己的 prompt OR 公开的 prompt
  if (prompt[0].userId !== userId && !prompt[0].isPublic) {
    throw new Error("Access denied");
  }

  await db.update(prompts)
    .set({
      useCount: sql`${prompts.useCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(prompts.id, promptId));

  // 重新计算市场准入分数
  await calculateMarketScore(promptId);
}

export async function calculateMarketScore(promptId: number) {
  const db = await getDb();
  if (!db) return { marketScore: 0, isMarketEligible: false };

  const result = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  if (result.length === 0) return { marketScore: 0, isMarketEligible: false };

  const prompt = result[0];
  const useCount = prompt.useCount || 0;
  const score = prompt.score || 0;

  // 公式: marketScore = useCount * 0.3 + score * 0.7
  const marketScore = Math.round(useCount * 0.3 + score * 0.7);
  const isMarketEligible = marketScore >= 50;

  await db.update(prompts)
    .set({ marketScore, isMarketEligible })
    .where(eq(prompts.id, promptId));

  return { marketScore, isMarketEligible };
}



export async function analyzePromptAndSuggest(content: string) {
  // AI分析提示词并生成标签和分类建议
  // 这里使用简单的关键词匹配,实际应该调用LLM API
  
  const suggestedTags: string[] = [];
  const keywords = content.toLowerCase();
  
  // 简单的关键词匹配生成标签
  if (keywords.includes("营销") || keywords.includes("推广")) suggestedTags.push("营销");
  if (keywords.includes("文案") || keywords.includes("写作")) suggestedTags.push("文案");
  if (keywords.includes("代码") || keywords.includes("编程")) suggestedTags.push("编程");
  if (keywords.includes("设计") || keywords.includes("创意")) suggestedTags.push("设计");
  if (keywords.includes("数据") || keywords.includes("分析")) suggestedTags.push("数据分析");
  if (keywords.includes("客服") || keywords.includes("服务")) suggestedTags.push("客户服务");
  
  // 如果没有匹配到标签,添加通用标签
  if (suggestedTags.length === 0) {
    suggestedTags.push("通用", "AI助手");
  }
  
  // 推荐场景分类(这里返回null,实际应该根据内容推荐)
  const suggestedScenarioId = null;
  
  return {
    suggestedTags,
    suggestedScenarioId,
    reasoning: "基于提示词内容分析,推荐以上标签和分类。建议根据实际使用场景调整。"
  };
}

export async function updateScenario(id: number, userId: number, data: { name?: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 🔒 安全检查：只能更新自己创建的自定义分类
  const scenario = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1).then(rows => rows[0]);
  if (!scenario) {
    throw new Error("分类不存在");
  }
  if (scenario.isCustom && scenario.userId !== userId) {
    throw new Error("无权限：只能编辑自己创建的分类");
  }
  if (!scenario.isCustom) {
    throw new Error("无法编辑系统预设分类");
  }

  const updates: any = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;

  if (Object.keys(updates).length > 0) {
    await db.update(scenarios).set(updates).where(eq(scenarios.id, id));
  }
}

export async function deleteScenario(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 🔒 安全检查：只能删除自己创建的自定义分类
  const scenario = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1).then(rows => rows[0]);
  if (!scenario) {
    throw new Error("分类不存在");
  }
  if (scenario.isCustom && scenario.userId !== userId) {
    throw new Error("无权限：只能删除自己创建的分类");
  }
  if (!scenario.isCustom) {
    throw new Error("无法删除系统预设分类");
  }

  await db.delete(scenarios).where(eq(scenarios.id, id));
}

// ============ Prompt Favorite & Mark Functions ============
export async function togglePromptFavorite(promptId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const prompt = await getPromptById(promptId, userId);
  if (!prompt) throw new Error("Prompt not found");

  await db.update(prompts)
    .set({ isFavorite: !prompt.isFavorite })
    .where(and(eq(prompts.id, promptId), eq(prompts.userId, userId)));
}

export async function setPromptCustomMark(promptId: number, userId: number, mark: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(prompts)
    .set({ customMark: mark })
    .where(and(eq(prompts.id, promptId), eq(prompts.userId, userId)));
}

export async function batchUpdatePrompts(
  ids: number[], 
  userId: number, 
  action: string,
  options: {
    tags?: string[];
    categoryId?: number;
    scenarioId?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const id of ids) {
    const prompt = await getPromptById(id, userId);
    if (!prompt) continue;

    if (action === "addTags" && options.tags) {
      const existingTags = prompt.tags ? JSON.parse(prompt.tags) : [];
      const newTags = Array.from(new Set([...existingTags, ...options.tags]));
      await db.update(prompts)
        .set({ tags: JSON.stringify(newTags) })
        .where(and(eq(prompts.id, id), eq(prompts.userId, userId)));
    } else if (action === "removeTags" && options.tags) {
      const existingTags = prompt.tags ? JSON.parse(prompt.tags) : [];
      const newTags = existingTags.filter((t: string) => !options.tags!.includes(t));
      await db.update(prompts)
        .set({ tags: JSON.stringify(newTags) })
        .where(and(eq(prompts.id, id), eq(prompts.userId, userId)));
    } else if (action === "setCategory" && options.categoryId !== undefined) {
      await db.update(prompts)
        .set({ categoryId: options.categoryId })
        .where(and(eq(prompts.id, id), eq(prompts.userId, userId)));
    } else if (action === "setScenario" && options.scenarioId !== undefined) {
      await db.update(prompts)
        .set({ scenarioId: options.scenarioId })
        .where(and(eq(prompts.id, id), eq(prompts.userId, userId)));
    } else if (action === "optimize") {
      // Batch optimize will be handled separately
      const optimized = await optimizePrompt(prompt.content);
      await updatePrompt(id, userId, { content: optimized.optimized });
    }
  }
}

// ============ Scenario Sorting Functions ============
export async function updateScenarioOrder(scenarioId: number, userId: number, newOrder: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(scenarios)
    .set({ updatedAt: new Date() }) // Use updatedAt to track order changes
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.userId, userId)));
}

// ============ AI Generate Scenarios ============
export async function generateScenariosByAI(industry: string) {
  // 使用AI生成行业分类结构
  const systemPrompt = `你是一个专业的行业分类专家。请为指定的行业生成一个三级分类结构。

要求:
1. 返回JSON格式
2. 包含一个顶级分类(行业名称)
3. 每个顶级分类下有3-5个二级分类
4. 每个二级分类下有3-5个三级分类
5. 分类名称要简洁、专业、实用

JSON格式示例:
{
  "name": "行业名称",
  "children": [
    {
      "name": "二级分类1",
      "children": ["三级分类1", "三级分类2", "三级分类3"]
    }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请为"${industry}"行业生成三级分类结构` }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "industry_categories",
        strict: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "行业名称" },
            children: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "二级分类名称" },
                  children: {
                    type: "array",
                    items: { type: "string", description: "三级分类名称" }
                  }
                },
                required: ["name", "children"],
                additionalProperties: false
              }
            }
          },
          required: ["name", "children"],
          additionalProperties: false
        }
      }
    }
  });

  const messageContent = response.choices[0]?.message?.content;
  if (typeof messageContent !== 'string') {
    throw new Error("AI返回格式错误");
  }

  return JSON.parse(messageContent);
}

export async function updateScenarioSortOrder(updates: Array<{ id: number; sortOrder: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const update of updates) {
    await db.update(scenarios)
      .set({ sortOrder: update.sortOrder })
      .where(eq(scenarios.id, update.id));
  }
}

// ============ Template Library Functions ============
export async function getTemplatePrompts(category?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (category) {
    return await db.select().from(prompts).where(and(
      eq(prompts.isTemplate, true),
      eq(prompts.templateCategory, category)
    ));
  }
  
  return await db.select().from(prompts).where(eq(prompts.isTemplate, true));
}

export async function getTemplateCategories() {
  const db = await getDb();
  if (!db) return [];
  
  const templates = await db
    .select({ templateCategory: prompts.templateCategory })
    .from(prompts)
    .where(eq(prompts.isTemplate, true));
  
  const uniqueCategories = new Set(templates.map(t => t.templateCategory).filter(Boolean));
  const categories = Array.from(uniqueCategories);
  return categories;
}

export async function importTemplateToUser(templateId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 获取模板
  const template = await db.select().from(prompts).where(eq(prompts.id, templateId)).limit(1);
  if (template.length === 0) throw new Error("Template not found");
  
  const templateData = template[0];
  
  // 创建用户的副本
  const result = await db.insert(prompts).values({
    title: templateData.title,
    content: templateData.content,
    description: templateData.description,
    scenarioId: templateData.scenarioId,
    tags: templateData.tags,
    variables: templateData.variables,
    userId: userId,
    isTemplate: false,
    isPublic: false,
  });
  
  return Number(result[0].insertId);
}

// ============ Category Assistant Conversation Functions ============
import { categoryAssistantConversations, InsertCategoryAssistantConversation } from "../drizzle/schema";

export async function createCategoryAssistantConversation(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(categoryAssistantConversations).values({
    userId,
    messages: JSON.stringify([]),
    status: "active",
  });
  
  return Number(result[0].insertId);
}

export async function getCategoryAssistantConversation(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(categoryAssistantConversations)
    .where(and(
      eq(categoryAssistantConversations.id, id),
      eq(categoryAssistantConversations.userId, userId)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function updateCategoryAssistantConversation(
  id: number,
  userId: number,
  data: {
    messages?: string;
    status?: "active" | "completed" | "cancelled";
    generatedCategories?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(categoryAssistantConversations)
    .set(data)
    .where(and(
      eq(categoryAssistantConversations.id, id),
      eq(categoryAssistantConversations.userId, userId)
    ));
}

export async function getUserCategoryAssistantConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(categoryAssistantConversations)
    .where(eq(categoryAssistantConversations.userId, userId))
    .orderBy(desc(categoryAssistantConversations.createdAt));
}

export async function chatWithCategoryAssistant(conversationId: number, userId: number, userMessage: string, fileContent?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 获取会话
  const conversation = await getCategoryAssistantConversation(conversationId, userId);
  if (!conversation) throw new Error("Conversation not found");
  
  const messages = JSON.parse(conversation.messages || "[]");
  
  // 添加用户消息
  messages.push({
    role: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  });
  
  // 构建AI提示词
  let systemPrompt = `你是一个专业的分类助手,帮助用户创建合理的三级分类结构。

你的任务:
1. 通过对话了解用户的需求和背景
2. 如果用户提供了文件内容,分析其中的分类结构
3. 提出分类建议,并询问用户是否需要调整
4. 最终生成一个JSON格式的三级分类结构

分类结构示例:
{
  "name": "一级分类名称",
  "children": [
    {
      "name": "二级分类名称",
      "children": ["三级分类1", "三级分类2", "三级分类3"]
    }
  ]
}

当用户确认分类结构后,请在回复的最后添加标记: [GENERATE_CATEGORIES]
然后紧跟JSON格式的分类结构。`;

  if (fileContent) {
    systemPrompt += `\n\n用户上传的文件内容:\n${fileContent}`;
  }
  
  // 调用LLM
  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];
  
  const response = await invokeLLM({ messages: aiMessages });
  const aiReply = typeof response.choices[0].message.content === 'string' 
    ? response.choices[0].message.content 
    : "抱歉,我无法生成回复。";
  
  // 添加AI回复
  messages.push({
    role: "assistant",
    content: aiReply,
    timestamp: new Date().toISOString(),
  });
  
  // 检查是否包含生成标记
  let generatedCategories = null;
  if (typeof aiReply === 'string' && aiReply.includes("[GENERATE_CATEGORIES]")) {
    const jsonMatch = aiReply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        generatedCategories = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // JSON解析失败,忽略
      }
    }
  }
  
  // 更新会话
  await updateCategoryAssistantConversation(conversationId, userId, {
    messages: JSON.stringify(messages),
    generatedCategories: generatedCategories ? JSON.stringify(generatedCategories) : undefined,
  });
  
  return {
    reply: aiReply,
    generatedCategories,
  };
}

// ============ Prompt Share Functions ============
import { promptShares, InsertPromptShare } from "../drizzle/schema";
import crypto from "crypto";

export async function createPromptShare(data: {
  promptId: number;
  userId: number;
  permission: "view" | "edit";
  isPublic: boolean;
  expiresAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const shareToken = crypto.randomBytes(32).toString("hex");
  
  await db.insert(promptShares).values({
    ...data,
    shareToken,
  });
  
  return shareToken;
}

export async function getPromptShareByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(promptShares)
    .where(eq(promptShares.shareToken, token))
    .limit(1);
  
  if (result.length === 0) return null;
  
  const share = result[0];
  
  // Check expiration
  if (share.expiresAt && new Date() > share.expiresAt) {
    return null;
  }
  
  // Increment access count
  await db
    .update(promptShares)
    .set({ accessCount: share.accessCount + 1 })
    .where(eq(promptShares.id, share.id));
  
  return share;
}

export async function getUserPromptShares(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(promptShares)
    .where(eq(promptShares.userId, userId))
    .orderBy(desc(promptShares.createdAt));
}

export async function deletePromptShare(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(promptShares)
    .where(and(
      eq(promptShares.id, id),
      eq(promptShares.userId, userId)
    ));
}

export async function getPromptShares(promptId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(promptShares)
    .where(and(
      eq(promptShares.promptId, promptId),
      eq(promptShares.userId, userId)
    ))
    .orderBy(desc(promptShares.createdAt));
}

// ============ Smart Recommendation Functions ============
export async function getRecommendedPrompts(userId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  
  // 获取用户最近使用的提示词
  const recentUsage = await db
    .select()
    .from(promptUsageStats)
    .where(eq(promptUsageStats.userId, userId))
    .orderBy(desc(promptUsageStats.usedAt))
    .limit(10);
  
  if (recentUsage.length === 0) {
    // 如果没有使用历史,推荐热门提示词
    return await db
      .select()
      .from(prompts)
      .where(eq(prompts.isTemplate, true))
      .orderBy(desc(prompts.useCount))
      .limit(limit);
  }
  
  // 获取最近使用提示词的标签和分类
  const recentPromptIds = recentUsage.map(u => u.promptId);
  const recentPrompts = await db
    .select()
    .from(prompts)
    .where(sql`${prompts.id} IN (${sql.join(recentPromptIds.map(id => sql`${id}`), sql`, `)})`);
  
  // 提取标签
  const allTags = new Set<string>();
  const allScenarioIds = new Set<number>();
  
  for (const prompt of recentPrompts) {
    if (prompt.tags) {
      const tags = JSON.parse(prompt.tags);
      tags.forEach((tag: string) => allTags.add(tag));
    }
    if (prompt.scenarioId) {
      allScenarioIds.add(prompt.scenarioId);
    }
  }
  
  // 查找相似提示词(相同标签或分类)
  const recommendations = await db
    .select()
    .from(prompts)
    .where(and(
      eq(prompts.userId, userId),
      sql`${prompts.id} NOT IN (${sql.join(recentPromptIds.map(id => sql`${id}`), sql`, `)})`
    ))
    .limit(limit * 2);
  
  // 计算相似度并排序
  const scored = recommendations.map(prompt => {
    let score = 0;
    
    // 标签匹配
    if (prompt.tags) {
      const tags = JSON.parse(prompt.tags);
      tags.forEach((tag: string) => {
        if (allTags.has(tag)) score += 2;
      });
    }
    
    // 分类匹配
    if (prompt.scenarioId && allScenarioIds.has(prompt.scenarioId)) {
      score += 3;
    }
    
    // 收藏加分
    if (prompt.isFavorite) score += 1;
    
    // 使用次数加分
    score += Math.min((prompt.useCount || 0) / 10, 2);
    
    return { ...prompt, score };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function getRecommendedTemplates(userId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  
  // 获取用户最近使用的提示词的分类
  const recentUsage = await db
    .select()
    .from(promptUsageStats)
    .where(eq(promptUsageStats.userId, userId))
    .orderBy(desc(promptUsageStats.usedAt))
    .limit(10);
  
  if (recentUsage.length === 0) {
    // 如果没有使用历史,推荐热门模板
    return await db
      .select()
      .from(prompts)
      .where(eq(prompts.isTemplate, true))
      .orderBy(desc(prompts.useCount))
      .limit(limit);
  }
  
  const recentPromptIds = recentUsage.map(u => u.promptId);
  const recentPrompts = await db
    .select()
    .from(prompts)
    .where(sql`${prompts.id} IN (${sql.join(recentPromptIds.map(id => sql`${id}`), sql`, `)})`);
  
  const scenarioIds = new Set(recentPrompts.map(p => p.scenarioId).filter(Boolean));
  
  if (scenarioIds.size === 0) {
    return await db
      .select()
      .from(prompts)
      .where(eq(prompts.isTemplate, true))
      .orderBy(desc(prompts.useCount))
      .limit(limit);
  }
  
  // 推荐相同分类的模板
  return await db
    .select()
    .from(prompts)
    .where(and(
      eq(prompts.isTemplate, true),
      sql`${prompts.scenarioId} IN (${sql.join(Array.from(scenarioIds).map(id => sql`${id}`), sql`, `)})`
    ))
    .orderBy(desc(prompts.useCount))
    .limit(limit);
}

// ============ Export Functions ============
export async function exportPromptsAsMarkdown(promptIds: number[], userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const promptList = await db
    .select()
    .from(prompts)
    .where(and(
      sql`${prompts.id} IN (${sql.join(promptIds.map(id => sql`${id}`), sql`, `)})`,
      eq(prompts.userId, userId)
    ));
  
  let markdown = `# 提示词导出\n\n导出时间: ${new Date().toLocaleString()}\n\n---\n\n`;
  
  for (const prompt of promptList) {
    markdown += `## ${prompt.title}\n\n`;
    
    if (prompt.description) {
      markdown += `**描述:** ${prompt.description}\n\n`;
    }
    
    if (prompt.tags) {
      const tags = JSON.parse(prompt.tags);
      markdown += `**标签:** ${tags.join(", ")}\n\n`;
    }
    
    markdown += `**内容:**\n\n\`\`\`\n${prompt.content}\n\`\`\`\n\n`;
    
    if (prompt.variables) {
      markdown += `**变量:** ${prompt.variables}\n\n`;
    }
    
    markdown += `---\n\n`;
  }
  
  return markdown;
}

export async function exportPromptsAsJSON(promptIds: number[], userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const promptList = await db
    .select()
    .from(prompts)
    .where(and(
      sql`${prompts.id} IN (${sql.join(promptIds.map(id => sql`${id}`), sql`, `)})`,
      eq(prompts.userId, userId)
    ));
  
  const exportData = {
    exportTime: new Date().toISOString(),
    count: promptList.length,
    prompts: promptList.map(p => ({
      title: p.title,
      description: p.description,
      content: p.content,
      tags: p.tags ? JSON.parse(p.tags) : [],
      variables: p.variables,
      createdAt: p.createdAt,
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
}

export async function exportPromptsAsCSV(promptIds: number[], userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const promptList = await db
    .select()
    .from(prompts)
    .where(and(
      sql`${prompts.id} IN (${sql.join(promptIds.map(id => sql`${id}`), sql`, `)})`,
      eq(prompts.userId, userId)
    ));
  
  let csv = "标题,描述,内容,标签,变量,创建时间\n";
  
  for (const prompt of promptList) {
    const title = `"${(prompt.title || "").replace(/"/g, '""')}"`;
    const description = `"${(prompt.description || "").replace(/"/g, '""')}"`;
    const content = `"${prompt.content.replace(/"/g, '""')}"`;
    const tags = prompt.tags ? `"${JSON.parse(prompt.tags).join(", ")}"` : '""';
    const variables = `"${(prompt.variables || "").replace(/"/g, '""')}"`;
    const createdAt = `"${new Date(prompt.createdAt).toLocaleString()}"`;
    
    csv += `${title},${description},${content},${tags},${variables},${createdAt}\n`;
  }
  
  return csv;
}

export async function restorePromptVersion(promptId: number, version: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the version to restore
  const versionToRestore = await db
    .select()
    .from(promptVersions)
    .where(and(eq(promptVersions.promptId, promptId), eq(promptVersions.version, version)))
    .limit(1);

  if (versionToRestore.length === 0) {
    throw new Error("Version not found");
  }

  const versionData = versionToRestore[0];

  // Update the prompt with the version content
  await db
    .update(prompts)
    .set({
      content: versionData.content,
      version: version,
      updatedAt: new Date(),
    })
    .where(and(eq(prompts.id, promptId), eq(prompts.userId, userId)));

  return { success: true };
}

// ============ AI Auto Classification & Tagging Functions ============
export async function suggestCategoryAndTags(content: string, title?: string, userId?: number) {
  // 首先获取所有现有的场景分类（系统预设 + 用户自定义）
  const allScenarios = await getAllScenarios(userId);

  // 构建层级结构映射
  const scenarioMap = new Map(allScenarios.map(s => [s.id, s]));

  // 获取完整路径名称
  const getFullPath = (scenario: any): string => {
    const path: string[] = [scenario.name];
    let current = scenario;
    while (current.parentId) {
      const parent = scenarioMap.get(current.parentId);
      if (parent) {
        path.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }
    return path.join(' > ');
  };

  // 构建场景列表供AI参考（包含完整层级路径和描述）
  const scenarioList = allScenarios
    .map(s => {
      const fullPath = getFullPath(s);
      const desc = s.description ? ` - ${s.description}` : '';
      return `ID:${s.id} | ${fullPath}${desc}`;
    })
    .join('\n');

  // 优先展示系统预设的三级分类（最常用）
  const systemScenarios = allScenarios.filter(s => !s.isCustom);
  const level3Scenarios = systemScenarios.filter(s => s.level === 3);
  const teachingScenarios = level3Scenarios.filter(s => {
    if (!s.parentId) return false;
    const root = scenarioMap.get(s.parentId);
    return root && root.parentId === 1; // 学科教学的子分类
  });

  const systemPrompt = `你是一个专业的提示词分类助手。根据用户提供的提示词内容,分析并推荐最合适的应用场景分类和标签。

**重要**：系统共有 ${systemScenarios.length} 个预设分类，其中 ${level3Scenarios.length} 个具体场景分类。

现有的场景分类（格式: ID | 完整路径 - 描述）：
${scenarioList}

请返回JSON格式:
{
  "suggestedCategoryId": 推荐的分类ID(数字),
  "suggestedTags": ["标签1", "标签2", "标签3"],
  "confidence": 0.95,
  "reason": "推荐理由（简短，不超过50字）"
}

分析要点:
1. **强烈优先**推荐三级分类（level 3），因为它们最具体、最实用
2. **教学相关内容优先**从"学科教学"（ID:1）的子分类中选择，包括：
   - 各学科教案设计、备课资源、课件制作
   - 课堂互动、作业设计、试卷命题
   - 分层教学、辅导答疑、成绩分析等
3. 层级结构理解：
   - 一级（4个）：学科教学、班级管理、教研发展、通用技能
   - 二级（32个）：语文、数学、英语、物理等学科
   - 三级（216个）：教案设计、课件制作等具体场景
4. 典型示例：
   - "数学教案" → ID:10201（学科教学 > 数学 > 教案设计）
   - "语文课件" → ID:10103（学科教学 > 语文 > 课件制作）
   - "班级管理" → 选择"班级管理"下的具体三级分类
5. 提取3-5个最相关的标签
6. 给出置信度(0-1)
7. 推荐理由简短说明为什么选择这个分类`;

  const userMessage = title
    ? `标题: ${title}\n\n内容: ${content}`
    : `内容: ${content}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: {
      type: "json_object"
    },
  });

  const content_str = response.choices[0]?.message?.content;
  if (!content_str || typeof content_str !== 'string') {
    return null;
  }

  const suggestion = JSON.parse(content_str);

  // 通过 ID 查找场景分类
  const suggestedId = parseInt(suggestion.suggestedCategoryId);
  let matchedScenario = allScenarios.find(s => s.id === suggestedId);

  // 如果 AI 返回的 ID 无效，尝试回退到名称匹配（兼容旧版本）
  if (!matchedScenario && suggestion.suggestedCategory) {
    matchedScenario = allScenarios.find(
      s => s.name === suggestion.suggestedCategory ||
           s.name.includes(suggestion.suggestedCategory) ||
           suggestion.suggestedCategory.includes(s.name)
    );
  }

  // 如果仍然找不到，返回 null 让前端提示用户手动选择
  if (!matchedScenario) {
    console.warn('[AI分类] 无法找到匹配的场景分类:', suggestion);
    return {
      ...suggestion,
      scenarioId: null,
      scenarioName: null,
      suggestedCategory: suggestion.suggestedCategory || `未知分类(ID:${suggestedId})`,
    };
  }

  // 获取完整路径名称用于展示
  const fullPath = getFullPath(matchedScenario);

  return {
    ...suggestion,
    scenarioId: matchedScenario.id,
    scenarioName: fullPath, // 返回完整路径更清晰
    suggestedCategory: fullPath,
  };
}

// ============ Template Conversion Functions ============
export async function convertToTemplate(content: string, title?: string) {
  const systemPrompt = `你是一个专业的提示词模板转换助手。分析用户提供的提示词内容，将其中的**具体内容**提取为**变量**，使其成为可复用的模板。

任务：
1. 识别提示词中可以参数化的具体内容（如学科名称、年级、主题、日期、数字等）
2. 为每个变量定义合理的变量名（使用英文，采用 camelCase 命名）
3. 生成模板化的提示词（使用 {{variableName}} 格式）
4. 保留提示词的结构和语气

请返回JSON格式：
{
  "templateContent": "模板化后的提示词内容（使用{{变量名}}格式）",
  "variables": {
    "variableName1": {
      "label": "变量显示名称",
      "defaultValue": "默认值（从原内容提取）",
      "type": "text|number|select",
      "description": "变量说明",
      "options": ["选项1", "选项2"]  // 仅当 type 为 select 时
    }
  },
  "hasVariables": true  // 是否包含变量
}

示例：
输入：帮我设计一节关于二次函数的数学课，面向初三学生，时长45分钟

输出：
{
  "templateContent": "帮我设计一节关于{{topic}}的{{subject}}课，面向{{grade}}学生，时长{{duration}}分钟",
  "variables": {
    "topic": {
      "label": "课程主题",
      "defaultValue": "二次函数",
      "type": "text",
      "description": "本节课的教学主题"
    },
    "subject": {
      "label": "学科",
      "defaultValue": "数学",
      "type": "select",
      "description": "教学学科",
      "options": ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治"]
    },
    "grade": {
      "label": "年级",
      "defaultValue": "初三",
      "type": "select",
      "description": "目标学生年级",
      "options": ["小学一年级", "小学二年级", "初一", "初二", "初三", "高一", "高二", "高三"]
    },
    "duration": {
      "label": "时长（分钟）",
      "defaultValue": "45",
      "type": "number",
      "description": "课程时长"
    }
  },
  "hasVariables": true
}

注意：
1. 只提取**可能变化的具体值**，不要过度参数化
2. 如果提示词已经很通用（没有具体内容），返回 hasVariables: false
3. 变量名使用英文，简洁易懂
4. 为常见选项（学科、年级等）提供 select 类型和预设选项
5. 保持提示词的自然语言流畅性`;

  const userMessage = title
    ? `标题: ${title}\n\n内容: ${content}`
    : `内容: ${content}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: {
      type: "json_object"
    },
  });

  const content_str = response.choices[0]?.message?.content;
  if (!content_str || typeof content_str !== 'string') {
    return null;
  }

  return JSON.parse(content_str);
}

// ============ Usage History Functions ============
export async function getPromptUsageHistory(promptId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const stats = await db
    .select()
    .from(promptUsageStats)
    .where(eq(promptUsageStats.promptId, promptId))
    .orderBy(desc(promptUsageStats.usedAt))
    .limit(limit);
  
  return stats;
}

// ==================== Feishu Integration ====================

export async function getFeishuConfig(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(feishuConfig).where(eq(feishuConfig.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertFeishuConfig(userId: number, webhookUrl: string, enabled: boolean, syncOnCreate: boolean, syncOnUpdate: boolean) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await getFeishuConfig(userId);
  
  if (existing) {
    await db.update(feishuConfig)
      .set({ webhookUrl, enabled, syncOnCreate, syncOnUpdate, updatedAt: new Date() })
      .where(eq(feishuConfig.id, existing.id));
    return { ...existing, webhookUrl, enabled, syncOnCreate, syncOnUpdate };
  } else {
    await db.insert(feishuConfig).values({
      userId,
      webhookUrl,
      enabled,
      syncOnCreate,
      syncOnUpdate,
    });
    const newConfig = await getFeishuConfig(userId);
    return newConfig;
  }
}

export async function syncPromptToFeishu(promptId: number, userId: number) {
  const config = await getFeishuConfig(userId);
  if (!config || !config.enabled) return false;
  
  const db = await getDb();
  if (!db) return false;
  
  const promptResult = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  const prompt = promptResult.length > 0 ? promptResult[0] : null;
  if (!prompt) return false;
  
  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'post',
        content: {
          post: {
            zh_cn: {
              title: `提示词: ${prompt.title}`,
              content: [
                [{
                  tag: 'text',
                  text: `内容: ${prompt.content}\n\n`,
                }],
                [{
                  tag: 'text',
                  text: `标签: ${prompt.tags || '无'}\n`,
                }],
                [{
                  tag: 'text',
                  text: `创建时间: ${new Date(prompt.createdAt).toLocaleString('zh-CN')}`,
                }],
              ],
            },
          },
        },
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to sync to Feishu:', error);
    return false;
  }
}

// 分类模板导入相关函数
export async function importCategoriesFromTemplate(
  userId: number,
  templateData: Array<{ name: string; description?: string; parentName?: string; icon?: string; level: number }>,
  options?: { levels?: number[]; dedupeStrategy?: 'skip' | 'overwrite' }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Zod 校验：防止恶意数据、过大数据、无效引用
  const { CategoryImportData } = await import('./schemas/enhanced');
  const validatedData = CategoryImportData.parse(templateData);

  const createdCategories: Array<{ name: string; id: number }> = [];
  const nameToIdMap = new Map<string, number>();

  // 按层级排序,确保父分类先创建
  const sortedData = validatedData
    .filter(item => {
      if (!options?.levels) return true;
      return options.levels.includes(item.level);
    })
    .sort((a, b) => a.level - b.level);

  for (const category of sortedData) {
    let parentId: number | null = null;

    // 如果有父分类名称,查找父分类ID
    if (category.parentName) {
      parentId = nameToIdMap.get(category.parentName) || null;
    }

    // 去重策略：skip/overwrite
    const existing = await db
      .select()
      .from(scenarios)
      .where(and(eq(scenarios.userId, userId), eq(scenarios.name, category.name)))
      .limit(1);

    if (existing.length > 0 && options?.dedupeStrategy === 'skip') {
      const existingId = existing[0].id;
      nameToIdMap.set(category.name, existingId);
      createdCategories.push({ name: category.name, id: existingId });
      continue;
    }

    if (existing.length > 0 && options?.dedupeStrategy === 'overwrite') {
      const existingId = existing[0].id;
      await db
        .update(scenarios)
        .set({
          description: category.description || null,
          parentId,
          level: category.level,
          icon: category.icon || null,
          updatedAt: new Date(),
        })
        .where(and(eq(scenarios.id, existingId), eq(scenarios.userId, userId)));
      nameToIdMap.set(category.name, existingId);
      createdCategories.push({ name: category.name, id: existingId });
      continue;
    }

    const [result] = await db.insert(scenarios).values({
      name: category.name,
      description: category.description || null,
      parentId,
      level: category.level,
      isCustom: true,
      userId,
      icon: category.icon || null,
    });

    const insertId = Number(result.insertId);
    createdCategories.push({ name: category.name, id: insertId });
    nameToIdMap.set(category.name, insertId);
  }

  return createdCategories;
}

export async function parseCategoriesFromCSV(csvContent: string): Promise<
  Array<{ name: string; description?: string; parentName?: string; icon?: string; level: number }>
> {
  const lines = csvContent.split("\n").filter((line) => line.trim());
  if (lines.length === 0) throw new Error("CSV文件为空");

  // 假设CSV格式: name,description,parentName,icon,level
  const categories: Array<{ name: string; description?: string; parentName?: string; icon?: string; level: number }> = [];

  // 跳过标题行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) continue;

    categories.push({
      name: parts[0],
      description: parts[1] || undefined,
      parentName: parts[2] || undefined,
      icon: parts[3] || undefined,
      level: parseInt(parts[4]) || 1,
    });
  }

  return categories;
}

export async function parseCategoriesFromJSON(jsonContent: string): Promise<
  Array<{ name: string; description?: string; parentName?: string; icon?: string; level: number }>
> {
  try {
    const data = JSON.parse(jsonContent);

    if (!Array.isArray(data)) {
      throw new Error("JSON格式错误:应该是数组");
    }

    const categories: Array<{ name: string; description?: string; parentName?: string; icon?: string; level: number }> = [];

    for (const item of data) {
      if (!item.name) continue;

      categories.push({
        name: item.name,
        description: item.description || undefined,
        parentName: item.parentName || undefined,
        icon: item.icon || undefined,
        level: item.level || 1,
      });
    }

    // Zod 校验：确保解析后的数据符合要求
    const { CategoryImportData } = await import('./schemas/enhanced');
    const validatedData = CategoryImportData.parse(categories);

    return validatedData;
  } catch (error: any) {
    throw new Error("JSON解析或校验失败: " + error.message);
  }
}

// ============ Category Template Functions ============

/**
 * 获取所有分类模板（仅元数据，不含完整 templateData）
 * 用于公共列表展示，防止数据泄漏和爬取
 */
export async function getAllCategoryTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select({
      id: categoryTemplates.id,
      name: categoryTemplates.name,
      industry: categoryTemplates.industry,
      description: categoryTemplates.description,
      icon: categoryTemplates.icon,
      categoryCount: categoryTemplates.categoryCount,
      level1Count: categoryTemplates.level1Count,
      level2Count: categoryTemplates.level2Count,
      level3Count: categoryTemplates.level3Count,
      isOfficial: categoryTemplates.isOfficial,
      rating: categoryTemplates.rating,
      downloadCount: categoryTemplates.downloadCount,
      createdAt: categoryTemplates.createdAt,
      templateData: categoryTemplates.templateData,
    })
    .from(categoryTemplates)
    .orderBy(desc(categoryTemplates.downloadCount));
}

/**
 * 按行业获取分类模板（仅元数据）
 */
export async function getCategoryTemplatesByIndustry(industry: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select({
      id: categoryTemplates.id,
      name: categoryTemplates.name,
      industry: categoryTemplates.industry,
      description: categoryTemplates.description,
      icon: categoryTemplates.icon,
      categoryCount: categoryTemplates.categoryCount,
      level1Count: categoryTemplates.level1Count,
      level2Count: categoryTemplates.level2Count,
      level3Count: categoryTemplates.level3Count,
      isOfficial: categoryTemplates.isOfficial,
      rating: categoryTemplates.rating,
      downloadCount: categoryTemplates.downloadCount,
      createdAt: categoryTemplates.createdAt,
      templateData: categoryTemplates.templateData,
    })
    .from(categoryTemplates)
    .where(eq(categoryTemplates.industry, industry));
}

export async function getCategoryTemplateById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(categoryTemplates).where(eq(categoryTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function importCategoryTemplate(
  templateId: number,
  userId: number,
  options?: { levels?: number[]; dedupeStrategy?: 'skip' | 'overwrite' }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 获取模板数据
  const template = await getCategoryTemplateById(templateId);
  if (!template) throw new Error("Template not found");

  // 解析模板数据
  const categories = JSON.parse(template.templateData);

  // 批量创建分类
  const result = await importCategoriesFromTemplate(userId, categories, options);

  // 原子自增下载次数（防止并发问题）
  // 使用 SQL 原子操作而不是 read-modify-write
  await db
    .update(categoryTemplates)
    .set({ downloadCount: sql`${categoryTemplates.downloadCount} + 1` })
    .where(eq(categoryTemplates.id, templateId));

  return result;
}

export async function createCategoryTemplate(data: InsertCategoryTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(categoryTemplates).values(data);
  return Number(result.insertId);
}

// ============ Recommendation Functions ============
export async function getTopUsedPrompts(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, userId))
    .orderBy(desc(prompts.useCount), desc(prompts.lastUsedAt))
    .limit(limit);
}

/**
 * 基于教育元数据推荐提示词（按使用次数、评分、更新时间降序）
 */
export async function getPromptRecommendationsByMeta(
  userId: number,
  filters: { subject?: string; teachingScene?: string; gradeLevel?: string; textbookVersion?: string },
  limit: number = 10
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(prompts.userId, userId)];
  if (filters.subject) conditions.push(eq(prompts.subject, filters.subject));
  if (filters.teachingScene) conditions.push(eq(prompts.teachingScene, filters.teachingScene));
  if (filters.gradeLevel) conditions.push(eq(prompts.gradeLevel, filters.gradeLevel));
  if (filters.textbookVersion) conditions.push(eq(prompts.textbookVersion, filters.textbookVersion));

  return await db
    .select()
    .from(prompts)
    .where(and(...conditions))
    .orderBy(desc(prompts.useCount), desc(prompts.score), desc(prompts.updatedAt))
    .limit(limit);
}

/**
 * 新人必备（默认按使用次数取前10）
 */
export async function getEssentialPrompts(userId: number, limit: number = 10) {
  return getTopUsedPrompts(userId, limit);
}

/**
 * 学科/场景/学段分布统计
 */
export async function getPromptMetaStats(userId: number) {
  const db = await getDb();
  if (!db) return { subjects: [], scenes: [], grades: [] };

  const normalize = (rows: any[], key: string) =>
    rows.map((row: any) => ({
      key: row[key] || '未填写',
      count: Number(row.count || 0),
    }));

  const [subjectRows] = (await db.execute<Array<{ subject: string | null; count: number }>>(
    sql`SELECT subject, COUNT(*) as count FROM ${prompts} WHERE ${prompts.userId} = ${userId} GROUP BY subject`
  )) as unknown as [Array<{ subject: string | null; count: number }>];

  const [sceneRows] = (await db.execute<Array<{ teachingScene: string | null; count: number }>>(
    sql`SELECT teachingScene, COUNT(*) as count FROM ${prompts} WHERE ${prompts.userId} = ${userId} GROUP BY teachingScene`
  )) as unknown as [Array<{ teachingScene: string | null; count: number }>];

  const [gradeRows] = (await db.execute<Array<{ gradeLevel: string | null; count: number }>>(
    sql`SELECT gradeLevel, COUNT(*) as count FROM ${prompts} WHERE ${prompts.userId} = ${userId} GROUP BY gradeLevel`
  )) as unknown as [Array<{ gradeLevel: string | null; count: number }>];

  return {
    subjects: normalize(subjectRows, 'subject'),
    scenes: normalize(sceneRows, 'teachingScene'),
    grades: normalize(gradeRows, 'gradeLevel'),
  };
}

export async function getRecentlyUsedPrompts(userId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(prompts)
    .where(and(
      eq(prompts.userId, userId),
      sql`${prompts.lastUsedAt} IS NOT NULL`
    ))
    .orderBy(desc(prompts.lastUsedAt))
    .limit(limit);
}


// ============ Optimization History Functions ============

export async function createOptimizationHistory(data: {
  userId: number;
  title?: string;
  systemPrompt?: string;
  conversationData: string;
  settings?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(optimizationHistory).values(data);
  return result[0].insertId;
}

export async function updateOptimizationHistory(
  id: number,
  userId: number,
  data: {
    title?: string;
    systemPrompt?: string;
    conversationData?: string;
    settings?: string;
    lastMessageAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(optimizationHistory)
    .set(data)
    .where(and(eq(optimizationHistory.id, id), eq(optimizationHistory.userId, userId)));
}

export async function getUserOptimizationHistory(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(optimizationHistory)
    .where(eq(optimizationHistory.userId, userId))
    .orderBy(desc(optimizationHistory.lastMessageAt))
    .limit(limit);
}

export async function getOptimizationHistoryById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(optimizationHistory)
    .where(and(eq(optimizationHistory.id, id), eq(optimizationHistory.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteOptimizationHistory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(optimizationHistory)
    .where(and(eq(optimizationHistory.id, id), eq(optimizationHistory.userId, userId)));
}

// Record agent visit
export async function recordAgentVisit(agentId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(agents)
    .set({
      visitCount: sql`${agents.visitCount} + 1`,
      lastVisitedAt: new Date(),
    })
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));
}

// Record workflow visit
export async function recordWorkflowVisit(workflowId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(workflows)
    .set({
      visitCount: sql`${workflows.visitCount} + 1`,
      lastVisitedAt: new Date(),
    })
    .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)));
}

// ============ Subscription Functions ============

/**
 * 获取所有用户列表(管理员)
 */
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

/**
 * 更新用户订阅信息
 */
export async function updateUserSubscription(
  userId: number,
  data: {
    subscriptionTier: 'free' | 'basic' | 'pro';
    subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing';
    subscriptionEndDate?: Date;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 处理日期格式，确保与数据库兼容
  const updateData: any = {
    subscriptionTier: data.subscriptionTier,
  };
  
  if (data.subscriptionStatus !== undefined) {
    updateData.subscriptionStatus = data.subscriptionStatus;
  }
  
  if (data.subscriptionEndDate !== undefined) {
    // 将Date对象转换为MySQL兼容的字符串格式
    updateData.subscriptionEndDate = data.subscriptionEndDate;
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));
}

/**
 * 获取用户订阅信息
 */
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      subscriptionEndDate: users.subscriptionEndDate,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 检查用户是否达到提示词数量限制
 */
export async function checkPromptLimit(userId: number, maxPrompts: number): Promise<{ allowed: boolean; current: number }> {
  const db = await getDb();
  if (!db) return { allowed: true, current: 0 };

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(prompts)
    .where(eq(prompts.userId, userId));

  const current = result[0]?.count || 0;
  const allowed = maxPrompts === -1 || current < maxPrompts;

  return { allowed, current };
}

/**
 * 检查用户本月AI优化次数
 */
export async function checkOptimizationLimit(userId: number, maxOptimizations: number): Promise<{ allowed: boolean; current: number }> {
  const db = await getDb();
  if (!db) return { allowed: true, current: 0 };

  // 获取本月第一天
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(optimizationHistory)
    .where(
      and(
        eq(optimizationHistory.userId, userId),
        sql`${optimizationHistory.createdAt} >= ${firstDayOfMonth}`
      )
    );

  const current = result[0]?.count || 0;
  const allowed = maxOptimizations === -1 || current < maxOptimizations;

  return { allowed, current };
}

// ============ Subscription Statistics ============
export async function getSubscriptionStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalUsers: 0,
      freeUsers: 0,
      basicUsers: 0,
      proUsers: 0,
      paidUsers: 0,
      conversionRate: 0,
      mrr: 0,
    };
  }

  try {
    // 获取所有用户的订阅信息
    const allUsers = await db.select({
      subscriptionTier: users.subscriptionTier,
    }).from(users);

    const totalUsers = allUsers.length;
    const freeUsers = allUsers.filter(u => u.subscriptionTier === 'free' || !u.subscriptionTier).length;
    const basicUsers = allUsers.filter(u => u.subscriptionTier === 'basic').length;
    const proUsers = allUsers.filter(u => u.subscriptionTier === 'pro').length;
    const paidUsers = basicUsers + proUsers;

    // 计算转化率
    const conversionRate = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(2) : '0.00';

    // 计算MRR (Monthly Recurring Revenue)
    const mrr = (basicUsers * 9.9) + (proUsers * 19.9);

    return {
      totalUsers,
      freeUsers,
      basicUsers,
      proUsers,
      paidUsers,
      conversionRate: parseFloat(conversionRate),
      mrr,
    };
  } catch (error) {
    console.error('[Database] Failed to get subscription stats:', error);
    return {
      totalUsers: 0,
      freeUsers: 0,
      basicUsers: 0,
      proUsers: 0,
      paidUsers: 0,
      conversionRate: 0,
      mrr: 0,
    };
  }
}

// ============ Notification Functions ============
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values(data);
  return Number(result[0].insertId);
}

export async function getUserNotifications(userId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));

  if (limit) {
    return await query.limit(limit);
  }

  return await query;
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, 0)
    ));

  return result[0]?.count || 0;
}

export async function markNotificationAsRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications)
    .set({ isRead: 1 })
    .where(and(
      eq(notifications.id, id),
      eq(notifications.userId, userId)
    ));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications)
    .set({ isRead: 1 })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, 0)
    ));
}

export async function deleteNotification(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(notifications)
    .where(and(
      eq(notifications.id, id),
      eq(notifications.userId, userId)
    ));
}

export async function deleteAllReadNotifications(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, 1)
    ));
}


// ============ Subscription History Functions ============

export async function createSubscriptionHistory(history: InsertSubscriptionHistory) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(subscriptionHistory).values(history);
  return result;
}

export async function getUserSubscriptionHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(subscriptionHistory)
    .where(eq(subscriptionHistory.userId, userId))
    .orderBy(desc(subscriptionHistory.createdAt));
  
  return result;
}

export async function getAllSubscriptionHistory() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: subscriptionHistory.id,
      userId: subscriptionHistory.userId,
      userName: users.name,
      userEmail: users.email,
      action: subscriptionHistory.action,
      fromTier: subscriptionHistory.fromTier,
      toTier: subscriptionHistory.toTier,
      durationDays: subscriptionHistory.durationDays,
      amount: subscriptionHistory.amount,
      paymentMethod: subscriptionHistory.paymentMethod,
      operatorId: subscriptionHistory.operatorId,
      note: subscriptionHistory.note,
      createdAt: subscriptionHistory.createdAt,
    })
    .from(subscriptionHistory)
    .leftJoin(users, eq(subscriptionHistory.userId, users.id))
    .orderBy(desc(subscriptionHistory.createdAt));
  
  return result;
}


// ============ Coupon Functions ============

export async function createCoupon(coupon: InsertCoupon) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database.insert(coupons).values(coupon);
  return result[0].insertId;
}

export async function getAllCoupons() {
  const database = await getDb();
  if (!database) return [];
  
  return await database.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function getCouponByCode(code: string) {
  const database = await getDb();
  if (!database) return null;
  
  const result = await database.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function validateCoupon(code: string, tier?: 'basic' | 'pro', userId?: number) {
  const coupon = await getCouponByCode(code);
  if (!coupon) return { valid: false, error: '优惠券不存在' };
  if (!coupon.isActive) return { valid: false, error: '优惠券已失效' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, error: '优惠券已过期' };
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: '优惠券已达使用上限' };
  }
  if (coupon.tier && tier && coupon.tier !== tier) {
    return { valid: false, error: `该优惠券仅适用于${coupon.tier === 'basic' ? '基础版' : '专业版'}` };
  }
  // 定向券验证：如果指定了targetUserId，必须是该用户才能使用
  if (coupon.targetUserId && userId && coupon.targetUserId !== userId) {
    return { valid: false, error: '该优惠券不适用于当前用户' };
  }

  return { valid: true, coupon };
}

export async function useCoupon(couponId: number, userId: number, orderId?: string, discountAmount?: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // 增加使用次数
  await database.update(coupons)
    .set({ usedCount: sql`${coupons.usedCount} + 1` })
    .where(eq(coupons.id, couponId));
  
  // 记录使用历史
  await database.insert(couponUsage).values({
    couponId,
    userId,
    orderId,
    discountAmount: discountAmount || 0,
  });
}

export async function updateCoupon(id: number, updates: Partial<InsertCoupon>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(coupons).set(updates).where(eq(coupons.id, id));
}

export async function deleteCoupon(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.delete(coupons).where(eq(coupons.id, id));
}

export async function getCouponUsageHistory(couponId: number) {
  const database = await getDb();
  if (!database) return [];

  return await database.select().from(couponUsage).where(eq(couponUsage.couponId, couponId));
}

// 获取公开优惠券列表（用于优惠券中心）
export async function getPublicCoupons() {
  const database = await getDb();
  if (!database) return [];

  const now = new Date();

  return await database
    .select()
    .from(coupons)
    .where(
      and(
        eq(coupons.isPublic, true),
        eq(coupons.isActive, true),
        isNull(coupons.targetUserId), // 公开券不能是定向券
        or(
          isNull(coupons.expiresAt),
          gt(coupons.expiresAt, now)
        )
      )
    )
    .orderBy(desc(coupons.createdAt));
}

// 获取用户的定向优惠券
export async function getUserTargetedCoupons(userId: number) {
  const database = await getDb();
  if (!database) return [];

  const now = new Date();

  return await database
    .select()
    .from(coupons)
    .where(
      and(
        eq(coupons.targetUserId, userId),
        eq(coupons.isActive, true),
        or(
          isNull(coupons.expiresAt),
          gt(coupons.expiresAt, now)
        )
      )
    )
    .orderBy(desc(coupons.createdAt));
}

// 检查用户是否已使用过某张优惠券
export async function hasUserUsedCoupon(userId: number, couponId: number) {
  const database = await getDb();
  if (!database) return false;

  const result = await database
    .select()
    .from(couponUsage)
    .where(
      and(
        eq(couponUsage.userId, userId),
        eq(couponUsage.couponId, couponId)
      )
    )
    .limit(1);

  return result.length > 0;
}

// ============ Audit Log Functions ============

export type AuditAction = 'create' | 'update' | 'delete' | 'execute' | 'login' | 'logout' | 'export' | 'import' | 'share' | 'optimize';
export type AuditResourceType = 'prompt' | 'workflow' | 'agent' | 'category' | 'scenario' | 'apiKey' | 'subscription' | 'coupon' | 'user' | 'share' | 'image' | 'invitationCode' | 'setting';

export async function createAuditLog(data: {
  userId: number;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const database = await getDb();
  if (!database) return;

  try {
    await database.insert(auditLogs).values({
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      details: data.details ? JSON.stringify(data.details) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  } catch (error) {
    console.error("[Audit] Failed to create audit log:", error);
  }
}

export async function getAuditLogs(options?: {
  userId?: number;
  resourceType?: AuditResourceType;
  resourceId?: number;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}) {
  const database = await getDb();
  if (!database) return [];

  const conditions = [];

  if (options?.userId) {
    conditions.push(eq(auditLogs.userId, options.userId));
  }
  if (options?.resourceType) {
    conditions.push(eq(auditLogs.resourceType, options.resourceType));
  }
  if (options?.resourceId) {
    conditions.push(eq(auditLogs.resourceId, options.resourceId));
  }
  if (options?.action) {
    conditions.push(eq(auditLogs.action, options.action));
  }

  let query = database
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }

  if (options?.offset) {
    query = query.offset(options.offset) as any;
  }

  return await query;
}

export async function getAuditLogsByUser(userId: number, limit = 50) {
  return await getAuditLogs({ userId, limit });
}

export async function getAllAuditLogs(
  limit = 100,
  offset = 0,
  resourceType?: string,
  action?: string
) {
  const database = await getDb();
  if (!database) return [];

  // Build where conditions
  const conditions = [];
  if (resourceType && resourceType !== 'all') {
    conditions.push(eq(auditLogs.resourceType, resourceType));
  }
  if (action && action !== 'all') {
    conditions.push(eq(auditLogs.action, action));
  }

  let query = database
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id));

  // Apply filters if any
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return result;
}


// ============ Invitation Code Functions ============

/**
 * Validate invitation code
 * Security: Unified error messages to prevent enumeration attacks
 */
export async function validateInvitationCode(code: string) {
  const database = await getDb();
  if (!database) return { valid: false, error: '系统错误，请稍后重试' };

  try {
    const result = await database
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code))
      .limit(1);

    if (result.length === 0) {
      return { valid: false, error: '邀请码无效' };
    }

    const invCode = result[0];

    // Check if active
    if (!invCode.isActive) {
      return { valid: false, error: '邀请码无效' }; // Generic error to prevent enumeration
    }

    // Check expiration
    if (invCode.expiresAt && new Date(invCode.expiresAt) < new Date()) {
      return { valid: false, error: '邀请码无效' };
    }

    // Check usage limit - fixed: properly handle maxUses === 0 vs null
    if (invCode.maxUses !== null && invCode.usedCount >= invCode.maxUses) {
      return { valid: false, error: '邀请码无效' };
    }

    return {
      valid: true,
      invitationCode: invCode,
    };
  } catch (error) {
    console.error('[Invitation Code] Validation error:', error);
    return { valid: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * Use invitation code during registration
 * Security: Uses database transaction and conditional update to prevent race conditions
 */
export async function useInvitationCode(
  code: string,
  userId: number,
  ipAddress?: string,
  userAgent?: string
) {
  const database = await getDb();
  if (!database) throw new Error("数据库不可用");

  try {
    // Start transaction
    return await database.transaction(async (tx) => {
      // Re-validate within transaction to ensure consistency
      const [invCode] = await tx
        .select()
        .from(invitationCodes)
        .where(eq(invitationCodes.code, code))
        .limit(1);

      if (!invCode) {
        throw new Error('邀请码不存在');
      }

      if (!invCode.isActive) {
        throw new Error('邀请码已被禁用');
      }

      if (invCode.expiresAt && new Date(invCode.expiresAt) < new Date()) {
        throw new Error('邀请码已过期');
      }

      // Critical: Conditional update to prevent race condition
      // Using raw SQL to get affected rows count
      const updateResult = await tx.execute(sql`
        UPDATE ${invitationCodes}
        SET ${invitationCodes.usedCount} = ${invitationCodes.usedCount} + 1,
            ${invitationCodes.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${invitationCodes.id} = ${invCode.id}
          AND (${invCode.maxUses} IS NULL OR ${invitationCodes.usedCount} < ${invCode.maxUses})
      `);

      // Check if update succeeded (affected rows must be exactly 1)
      // @ts-ignore - resultSetHeader has affectedRows
      if (!updateResult || updateResult[0]?.affectedRows !== 1) {
        throw new Error('邀请码已达使用上限或已被其他用户使用');
      }

      // Record usage
      await tx.insert(invitationCodeUsage).values({
        codeId: invCode.id,
        userId,
        ipAddress,
        userAgent,
      });

      // Update user's invitation code reference
      await tx
        .update(users)
        .set({ invitationCodeId: invCode.id })
        .where(eq(users.id, userId));

      return invCode;
    });
  } catch (error: any) {
    console.error('[Invitation Code] Usage error:', error);
    throw new Error(error.message || '使用邀请码失败');
  }
}

/**
 * Generate invitation code
 * Security: Uses nanoid for cryptographically secure random codes
 */
export async function generateInvitationCode(data: {
  code?: string; // Custom code, auto-generate if not provided
  description?: string;
  createdBy: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
  grantTier?: 'free' | 'basic' | 'pro';
  grantDays?: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("数据库不可用");

  // Generate code if not provided - using nanoid for security
  const code = data.code || nanoid(12).toUpperCase();

  try {
    // Check if code already exists
    const existing = await database
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('邀请码已存在');
    }

    const [result] = await database.insert(invitationCodes).values({
      code,
      description: data.description,
      createdBy: data.createdBy,
      maxUses: data.maxUses ?? null,
      expiresAt: data.expiresAt ?? null,
      grantTier: data.grantTier || 'free',
      grantDays: data.grantDays || 0,
    });

    return result.insertId;
  } catch (error: any) {
    console.error('[Invitation Code] Generation error:', error);
    throw new Error(error.message || '生成邀请码失败');
  }
}

/**
 * Get all invitation codes (admin only)
 */
export async function getAllInvitationCodes() {
  const database = await getDb();
  if (!database) return [];

  try {
    return await database
      .select()
      .from(invitationCodes)
      .orderBy(desc(invitationCodes.createdAt));
  } catch (error) {
    console.error('[Invitation Code] Get all error:', error);
    return [];
  }
}

/**
 * Get invitation code usage history
 */
export async function getInvitationCodeUsage(codeId: number) {
  const database = await getDb();
  if (!database) return [];

  try {
    return await database
      .select({
        id: invitationCodeUsage.id,
        userId: invitationCodeUsage.userId,
        userName: users.name,
        userEmail: users.email,
        usedAt: invitationCodeUsage.usedAt,
        ipAddress: invitationCodeUsage.ipAddress,
        userAgent: invitationCodeUsage.userAgent,
      })
      .from(invitationCodeUsage)
      .leftJoin(users, eq(invitationCodeUsage.userId, users.id))
      .where(eq(invitationCodeUsage.codeId, codeId))
      .orderBy(desc(invitationCodeUsage.usedAt));
  } catch (error) {
    console.error('[Invitation Code] Get usage error:', error);
    return [];
  }
}

/**
 * Toggle invitation code active status
 */
export async function toggleInvitationCode(codeId: number, isActive: boolean) {
  const database = await getDb();
  if (!database) throw new Error("数据库不可用");

  try {
    await database
      .update(invitationCodes)
      .set({ isActive })
      .where(eq(invitationCodes.id, codeId));
  } catch (error) {
    console.error('[Invitation Code] Toggle error:', error);
    throw new Error('更新邀请码状态失败');
  }
}

/**
 * Delete invitation code (admin only)
 */
export async function deleteInvitationCode(codeId: number) {
  const database = await getDb();
  if (!database) throw new Error("数据库不可用");

  try {
    await database
      .delete(invitationCodes)
      .where(eq(invitationCodes.id, codeId));
  } catch (error) {
    console.error('[Invitation Code] Delete error:', error);
    throw new Error('删除邀请码失败');
  }
}

// ============ Site Settings Functions (Admin Only) ============

/**
 * Get all site settings (admin only)
 */
export async function getAllSiteSettings() {
  const database = await getDb();
  if (!database) throw new Error("数据库不可用");

  return await database
    .select()
    .from(siteSettings)
    .orderBy(siteSettings.key);
}

/**
 * Get public site settings (accessible by all users)
 */
export async function getPublicSiteSettings() {
  const database = await getDb();
  if (!database) throw new Error("数据库不可用");

  return await database
    .select({
      key: siteSettings.key,
      value: siteSettings.value,
      description: siteSettings.description,
      type: siteSettings.type,
    })
    .from(siteSettings)
    .where(eq(siteSettings.isPublic, true))
    .orderBy(siteSettings.key);
}

/**
 * Get a single site setting by key
 */
export async function getSiteSetting(key: string) {
  const database = await getDb();
  if (!database) throw new Error("数据库不可用");

  const results = await database
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);

  return results.length > 0 ? results[0] : null;
}

// Reserved setting keys that cannot be created or modified
const RESERVED_SETTING_KEYS = [
  'database_url',
  'secret_key',
  'api_key',
  'admin_password',
  'stripe_secret',
  'encryption_key',
];

/**
 * Set or update a site setting (admin only)
 */
export async function setSiteSetting(data: {
  key: string;
  value: string;
  description?: string;
  type?: 'string' | 'number' | 'boolean' | 'json';
  isPublic?: boolean;
  updatedBy: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("数据库不可用");

  // Check for reserved keys
  if (RESERVED_SETTING_KEYS.includes(data.key.toLowerCase())) {
    throw new Error(`设置键 "${data.key}" 是保留字段，不能创建或修改`);
  }

  const settingType = data.type || 'string';

  // Validate JSON type
  if (settingType === 'json') {
    try {
      JSON.parse(data.value);
    } catch (error) {
      throw new Error('JSON 格式无效：' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  // Validate number type
  if (settingType === 'number' && isNaN(Number(data.value))) {
    throw new Error('数字格式无效');
  }

  // Validate boolean type
  if (settingType === 'boolean' && !['true', 'false', '0', '1'].includes(data.value.toLowerCase())) {
    throw new Error('布尔值格式无效，应为 true/false 或 0/1');
  }

  // Check if setting exists
  const existing = await getSiteSetting(data.key);

  try {
    if (existing) {
      // Update existing
      await database
        .update(siteSettings)
        .set({
          value: data.value,
          description: data.description !== undefined ? data.description : existing.description,
          type: settingType,
          isPublic: data.isPublic !== undefined ? data.isPublic : existing.isPublic,
          updatedBy: data.updatedBy,
        })
        .where(eq(siteSettings.key, data.key));
    } else {
      // Create new
      await database.insert(siteSettings).values({
        key: data.key,
        value: data.value,
        description: data.description || null,
        type: settingType,
        isPublic: data.isPublic || false,
        updatedBy: data.updatedBy,
      });
    }
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
      throw new Error(`设置键 "${data.key}" 已存在`);
    }
    throw error;
  }
}

/**
 * Delete a site setting (admin only)
 */
export async function deleteSiteSetting(key: string) {
  const database = await getDb();
  if (!database) throw new Error("数据库不可用");

  await database
    .delete(siteSettings)
    .where(eq(siteSettings.key, key));
}

// ============ Export database instance and operators for direct use ============
export { eq, and, desc, sql };
export const db = getDb();
export { imageGenerations, apiKeys, invitationCodes, invitationCodeUsage, siteSettings };
