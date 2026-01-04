# 邀请码系统代码审查报告

**审查时间**: 2025-12-31
**审查者**: Codex (gpt-5.1-codex-max)
**总体评分**: 需改进 → **良好**（修复后）

---

## 📊 审查总结

### ✅ 已修复的安全问题（来自初始设计评估）

1. **邀请码生成算法不安全** → ✅ 使用 nanoid(12)
2. **并发竞态条件** → ✅ 使用数据库事务
3. **数据库约束缺失** → ✅ 添加外键、唯一约束、CHECK约束
4. **错误信息泄露** → ✅ 统一返回"邀请码无效"
5. **缺少速率限制** → ✅ 实现内存限流（5次/15分钟）

---

## 🚨 本次审查发现的高危问题及修复

### 问题 1：邀请码用量校验失效 ✅ 已修复

**严重程度**: 🔴 高危
**位置**: `server/db.ts:2636-2653`

**原问题**:
```typescript
const updateResult = await tx.update(invitationCodes)
  .set({ usedCount: sql`${invitationCodes.usedCount} + 1` })
  .where(...);

if (!updateResult) {  // ❌ update 永远返回对象，即使 0 行受影响
  throw new Error('邀请码已达使用上限');
}
```

**后果**: 并发情况下可绕过 `maxUses` 限制，无限使用邀请码

**修复方案**:
```typescript
// 使用原生 SQL 获取 affectedRows
const updateResult = await tx.execute(sql`
  UPDATE ${invitationCodes}
  SET ${invitationCodes.usedCount} = ${invitationCodes.usedCount} + 1,
      ${invitationCodes.updatedAt} = CURRENT_TIMESTAMP
  WHERE ${invitationCodes.id} = ${invCode.id}
    AND (${invCode.maxUses} IS NULL OR ${invitationCodes.usedCount} < ${invCode.maxUses})
`);

// ✅ 检查受影响行数必须为 1
if (!updateResult || updateResult[0]?.affectedRows !== 1) {
  throw new Error('邀请码已达使用上限或已被其他用户使用');
}
```

**修复文件**: `server/db.ts:2636-2650`

---

### 问题 2：注册流程可绕过邀请码消耗 ✅ 已修复

**严重程度**: 🔴 高危
**位置**: `server/routers.ts:108-119`

**原问题**:
```typescript
// Step 4: Record invitation code usage
try {
  await db.useInvitationCode(...);
} catch (error: any) {
  console.error('Failed to record invitation code usage:', error);
  // ❌ 只记录日志，不阻止注册
}
// ❌ 注册继续完成，用户获得账号但未真正消耗邀请码
```

**后果**: 用户可以注册成功但不消耗邀请码，导致邀请码系统完全失效

**修复方案**:
```typescript
// Step 4: Record invitation code usage (CRITICAL - must succeed)
try {
  await db.useInvitationCode(
    input.invitationCode,
    user.id,
    ctx.req?.ip,
    ctx.req?.headers['user-agent']
  );
} catch (error: any) {
  // ✅ CRITICAL: If invitation code usage fails, rollback the registration
  console.error('[Auth] Failed to record invitation code usage, rolling back:', error);

  // Delete local user
  await db.deleteUser(user.id).catch(e =>
    console.error('[Auth] Failed to delete local user during rollback:', e)
  );

  // Delete Supabase user
  await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(e =>
    console.error('[Auth] Failed to delete Supabase user during rollback:', e)
  );

  // ✅ 抛出错误阻止注册
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: error.message || '邀请码使用失败，注册已回滚',
  });
}
```

**修复文件**: `server/routers.ts:110-136`, `server/db.ts:115-120`

---

## 🔶 中危问题（建议修复）

### 3. Schema 不一致

**位置**: `drizzle/schema.ts:530-542`

**问题**: Drizzle schema 未声明唯一约束和 CHECK 约束，与迁移 SQL 不一致

**建议**:
```typescript
export const invitationCodeUsage = mysqlTable("invitationCodeUsage", {
  // ... fields
}, (table) => ({
  // ... indexes
  // 添加唯一约束
  uniqueUserCode: unique("unique_user_code").on(table.codeId, table.userId),
}));
```

---

### 4. 验证接口信息泄露

**位置**: `server/db.ts:2591-2594`

**问题**: 返回完整邀请码记录，包含 `createdBy`, `grantDays` 等敏感信息

**建议**:
```typescript
return {
  valid: true,
  // 只返回必要字段
  grantTier: invCode.grantTier,
};
```

---

### 5. 速率限制不持久

**位置**: `server/utils/rateLimit.ts`

**问题**: 内存 Map 无法跨实例/重启，不适合生产多实例部署

**建议**: 使用 Redis 或其他共享存储

---

## 🔵 低危问题（可选优化）

### 6. 前端验证无防抖

**位置**: `client/src/pages/Login.tsx:22-29`

**问题**: 每次按键都触发验证请求

**建议**: 添加 300-500ms 防抖

---

### 7. 邀请码列表无分页

**位置**: `client/src/pages/InvitationCodes.tsx`, `server/db.ts:2725-2740`

**问题**: 数据量大时性能问题

**建议**: 实现分页和筛选

---

## 🎯 生产环境部署前检查清单

### 必须完成 ⚠️
- [x] 修复高危问题 1：邀请码用量校验
- [x] 修复高危问题 2：注册流程回滚机制
- [ ] **配置 Supabase 关闭公开注册**（最关键！）
- [ ] 补充并发测试用例

### 建议完成 📝
- [ ] 修复 Schema 不一致问题
- [ ] 减少验证接口返回字段
- [ ] 前端添加防抖
- [ ] 实现邀请码列表分页

### 可选优化 💡
- [ ] 升级速率限制至 Redis
- [ ] 添加邀请码统计仪表板
- [ ] 实现邀请奖励机制

---

## 📈 修复前后对比

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 高危漏洞 | 2 个 | 0 个 |
| 中危问题 | 3 个 | 3 个（可接受）|
| 低危问题 | 2 个 | 2 个（可接受）|
| 并发安全 | ❌ 不安全 | ✅ 安全 |
| 邀请码强制 | ❌ 可绕过 | ✅ 强制 |
| 总体评分 | 需改进 | **良好** |

---

## 🎓 关键经验教训

1. **永远检查 SQL 操作的受影响行数**
   - Drizzle ORM 的 `update()` 即使 0 行受影响也返回对象
   - 必须使用 `execute()` + 原生 SQL 获取 `affectedRows`

2. **关键业务逻辑必须有回滚机制**
   - 跨系统操作（Supabase + 本地数据库）需要手动回滚
   - 不能简单地 try-catch 吞掉错误

3. **数据库约束是最后防线**
   - 即使有应用层校验，仍需数据库层约束
   - Schema 定义要与迁移 SQL 保持一致

---

## 🚀 下一步行动

1. **立即**：配置 Supabase 关闭公开注册
2. **本周**：补充自动化测试（并发、回滚）
3. **下个迭代**：优化中危和低危问题

---

**审查完成时间**: 2025-12-31
**修复完成时间**: 2025-12-31
**最终状态**: ✅ 可以安全部署（完成 Supabase 配置后）
