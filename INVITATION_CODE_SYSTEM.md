# 邀请码系统设计文档

## 📋 需求分析

**目标**: 只有持有邀请码的用户才能注册登录系统

**核心功能**:
1. 管理员可以生成邀请码
2. 用户注册时必须输入有效的邀请码
3. 邀请码可以设置使用次数限制
4. 邀请码可以设置过期时间
5. 追踪邀请码使用情况（谁用的、什么时候用的）

---

## 🗄️ 数据库设计

### 1. 邀请码表 (invitationCodes)

```typescript
export const invitationCodes = mysqlTable("invitationCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // 邀请码
  description: text("description"), // 备注说明（如：内测用户、VIP专属等）
  createdBy: int("createdBy").notNull(), // 创建者ID（管理员）
  maxUses: int("maxUses"), // 最大使用次数，null表示无限制
  usedCount: int("usedCount").default(0).notNull(), // 已使用次数
  expiresAt: timestamp("expiresAt"), // 过期时间，null表示永不过期
  isActive: boolean("isActive").default(true).notNull(), // 是否启用
  // 可选：绑定到特定订阅计划
  grantTier: mysqlEnum("grantTier", ["free", "basic", "pro"]).default("free"), // 注册后获得的订阅等级
  grantDays: int("grantDays").default(0), // 赠送订阅天数（0表示不赠送）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### 2. 邀请码使用记录表 (invitationCodeUsage)

```typescript
export const invitationCodeUsage = mysqlTable("invitationCodeUsage", {
  id: int("id").autoincrement().primaryKey(),
  codeId: int("codeId").notNull(), // 邀请码ID
  userId: int("userId").notNull(), // 使用者用户ID
  usedAt: timestamp("usedAt").defaultNow().notNull(), // 使用时间
  ipAddress: varchar("ipAddress", { length: 45 }), // 使用时的IP地址
  userAgent: text("userAgent"), // 浏览器信息
});
```

### 3. users 表扩展

在现有 users 表中添加字段：

```typescript
export const users = mysqlTable("users", {
  // ... 现有字段
  invitationCodeId: int("invitationCodeId"), // 使用的邀请码ID
  // ...
});
```

---

## 🔧 实现方案

### 方案对比

#### 方案A：Supabase Auth + 本地邀请码验证 ⭐ 推荐

**流程**:
```
1. 用户访问注册页面
2. 输入邮箱 + 邀请码
3. 前端调用后端 API 验证邀请码
   ✅ 有效 → 调用 Supabase Auth 注册
   ❌ 无效 → 提示错误，拒绝注册
4. Supabase Auth 注册成功后
5. 后端创建本地用户记录，关联邀请码
6. 记录邀请码使用记录
```

**优点**:
- ✅ 简单直接，易于实现
- ✅ 不需要修改 Supabase 配置
- ✅ 完全掌控邀请码逻辑
- ✅ 可以灵活扩展（如赠送订阅等）

**缺点**:
- ⚠️ 需要前端两步验证（先验证码，再注册）

---

#### 方案B：Supabase Auth Hooks (企业版功能)

**流程**:
```
1. 在 Supabase 配置 Auth Hook
2. 用户注册时，Supabase 回调你的服务器验证邀请码
3. 验证通过才允许注册
```

**优点**:
- ✅ 在 Supabase 层面拦截
- ✅ 更安全（无法绕过）

**缺点**:
- ❌ 需要 Supabase Pro 计划（付费）
- ❌ 配置复杂

---

#### 方案C：Supabase RLS + Metadata

**流程**:
```
1. 用户注册时，在 metadata 中存储邀请码
2. 后端验证邀请码
3. 通过 RLS (Row Level Security) 策略限制访问
```

**优点**:
- ✅ 利用 Supabase 原生功能

**缺点**:
- ❌ Metadata 有大小限制
- ❌ RLS 配置复杂
- ❌ 不够灵活

---

### 推荐方案：方案A（Supabase Auth + 本地验证）

---

## 📝 实现步骤

### Step 1: 数据库迁移

**文件**: `drizzle/0027_invitation_codes.sql`

```sql
-- 创建邀请码表
CREATE TABLE `invitationCodes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `code` varchar(50) NOT NULL UNIQUE,
  `description` text,
  `createdBy` int NOT NULL,
  `maxUses` int,
  `usedCount` int NOT NULL DEFAULT 0,
  `expiresAt` timestamp,
  `isActive` boolean NOT NULL DEFAULT true,
  `grantTier` enum('free', 'basic', 'pro') DEFAULT 'free',
  `grantDays` int DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建邀请码使用记录表
CREATE TABLE `invitationCodeUsage` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `codeId` int NOT NULL,
  `userId` int NOT NULL,
  `usedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ipAddress` varchar(45),
  `userAgent` text
);

-- users 表添加邀请码字段
ALTER TABLE `users`
ADD COLUMN `invitationCodeId` int;

-- 创建索引
CREATE INDEX `idx_invitationCodes_code` ON `invitationCodes` (`code`);
CREATE INDEX `idx_invitationCodes_isActive` ON `invitationCodes` (`isActive`, `expiresAt`);
CREATE INDEX `idx_invitationCodeUsage_codeId` ON `invitationCodeUsage` (`codeId`);
CREATE INDEX `idx_invitationCodeUsage_userId` ON `invitationCodeUsage` (`userId`);
```

---

### Step 2: Schema 定义

**文件**: `drizzle/schema.ts`

在文件末尾添加：

```typescript
/**
 * Invitation codes for user registration control
 */
export const invitationCodes = mysqlTable("invitationCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  createdBy: int("createdBy").notNull(),
  maxUses: int("maxUses"),
  usedCount: int("usedCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  grantTier: mysqlEnum("grantTier", ["free", "basic", "pro"]).default("free"),
  grantDays: int("grantDays").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InvitationCode = typeof invitationCodes.$inferSelect;
export type InsertInvitationCode = typeof invitationCodes.$inferInsert;

/**
 * Invitation code usage history
 */
export const invitationCodeUsage = mysqlTable("invitationCodeUsage", {
  id: int("id").autoincrement().primaryKey(),
  codeId: int("codeId").notNull(),
  userId: int("userId").notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
});

export type InvitationCodeUsageRecord = typeof invitationCodeUsage.$inferSelect;
export type InsertInvitationCodeUsage = typeof invitationCodeUsage.$inferInsert;
```

同时修改 users 表：

```typescript
export const users = mysqlTable("users", {
  // ... 现有字段
  invitationCodeId: int("invitationCodeId"), // 新增字段
  // ...
});
```

---

### Step 3: 后端业务逻辑

**文件**: `server/db.ts`

在文件末尾添加：

```typescript
// ============ Invitation Code Functions ============

/**
 * 验证邀请码
 */
export async function validateInvitationCode(code: string) {
  const database = await getDb();
  if (!database) return { valid: false, error: '数据库连接失败' };

  const result = await database
    .select()
    .from(invitationCodes)
    .where(eq(invitationCodes.code, code))
    .limit(1);

  if (result.length === 0) {
    return { valid: false, error: '邀请码不存在' };
  }

  const invCode = result[0];

  // 检查是否启用
  if (!invCode.isActive) {
    return { valid: false, error: '邀请码已被禁用' };
  }

  // 检查是否过期
  if (invCode.expiresAt && new Date(invCode.expiresAt) < new Date()) {
    return { valid: false, error: '邀请码已过期' };
  }

  // 检查使用次数
  if (invCode.maxUses && invCode.usedCount >= invCode.maxUses) {
    return { valid: false, error: '邀请码已达使用上限' };
  }

  return {
    valid: true,
    invitationCode: invCode,
  };
}

/**
 * 使用邀请码（注册时调用）
 */
export async function useInvitationCode(
  code: string,
  userId: number,
  ipAddress?: string,
  userAgent?: string
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  // 验证邀请码
  const validation = await validateInvitationCode(code);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const invCode = validation.invitationCode!;

  // 增加使用次数
  await database
    .update(invitationCodes)
    .set({ usedCount: invCode.usedCount + 1 })
    .where(eq(invitationCodes.id, invCode.id));

  // 记录使用历史
  await database.insert(invitationCodeUsage).values({
    codeId: invCode.id,
    userId,
    ipAddress,
    userAgent,
  });

  // 更新用户的邀请码关联
  await database
    .update(users)
    .set({ invitationCodeId: invCode.id })
    .where(eq(users.id, userId));

  return invCode;
}

/**
 * 生成邀请码（管理员）
 */
export async function generateInvitationCode(data: {
  code?: string; // 自定义码，不提供则自动生成
  description?: string;
  createdBy: number;
  maxUses?: number;
  expiresAt?: Date;
  grantTier?: 'free' | 'basic' | 'pro';
  grantDays?: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  // 如果没有提供code，自动生成
  const code = data.code || generateRandomCode();

  // 检查code是否已存在
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
    maxUses: data.maxUses,
    expiresAt: data.expiresAt,
    grantTier: data.grantTier || 'free',
    grantDays: data.grantDays || 0,
  });

  return result.insertId;
}

/**
 * 生成随机邀请码
 */
function generateRandomCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字符
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 获取所有邀请码（管理员）
 */
export async function getAllInvitationCodes() {
  const database = await getDb();
  if (!database) return [];

  return await database
    .select()
    .from(invitationCodes)
    .orderBy(desc(invitationCodes.createdAt));
}

/**
 * 获取邀请码使用记录
 */
export async function getInvitationCodeUsage(codeId: number) {
  const database = await getDb();
  if (!database) return [];

  return await database
    .select()
    .from(invitationCodeUsage)
    .where(eq(invitationCodeUsage.codeId, codeId))
    .orderBy(desc(invitationCodeUsage.usedAt));
}

/**
 * 禁用/启用邀请码
 */
export async function toggleInvitationCode(codeId: number, isActive: boolean) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database
    .update(invitationCodes)
    .set({ isActive })
    .where(eq(invitationCodes.id, codeId));
}
```

---

### Step 4: API 路由

**文件**: `server/routers.ts`

在文件末尾 export default 前添加：

```typescript
  // ============ Invitation Code Routes ============
  invitationCodes: router({
    // 公开：验证邀请码（注册前）
    validate: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await db.validateInvitationCode(input.code);
      }),

    // 管理员：获取所有邀请码
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('无权限访问');
      }
      return await db.getAllInvitationCodes();
    }),

    // 管理员：生成邀请码
    generate: protectedProcedure
      .input(z.object({
        code: z.string().optional(),
        description: z.string().optional(),
        maxUses: z.number().optional(),
        expiresAt: z.date().optional(),
        grantTier: z.enum(['free', 'basic', 'pro']).optional(),
        grantDays: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }

        const id = await db.generateInvitationCode({
          ...input,
          createdBy: ctx.user.id,
        });

        return { success: true, id };
      }),

    // 管理员：查看邀请码使用记录
    usage: protectedProcedure
      .input(z.object({ codeId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }

        return await db.getInvitationCodeUsage(input.codeId);
      }),

    // 管理员：禁用/启用邀请码
    toggle: protectedProcedure
      .input(z.object({
        codeId: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }

        await db.toggleInvitationCode(input.codeId, input.isActive);
        return { success: true };
      }),
  }),
```

---

### Step 5: 修改认证流程

**文件**: `server/routers.ts` 中的 auth 路由

找到现有的注册逻辑，修改为：

```typescript
auth: router({
  // ... 现有的 login, logout 等

  // 修改注册逻辑
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().optional(),
      invitationCode: z.string(), // 新增：必须提供邀请码
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. 先验证邀请码
      const validation = await db.validateInvitationCode(input.invitationCode);
      if (!validation.valid) {
        throw new Error(validation.error || '邀请码无效');
      }

      const invCode = validation.invitationCode!;

      // 2. 使用 Supabase Auth 注册
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            name: input.name,
            invitation_code: input.invitationCode, // 保存到 metadata
          },
        },
      });

      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('注册失败');

      // 3. 创建本地用户记录
      const userId = await db.createUser({
        openId: data.user.id,
        email: input.email,
        name: input.name,
        loginMethod: 'email',
        // 根据邀请码设置订阅
        subscriptionTier: invCode.grantTier || 'free',
        subscriptionStatus: invCode.grantDays > 0 ? 'active' : undefined,
        subscriptionEndDate: invCode.grantDays > 0
          ? new Date(Date.now() + invCode.grantDays * 24 * 60 * 60 * 1000)
          : undefined,
      });

      // 4. 记录邀请码使用
      await db.useInvitationCode(
        input.invitationCode,
        userId,
        ctx.req?.ip,
        ctx.req?.headers['user-agent']
      );

      return {
        success: true,
        user: data.user,
      };
    }),
}),
```

---

### Step 6: 前端注册页面修改

**文件**: `client/src/pages/Register.tsx` (或对应的注册组件)

```typescript
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const registerMutation = trpc.auth.register.useMutation();

  // 实时验证邀请码（可选，提升体验）
  const validateCodeMutation = trpc.invitationCodes.validate.useQuery(
    { code: invitationCode },
    { enabled: invitationCode.length >= 6 }
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 先验证邀请码
      if (!validateCodeMutation.data?.valid) {
        toast.error('请输入有效的邀请码');
        return;
      }

      // 调用注册接口
      await registerMutation.mutateAsync({
        email,
        password,
        name,
        invitationCode,
      });

      toast.success('注册成功！请查收邮箱验证邮件');
      // 跳转到登录页或其他页面
    } catch (error: any) {
      toast.error(error.message || '注册失败');
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <div>
        <label>邀请码</label>
        <input
          type="text"
          value={invitationCode}
          onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
          placeholder="请输入邀请码"
          required
        />
        {validateCodeMutation.data && (
          <p className={validateCodeMutation.data.valid ? 'text-green-600' : 'text-red-600'}>
            {validateCodeMutation.data.valid ? '✓ 邀请码有效' : validateCodeMutation.data.error}
          </p>
        )}
      </div>

      <div>
        <label>邮箱</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label>密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>

      <div>
        <label>姓名（可选）</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={registerMutation.isPending || !validateCodeMutation.data?.valid}
      >
        {registerMutation.isPending ? '注册中...' : '注册'}
      </button>
    </form>
  );
}
```

---

## 🎨 管理后台界面

### 邀请码管理页面功能

1. **邀请码列表**
   - 显示所有邀请码
   - 状态（启用/禁用）
   - 使用情况（已用/总数）
   - 过期时间

2. **生成邀请码**
   - 自定义码或随机生成
   - 设置使用次数限制
   - 设置过期时间
   - 设置赠送订阅

3. **使用记录**
   - 谁用了这个码
   - 什么时候用的
   - IP地址追踪

---

## 🔒 安全考虑

### 防止暴力破解

```typescript
// server/middleware/rateLimit.ts 中添加
export const invitationCodeRateLimit = {
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: '验证邀请码次数过多，请15分钟后再试',
};
```

### 防止共享码滥用

1. **IP限制**: 同一IP 24小时内只能使用3次邀请码
2. **设备指纹**: 使用 fingerprintjs 追踪设备
3. **邮箱域名限制**: 只允许特定邮箱域名注册

---

## 📊 使用场景示例

### 场景1：内测阶段（严格控制）

```typescript
// 生成10个邀请码，每个只能用1次
for (let i = 0; i < 10; i++) {
  await db.generateInvitationCode({
    description: '内测用户专属',
    createdBy: adminId,
    maxUses: 1,
    expiresAt: new Date('2024-03-31'),
    grantTier: 'pro',
    grantDays: 30, // 赠送30天Pro
  });
}
```

### 场景2：推广活动（限时限量）

```typescript
// 生成1个公开码，可用100次，7天过期
await db.generateInvitationCode({
  code: 'LAUNCH100',
  description: '产品发布活动',
  createdBy: adminId,
  maxUses: 100,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  grantTier: 'basic',
  grantDays: 90, // 赠送90天Basic
});
```

### 场景3：VIP用户邀请（无限制）

```typescript
// 生成永久有效的邀请码
await db.generateInvitationCode({
  code: 'VIP-LIFETIME',
  description: 'VIP用户专属码',
  createdBy: adminId,
  maxUses: null, // 无限次
  expiresAt: null, // 永不过期
  grantTier: 'pro',
});
```

---

## ✅ 实施检查清单

- [ ] 执行数据库迁移 SQL
- [ ] 更新 schema.ts 定义
- [ ] 添加后端业务逻辑函数
- [ ] 添加 API 路由
- [ ] 修改认证流程（注册）
- [ ] 修改前端注册页面
- [ ] 创建管理后台页面
- [ ] 添加速率限制
- [ ] 测试完整流程

---

## 🧪 测试流程

1. **生成邀请码**（管理员）
2. **验证有效码**（用户尝试注册）
3. **验证无效码**（已过期/已用完/不存在）
4. **完成注册**（使用有效码）
5. **检查记录**（使用历史是否正确）
6. **尝试复用**（同一码第二次使用，应受maxUses限制）

---

## 📈 数据分析

### 追踪指标

1. **邀请码转化率**: 生成数 vs 使用数
2. **用户来源分析**: 哪些邀请码带来的用户最多
3. **时间分析**: 用户从获得码到注册的时间间隔
4. **留存率**: 通过邀请码注册的用户留存情况

---

## 🎯 总结

**邀请码系统优势**:
- ✅ 完全掌控用户注册
- ✅ 灵活的营销策略（限时/限量/定向）
- ✅ 追踪用户来源
- ✅ 赠送订阅作为激励
- ✅ 与 Supabase Auth 无缝集成

**下一步**: 我帮你实现这套系统吗？
