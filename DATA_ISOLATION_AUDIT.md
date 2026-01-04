# TeachPT 数据隔离审查报告

**审查日期**: 2025-12-31
**审查目的**: 确认系统是否已做好 SaaS 多租户数据隔离准备

---

## 📊 总体评估

**结论**: ✅ **基本准备就绪，有 1 个需要修复的小问题**

- **数据库层面**: ✅ 所有用户数据表都有 `userId` 字段
- **API 层面**: ✅ 所有查询都使用 `protectedProcedure` 并传入 `ctx.user.id`
- **需修复**: ⚠️ scenarios 表的查询逻辑需要优化

---

## ✅ 已完成数据隔离的模块

### 1. **核心业务数据**（完全隔离）

| 数据表 | userId 字段 | 查询方法 | 状态 |
|--------|-------------|----------|------|
| prompts | ✅ notNull | `getUserPrompts(userId)` | ✅ 完全隔离 |
| workflows | ✅ notNull | `getUserWorkflows(userId)` | ✅ 完全隔离 |
| agents | ✅ notNull | `getUserAgents(userId)` | ✅ 完全隔离 |
| categories | ✅ notNull | 按 userId 过滤 | ✅ 完全隔离 |
| apiKeys | ✅ notNull | `getUserApiKeys(userId)` | ✅ 完全隔离 |
| imageGenerations | ✅ notNull | 按 userId 过滤 | ✅ 完全隔离 |

**示例代码**（prompts）:
```typescript
// server/routers.ts
prompts: router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUserPrompts(ctx.user.id); // ✅ 正确隔离
  }),
})

// server/db.ts
export async function getUserPrompts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, userId)) // ✅ 强制过滤
    .orderBy(desc(prompts.updatedAt));
}
```

---

### 2. **历史记录数据**（完全隔离）

| 数据表 | userId 字段 | 状态 |
|--------|-------------|------|
| workflowExecutions | ✅ notNull | ✅ 完全隔离 |
| agentConversations | ✅ notNull | ✅ 完全隔离 |
| optimizationHistory | ✅ notNull | ✅ 完全隔离 |
| auditLogs | ✅ notNull | ✅ 完全隔离 |

---

### 3. **用户行为数据**（完全隔离）

| 数据表 | userId 字段 | 状态 |
|--------|-------------|------|
| promptFavorites | ✅ notNull | ✅ 完全隔离 |
| promptComments | ✅ notNull | ✅ 完全隔离 |
| promptUsageStats | ✅ notNull | ✅ 完全隔离 |
| workflowUsageStats | ✅ notNull | ✅ 完全隔离 |
| agentUsageStats | ✅ notNull | ✅ 完全隔离 |
| notifications | ✅ notNull | ✅ 完全隔离 |

---

### 4. **订阅和支付数据**（完全隔离）

| 数据表 | userId 字段 | 状态 |
|--------|-------------|------|
| subscriptionHistory | ✅ notNull | ✅ 完全隔离 |
| couponUsage | ✅ notNull | ✅ 完全隔离 |

---

## ⚠️ 需要修复的问题

### **问题 1: scenarios 表查询逻辑**

**当前状态**:
- ✅ 数据库有 `userId` 和 `isCustom` 字段
- ⚠️ `getAllScenarios()` 返回所有场景，包括其他用户的自定义场景

**问题描述**:
```typescript
// server/db.ts - 当前实现
export async function getAllScenarios() {
  const db = await getDb();
  if (!db) return [];
  // ⚠️ 没有过滤 userId，会返回所有用户的自定义场景
  return await db.select()
    .from(scenarios)
    .orderBy(scenarios.level, scenarios.sortOrder, scenarios.id);
}
```

**影响范围**:
- 用户A创建的自定义场景会被用户B看到
- 虽然用户B不能修改，但存在数据泄露

**修复方案**:

```typescript
// server/db.ts - 推荐实现
export async function getAllScenarios(userId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (userId) {
    // 已登录用户：返回系统预设 + 自己的自定义场景
    return await db.select()
      .from(scenarios)
      .where(
        or(
          eq(scenarios.isCustom, false),  // 系统预设
          eq(scenarios.userId, userId)    // 用户自定义
        )
      )
      .orderBy(scenarios.level, scenarios.sortOrder, scenarios.id);
  } else {
    // 未登录用户：只返回系统预设
    return await db.select()
      .from(scenarios)
      .where(eq(scenarios.isCustom, false))
      .orderBy(scenarios.level, scenarios.sortOrder, scenarios.id);
  }
}
```

```typescript
// server/routers.ts - 修改调用
scenarios: router({
  list: publicProcedure.query(async ({ ctx }) => {
    // ctx.user 在 publicProcedure 中可能为 undefined
    return await db.getAllScenarios(ctx.user?.id);
  }),
})
```

**优先级**: 🔴 **高** - 建议在上线前修复

---

## ✅ 公开数据（正确设计）

以下数据设计为公开访问，**不需要隔离**：

### **提示词市场（Marketplace）**

```typescript
// server/routers.ts
marketplace: router({
  listPublicPrompts: publicProcedure.query(async () => {
    return await db.getPublicPrompts(); // ✅ 正确：只返回 isPublic=true 的提示词
  }),
})

// server/db.ts
export async function getPublicPrompts() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(prompts)
    .where(eq(prompts.isPublic, true)); // ✅ 只返回公开分享的提示词
}
```

**设计合理性**: ✅
- Marketplace 的目的就是让用户分享和发现提示词
- 用户主动勾选 `isPublic` 才会公开
- 其他用户只能查看，不能修改

---

## 🔐 安全措施总结

### 1. **API 权限控制**

```typescript
// ✅ 所有用户数据都使用 protectedProcedure
prompts: router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user.id 由 JWT 验证保证安全
    return await db.getUserPrompts(ctx.user.id);
  }),
})
```

### 2. **数据库查询强制过滤**

```typescript
// ✅ 所有查询函数都接收 userId 参数
export async function getUserPrompts(userId: number) {
  return await db.select()
    .from(prompts)
    .where(eq(prompts.userId, userId)); // 强制过滤
}

export async function getPromptById(id: number, userId: number) {
  const prompt = await db.select()
    .from(prompts)
    .where(eq(prompts.id, id))
    .limit(1);

  // ✅ 验证所有权
  if (prompt[0]?.userId !== userId) {
    throw new Error("Unauthorized");
  }
  return prompt[0];
}
```

### 3. **更新和删除操作验证**

```typescript
// ✅ 更新前验证所有权
prompts: router({
  update: protectedProcedure
    .input(z.object({ id: z.number(), ... }))
    .mutation(async ({ ctx, input }) => {
      const prompt = await db.getPromptById(input.id, ctx.user.id);
      if (!prompt) throw new Error("Prompt not found or unauthorized");

      return await db.updatePrompt(input.id, ctx.user.id, input);
    }),
})

export async function updatePrompt(id: number, userId: number, data: any) {
  // ✅ 同时过滤 id 和 userId
  return await db.update(prompts)
    .set(data)
    .where(and(
      eq(prompts.id, id),
      eq(prompts.userId, userId)  // 防止跨用户修改
    ));
}
```

---

## 📋 上线前检查清单

### 必须修复（上线前）
- [ ] **修复 scenarios 查询逻辑**（参考上文修复方案）
- [ ] 测试多用户场景，确认数据完全隔离
- [ ] 审查所有 `publicProcedure` 是否合理

### 建议优化（可上线后）
- [ ] 添加数据库索引优化查询性能
  ```sql
  CREATE INDEX idx_prompts_userId ON prompts(userId);
  CREATE INDEX idx_workflows_userId ON workflows(userId);
  CREATE INDEX idx_agents_userId ON agents(userId);
  CREATE INDEX idx_scenarios_userId_isCustom ON scenarios(userId, isCustom);
  ```
- [ ] 添加 API 速率限制（已有 rateLimit 中间件）
- [ ] 添加数据导出功能（GDPR 合规）
- [ ] 添加数据删除功能（用户注销时清理数据）

### 监控和告警
- [ ] 设置错误日志监控（Sentry）
- [ ] 设置性能监控（响应时间、数据库查询）
- [ ] 设置异常登录告警

---

## 🧪 测试建议

### 1. **多用户隔离测试**

```bash
# 测试场景：用户A和用户B不能互相访问数据
1. 创建两个测试账号（user_a@test.com, user_b@test.com）
2. 用户A创建提示词、工作流、API密钥
3. 用户B登录后尝试：
   - 列出提示词（应该只看到自己的）
   - 访问用户A的提示词ID（应该返回 Unauthorized）
   - 修改用户A的提示词（应该失败）
```

### 2. **公开数据测试**

```bash
# 测试场景：Marketplace 只显示公开的提示词
1. 用户A创建提示词A1（private）和A2（public）
2. 用户B在 Marketplace 应该：
   - 能看到 A2
   - 看不到 A1
   - 不能修改 A2
```

### 3. **场景分类测试**

```bash
# 测试场景：用户只能看到系统场景 + 自己的自定义场景
1. 用户A创建自定义场景 "小学语文-古诗词"
2. 用户B登录后应该：
   - 能看到所有系统预设场景（学科教学、班级管理等）
   - 看不到用户A的自定义场景
3. 用户B创建自定义场景 "初中数学-函数"
4. 用户A应该看不到用户B的自定义场景
```

---

## 📈 性能优化建议

### 1. **数据库索引**

```sql
-- 核心查询索引
ALTER TABLE prompts ADD INDEX idx_userId_updatedAt (userId, updatedAt DESC);
ALTER TABLE workflows ADD INDEX idx_userId_updatedAt (userId, updatedAt DESC);
ALTER TABLE agents ADD INDEX idx_userId_updatedAt (userId, updatedAt DESC);

-- Marketplace 索引
ALTER TABLE prompts ADD INDEX idx_isPublic_updatedAt (isPublic, updatedAt DESC);

-- Scenarios 索引
ALTER TABLE scenarios ADD INDEX idx_isCustom_userId (isCustom, userId);
```

### 2. **查询优化**

```typescript
// ✅ 使用分页，避免一次查询所有数据
export async function getUserPrompts(userId: number, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  return await db.select()
    .from(prompts)
    .where(eq(prompts.userId, userId))
    .orderBy(desc(prompts.updatedAt))
    .limit(limit)
    .offset(offset);
}
```

---

## 🎯 总结

### ✅ 优点
1. **数据库设计完善**: 所有用户数据表都有 `userId` 字段
2. **API 权限控制严格**: 使用 `protectedProcedure` + `ctx.user.id`
3. **查询逻辑规范**: 所有查询都强制过滤 `userId`
4. **公开数据设计合理**: Marketplace 只返回 `isPublic=true` 的数据

### ⚠️ 需要改进
1. **scenarios 查询逻辑**: 需要过滤用户自定义场景（优先级高）

### 🚀 部署建议
1. **先修复 scenarios 问题**（预计 30 分钟）
2. **多用户测试**（预计 1 小时）
3. **添加数据库索引**（预计 15 分钟）
4. **可以上线**

---

## 📞 后续维护建议

### 定期审查（每月）
- 检查新增 API 是否添加 `userId` 过滤
- 审查 `publicProcedure` 的使用是否合理
- 监控慢查询，优化索引

### 安全事件响应
- 发现数据泄露：立即下线相关 API
- 修复后回归测试
- 更新此文档

---

**报告结论**: 系统基本准备就绪，修复 scenarios 查询逻辑后即可上线 SaaS 服务。
