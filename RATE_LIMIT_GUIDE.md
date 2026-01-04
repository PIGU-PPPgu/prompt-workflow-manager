# 速率限制使用指南

> API速率限制系统使用文档

## 📌 当前状态

- **全局开关**：❌ 关闭（默认）
- **所有限制**：❌ 禁用
- **部署状态**：✅ 已部署，未启用

## 🎯 功能特性

### 1. 多层级控制
- **全局开关**：一键启用/禁用所有速率限制
- **类型开关**：单独控制每种API类型（优化、导入、分享、通用）
- **等级开关**：为不同用户等级设置不同限制（免费、基础、专业、管理员）

### 2. 预设配置
提供三种预设模式，可一键切换：
- **严格模式**：适用于资源紧张时期
- **宽松模式**：默认配置（平衡）
- **无限制模式**：仅供测试使用

### 3. 实时管理
- 查看当前配置
- 动态修改限制参数
- 查看所有用户的速率限制记录
- 重置特定用户的限制记录

---

## 🚀 快速启用

### 方法一：通过管理后台API（推荐）

```typescript
// 1. 启用全局开关
await trpc.rateLimit.setGlobalEnabled.mutate({ enabled: true });

// 2. 应用预设配置（可选）
await trpc.rateLimit.applyPreset.mutate({ preset: 'relaxed' });

// 3. 查看当前配置
const config = await trpc.rateLimit.getConfig.query();
console.log(config);
```

### 方法二：直接修改代码

编辑 `server/middleware/rateLimit.ts`：

```typescript
// 修改全局开关
let globalEnabled = true; // 改为true

// 修改具体限制的enabled字段
export const RATE_LIMITS = {
  optimize: {
    enabled: true, // 改为true
    free: { ..., enabled: true },
    basic: { ..., enabled: true },
    // ...
  },
};
```

---

## 📊 默认限制配置

| API类型 | 用户等级 | 限制次数 | 时间窗口 | 当前状态 |
|---------|----------|----------|----------|----------|
| **AI优化** | 免费用户 | 10次 | 每小时 | ❌ 禁用 |
| | 基础版 | 50次 | 每小时 | ❌ 禁用 |
| | 专业版 | 100次 | 每小时 | ❌ 禁用 |
| | 管理员 | 1000次 | 每小时 | ❌ 禁用 |
| **批量导入** | 所有用户 | 5次 | 每小时 | ❌ 禁用 |
| **创建分享** | 所有用户 | 20次 | 每小时 | ❌ 禁用 |
| **通用API** | 所有用户 | 100次 | 每分钟 | ❌ 禁用 |

---

## 🔧 管理接口说明

### 查询类接口

#### 1. 获取速率限制配置
```typescript
// 管理员专用
const config = await trpc.rateLimit.getConfig.query();

// 返回结果
{
  globalEnabled: false,
  limits: {
    optimize: {
      enabled: false,
      free: { windowMs: 3600000, maxRequests: 10, message: "...", enabled: false },
      // ...
    },
    // ...
  }
}
```

#### 2. 查看用户速率限制状态
```typescript
// 任何用户都可以查看自己的状态
const status = await trpc.rateLimit.myStatus.query({ type: 'optimize' });

// 返回结果
{
  used: 5,           // 已使用次数
  remaining: 5,      // 剩余次数
  resetTime: Date,   // 重置时间
  globalEnabled: false,
  typeEnabled: false
}
```

#### 3. 获取所有速率限制记录
```typescript
// 管理员专用 - 调试用
const records = await trpc.rateLimit.getAllRecords.query();

// 返回结果
[
  {
    identifier: "optimize:123",
    count: 5,
    resetTime: 1703836800000,
    expired: false
  },
  // ...
]
```

### 修改类接口

#### 1. 设置全局开关
```typescript
// 启用
await trpc.rateLimit.setGlobalEnabled.mutate({ enabled: true });

// 禁用
await trpc.rateLimit.setGlobalEnabled.mutate({ enabled: false });
```

#### 2. 更新特定限制配置
```typescript
// 修改免费用户的AI优化限制
await trpc.rateLimit.updateConfig.mutate({
  type: 'optimize',
  tier: 'free',
  updates: {
    maxRequests: 20,    // 改为20次/小时
    enabled: true       // 启用
  }
});

// 启用/禁用某个类型的总开关
await trpc.rateLimit.updateConfig.mutate({
  type: 'optimize',
  tier: 'enabled',
  updates: {
    enabled: true
  }
});
```

#### 3. 应用预设配置
```typescript
// 应用严格模式
await trpc.rateLimit.applyPreset.mutate({ preset: 'strict' });

// 应用宽松模式
await trpc.rateLimit.applyPreset.mutate({ preset: 'relaxed' });

// 应用无限制模式（测试用）
await trpc.rateLimit.applyPreset.mutate({ preset: 'unlimited' });
```

### 维护类接口

#### 1. 重置用户速率限制
```typescript
// 重置某个用户的所有限制
await trpc.rateLimit.resetUserLimit.mutate({ userId: 123 });

// 重置某个用户的特定类型限制
await trpc.rateLimit.resetUserLimit.mutate({
  userId: 123,
  type: 'optimize'
});
```

#### 2. 清空所有速率限制记录
```typescript
// 慎用！会清空所有用户的速率限制记录
await trpc.rateLimit.clearAll.mutate();
```

---

## 💡 使用场景示例

### 场景1：新功能上线，临时放宽限制
```typescript
// 1. 应用无限制模式
await trpc.rateLimit.applyPreset.mutate({ preset: 'unlimited' });
await trpc.rateLimit.setGlobalEnabled.mutate({ enabled: true });

// 2. 一周后恢复正常
await trpc.rateLimit.applyPreset.mutate({ preset: 'relaxed' });
```

### 场景2：资源紧张，需要限流
```typescript
// 1. 应用严格模式
await trpc.rateLimit.applyPreset.mutate({ preset: 'strict' });

// 2. 仅对免费用户限制更严格
await trpc.rateLimit.updateConfig.mutate({
  type: 'optimize',
  tier: 'free',
  updates: { maxRequests: 3 } // 降低到3次/小时
});
```

### 场景3：某个用户遇到问题，需要重置
```typescript
// 重置该用户的速率限制记录
await trpc.rateLimit.resetUserLimit.mutate({ userId: 456 });
```

### 场景4：测试速率限制功能
```typescript
// 1. 启用速率限制
await trpc.rateLimit.setGlobalEnabled.mutate({ enabled: true });

// 2. 设置非常低的限制便于测试
await trpc.rateLimit.updateConfig.mutate({
  type: 'optimize',
  tier: 'free',
  updates: { maxRequests: 2, windowMs: 60000 } // 2次/分钟
});

// 3. 测试完成后重置
await trpc.rateLimit.clearAll.mutate();
await trpc.rateLimit.setGlobalEnabled.mutate({ enabled: false });
```

---

## ⚙️ 如何在API中应用速率限制

**注意**：当前代码中**未应用**速率限制中间件，需要手动添加。

### 示例：为AI优化接口添加限制

编辑 `server/routers.ts`：

```typescript
import { createOptimizeRateLimiter } from './middleware/rateLimit';

// ...

prompts: router({
  optimize: protectedProcedure
    .use(createOptimizeRateLimiter()) // 添加这一行
    .input(z.object({
      content: z.string(),
      // ...
    }))
    .mutation(async ({ ctx, input }) => {
      // 原有逻辑
    }),
}),
```

### 其他中间件

```typescript
import {
  createOptimizeRateLimiter,
  createImportRateLimiter,
  createShareRateLimiter,
} from './middleware/rateLimit';

// 批量导入
scenarios: router({
  importTemplate: protectedProcedure
    .use(createImportRateLimiter())
    .mutation(/* ... */),
}),

// 分享链接创建
prompts: router({
  createShare: protectedProcedure
    .use(createShareRateLimiter())
    .mutation(/* ... */),
}),
```

---

## 📝 审计日志

所有速率限制管理操作都会记录审计日志：

- 设置全局开关
- 更新限制配置
- 应用预设配置
- 重置用户限制
- 清空所有限制

可通过审计日志查看操作历史：

```typescript
const logs = await trpc.auditLogs.list.query({ limit: 100 });
```

---

## 🔍 监控建议

### 1. 定期检查速率限制记录
```typescript
const records = await trpc.rateLimit.getAllRecords.query();
// 分析哪些用户频繁触发限制
```

### 2. 监控用户反馈
如果大量用户反馈"限制过严"，考虑调整配置。

### 3. 根据服务器负载动态调整
- 高峰期：应用严格模式
- 低峰期：应用宽松模式

---

## ❓ 常见问题

### Q1: 重启服务器后速率限制记录会丢失吗？
**A**: 是的。当前使用内存存储，重启后记录会清空。如果需要持久化，可以迁移到Redis。

### Q2: 如何临时解除某个用户的限制？
**A**: 使用 `resetUserLimit` 重置他的限制记录，或者为他单独提升订阅等级。

### Q3: 速率限制是否影响性能？
**A**: 几乎无影响。内存检查非常快速（< 1ms）。

### Q4: 如何查看当前是否启用了速率限制？
**A**: 调用 `rateLimit.getConfig.query()` 查看 `globalEnabled` 字段。

### Q5: 修改配置后需要重启服务器吗？
**A**: 不需要。配置存储在内存中，修改立即生效。

---

## 🎯 下一步建议

1. **监控告警**：集成Sentry或自建监控，当大量用户触发限制时告警
2. **数据分析**：统计各API的调用频率，优化限制策略
3. **用户提示**：在前端显示剩余次数，提醒用户升级订阅
4. **Redis迁移**：如果需要持久化或分布式部署，迁移到Redis

---

最后更新：2025-12-29
