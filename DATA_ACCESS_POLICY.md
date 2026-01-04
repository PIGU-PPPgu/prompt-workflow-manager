# TeachPT 数据访问权限配置

**最后更新**: 2025-12-31

## 📊 总览

本文档定义了系统中所有功能模块的数据访问权限策略，确保合理的公开/私有划分。

---

## 🌐 公开访问模块（无需登录）

这些模块面向所有用户开放，包括未登录的访客。

### 1. **提示词市场 (marketplace)** ✅ 公开

**目的**: 让教师发现和浏览优质的公开提示词

**访问权限**:
- ✅ **listPublicPrompts**: 所有用户可查看 `isPublic=true` 的提示词
- ✅ **getPublicPromptDetail**: 查看公开提示词详情
- ✅ **listComments**: 查看评论
- ❌ **收藏、评论**: 需要登录

**数据隔离**:
```typescript
// ✅ 只返回用户主动公开的提示词
return prompts.where(isPublic = true)
```

**建议优化**:
- 可以添加"热门"、"推荐"等排序
- 支持按场景分类筛选

---

### 2. **场景分类 (scenarios)** ✅ 公开（已修复）

**目的**: 让所有用户都能看到系统预设的教学场景分类

**访问权限**:
- ✅ **list**: 所有用户可查看系统预设场景；已登录用户额外看到自己的自定义场景
- ❌ **创建/编辑/删除**: 需要登录

**数据隔离** (已修复):
```typescript
// ✅ 未登录：只返回系统预设
scenarios.where(isCustom = false)

// ✅ 已登录：系统预设 + 用户自己的自定义场景
scenarios.where(isCustom = false OR userId = currentUserId)
```

**设计合理性**: ✅
- 系统预设场景（学科教学、班级管理等）应该公开，方便用户了解平台能力
- 用户自定义场景只对创建者可见，保护隐私

---

### 3. **分类模板市场 (templateMarketplace)** ⚠️ 需审查

**当前状态**:
```typescript
list: publicProcedure.query(async () => {
  return await db.getAllCategoryTemplates(); // 返回所有模板
})
```

**问题**: 是否应该区分公开模板和私有模板？

**建议**:
- 如果模板设计为公开分享，当前实现 ✅ 合理
- 如果用户可以创建私有模板，需要添加 `isPublic` 字段

**待确认**: 询问用户分类模板是否需要隔离

---

## 🔒 私有访问模块（需要登录）

这些模块只对登录用户开放，且数据严格隔离。

### 4. **提示词库 (prompts)** ✅ 完全隔离

**数据隔离**:
```typescript
// ✅ 所有操作都强制过滤 userId
list: protectedProcedure → getUserPrompts(userId)
get: protectedProcedure → getPromptById(id, userId)
create/update/delete: protectedProcedure → 验证所有权
```

**权限检查**: ✅ 完善
- 创建: 检查订阅限制（免费版最多20个）
- 更新/删除: 验证 `prompt.userId === ctx.user.id`
- 查询: 只返回自己的提示词

---

### 5. **工作流 (workflows)** ✅ 完全隔离

**数据隔离**:
```typescript
list: protectedProcedure → getUserWorkflows(userId)
get: protectedProcedure → getWorkflowById(id, userId)
```

**权限检查**: ✅ 完善

---

### 6. **AI智能体 (agents)** ✅ 完全隔离

**数据隔离**:
```typescript
list: protectedProcedure → getUserAgents(userId)
get: protectedProcedure → getAgentById(id, userId)
```

**权限检查**: ✅ 完善

---

### 7. **API密钥 (apiKeys)** ✅ 完全隔离 + 加密

**数据隔离**:
```typescript
list: protectedProcedure → getUserApiKeys(userId)
// ✅ 返回给前端时隐藏真实密钥
keys.map(k => ({ ...k, keyValue: "***" }))
```

**安全措施**: ✅ 优秀
- 数据库存储加密
- API返回时脱敏
- 只返回当前用户的密钥

---

### 8. **图片生成历史 (imageGenerations)** ✅ 完全隔离

**数据隔离**:
```typescript
// ✅ 所有查询强制过滤 userId
list: protectedProcedure → 按 userId 过滤
create: protectedProcedure → 自动关联 userId
```

**权限检查**: ✅ 完善

---

### 9. **优化历史 (optimizationHistory)** ✅ 完全隔离

**数据隔离**:
```typescript
list: protectedProcedure → getUserOptimizationHistory(userId)
getById: protectedProcedure → 验证所有权
```

**权限检查**: ✅ 完善

---

### 10. **通知 (notifications)** ✅ 完全隔离

**数据隔离**:
```typescript
list: protectedProcedure → getUserNotifications(userId)
markAsRead: protectedProcedure → 验证所有权
```

**权限检查**: ✅ 完善

---

### 11. **订阅管理 (subscription)** ✅ 完全隔离

**数据隔离**:
```typescript
getCurrent: protectedProcedure → getUserSubscription(userId)
getHistory: protectedProcedure → getUserSubscriptionHistory(userId)
```

**权限检查**: ✅ 完善

---

### 12. **优惠券 (coupons)** ⚠️ 需审查

**当前状态**:
```typescript
list: publicProcedure.query(async () => {
  return await db.getActiveCoupons(); // 返回所有活跃优惠券
})
```

**问题**: 优惠券列表是否应该公开？

**建议**:
- 如果是公开促销优惠券，当前实现 ✅ 合理
- 如果包含定向发放的优惠券，需要添加 `isPublic` 字段

**待确认**: 询问用户优惠券策略

---

### 13. **审计日志 (auditLogs)** ✅ 完全隔离

**数据隔离**:
```typescript
list: protectedProcedure → getUserAuditLogs(userId)
```

**权限检查**: ✅ 完善
- 用户只能查看自己的操作日志
- 管理员可以查看所有日志（需要 `role === 'admin'`）

---

## 📋 特殊模块

### 14. **批量操作 (batch)** ✅ 完全隔离

**数据隔离**:
```typescript
exportPrompts: protectedProcedure → 只导出 userId 的数据
importPrompts: protectedProcedure → 导入到 userId
```

**权限检查**: ✅ 完善

---

### 15. **统计数据 (statistics)** ✅ 完全隔离

**数据隔离**:
```typescript
dashboard: protectedProcedure → getUserStatistics(userId)
```

**权限检查**: ✅ 完善
- 只统计当前用户的数据

---

### 16. **分类助手 (categoryAssistant)** ✅ 完全隔离

**数据隔离**:
```typescript
getConversation: protectedProcedure → 验证所有权
createMessage: protectedProcedure → 关联到 userId
```

**权限检查**: ✅ 完善

---

### 17. **飞书集成 (feishu)** ✅ 完全隔离

**数据隔离**:
```typescript
getConfig: protectedProcedure → getUserFeishuConfig(userId)
setConfig: protectedProcedure → 关联到 userId
```

**权限检查**: ✅ 完善

---

## 🎯 需要确认的问题

### 1. **分类模板市场 (templateMarketplace)**

**当前**: `publicProcedure` - 所有人可查看所有模板

**问题**:
- 分类模板是系统预设还是用户创建？
- 是否需要区分公开/私有模板？

**建议**:
- 如果是系统预设模板 → ✅ 保持公开
- 如果用户可以创建模板 → ❌ 需要添加 `userId` 和 `isPublic` 字段

---

### 2. **优惠券 (coupons)**

**当前**: `publicProcedure` - 所有人可查看所有活跃优惠券

**问题**:
- 是否有定向发放的优惠券（如：新用户专享）？
- 是否希望所有优惠券都公开展示？

**建议**:
- 如果全部是公开促销优惠券 → ✅ 保持公开
- 如果有定向优惠券 → ❌ 需要添加 `isPublic` 或 `targetUserId` 字段

---

### 3. **提示词市场的工作流和智能体**

**当前**: 只有 **提示词市场**，没有工作流市场和智能体市场

**问题**:
- 是否需要"工作流市场"（公开分享工作流）？
- 是否需要"智能体市场"（公开分享智能体）？

**建议**:
- 如果需要 → 添加 `workflows.isPublic` 和 `agents.isPublic` 字段
- 如果不需要 → ✅ 保持当前设计

---

## 📊 总结表格

| 模块 | 当前访问权限 | 数据隔离 | 状态 | 建议 |
|------|-------------|---------|------|------|
| **公开模块** |
| marketplace | publicProcedure | isPublic 过滤 | ✅ 合理 | 无 |
| scenarios | publicProcedure | isCustom + userId 过滤 | ✅ 已修复 | 无 |
| templateMarketplace | publicProcedure | 无隔离 | ⚠️ 待确认 | 确认是否需要隔离 |
| coupons.list | publicProcedure | 无隔离 | ⚠️ 待确认 | 确认是否需要隔离 |
| **私有模块** |
| prompts | protectedProcedure | userId 强制过滤 | ✅ 完善 | 无 |
| workflows | protectedProcedure | userId 强制过滤 | ✅ 完善 | 考虑添加工作流市场 |
| agents | protectedProcedure | userId 强制过滤 | ✅ 完善 | 考虑添加智能体市场 |
| apiKeys | protectedProcedure | userId + 加密 | ✅ 完善 | 无 |
| imageGenerations | protectedProcedure | userId 强制过滤 | ✅ 完善 | 无 |
| optimizationHistory | protectedProcedure | userId 强制过滤 | ✅ 完善 | 无 |
| notifications | protectedProcedure | userId 强制过滤 | ✅ 完善 | 无 |
| subscription | protectedProcedure | userId 强制过滤 | ✅ 完善 | 无 |
| auditLogs | protectedProcedure | userId 强制过滤 | ✅ 完善 | 无 |
| batch | protectedProcedure | userId 强制过滤 | ✅ 完善 | 无 |
| statistics | protectedProcedure | userId 强制过滤 | ✅ 完善 | 无 |
| categoryAssistant | protectedProcedure | userId 强制过滤 | ✅ 完善 | 无 |
| feishu | protectedProcedure | userId 强制过滤 | ✅ 完善 | 无 |

---

## 🚀 上线前确认清单

### 必须确认
- [ ] **分类模板市场**: 确认是否需要用户隔离
- [ ] **优惠券**: 确认是否需要区分公开/定向优惠券

### 可选功能
- [ ] 是否需要"工作流市场"（类似提示词市场）
- [ ] 是否需要"智能体市场"（类似提示词市场）

### 已完成
- [x] ✅ scenarios 数据隔离已修复
- [x] ✅ 所有核心业务数据已完全隔离
- [x] ✅ API 权限控制严格

---

## 📞 后续维护

### 添加新功能时的检查清单

1. **数据表设计**:
   - [ ] 是否添加 `userId` 字段？
   - [ ] 是否需要 `isPublic` 字段？

2. **API 路由**:
   - [ ] 使用 `protectedProcedure` 还是 `publicProcedure`？
   - [ ] 是否传入 `ctx.user.id` 进行过滤？

3. **查询函数**:
   - [ ] 是否强制过滤 `userId`？
   - [ ] 是否验证资源所有权？

4. **测试**:
   - [ ] 用户A能否访问用户B的数据？
   - [ ] 未登录用户能否访问私有数据？

---

**最终建议**: 除了 2 个待确认的模块（分类模板、优惠券），系统已经做好了 SaaS 部署的准备。修复了 scenarios 数据隔离问题后，可以安全上线。
