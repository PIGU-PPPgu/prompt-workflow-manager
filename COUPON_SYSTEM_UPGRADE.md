# 优惠券系统升级方案

## 一、设计决策

### 1.1 核心需求分析
用户需求："公开促销券公开，定向券隔离"

**设计决策：**
- **添加 `isPublic` 字段**：标识优惠券是否为公开促销券
- **添加 `targetUserId` 字段**：实现定向发放功能
- **添加 `description` 字段**：为公开券提供展示说明
- **添加互斥验证**：公开券和定向券不能同时设置

### 1.2 设计理由

#### 为什么需要 `isPublic` 字段？
1. **明确区分券类型**：清晰地将优惠券分为公开促销券、定向券、普通券三类
2. **权限控制**：公开券可以在优惠券中心展示，其他券保持隐私
3. **营销策略**：支持节日促销、拉新活动等公开营销场景
4. **查询优化**：通过索引快速获取公开券列表

#### 为什么需要 `targetUserId` 字段？
1. **精准营销**：可以针对特定用户发放专属优惠券
2. **用户激活**：为流失用户、新用户发放定向优惠
3. **权益保护**：定向券只能被指定用户使用，防止泄露
4. **会员体系**：支持VIP专属优惠等高级运营策略

#### 为什么需要 `description` 字段？
1. **用户体验**：在优惠券中心展示优惠说明，提升转化率
2. **营销文案**：支持"新人专享"、"限时8折"等促销文案
3. **透明度**：清晰展示使用条件和优惠力度

## 二、数据库变更

### 2.1 Schema 修改
文件：`drizzle/schema.ts`

```typescript
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(),
  discountValue: int("discountValue").notNull(),
  tier: mysqlEnum("tier", ["basic", "pro"]),
  maxUses: int("maxUses"),
  usedCount: int("usedCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(), // 新增
  targetUserId: int("targetUserId"), // 新增
  description: text("description"), // 新增
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### 2.2 迁移 SQL
文件：`drizzle/0026_coupon_public_target.sql`

```sql
-- Migration: Add isPublic, targetUserId, and description to coupons table
ALTER TABLE `coupons`
ADD COLUMN `isPublic` boolean NOT NULL DEFAULT false,
ADD COLUMN `targetUserId` int,
ADD COLUMN `description` text;

-- Add index for public coupons query optimization
CREATE INDEX `idx_coupons_isPublic` ON `coupons` (`isPublic`, `isActive`, `expiresAt`);

-- Add index for targeted coupons query optimization
CREATE INDEX `idx_coupons_targetUserId` ON `coupons` (`targetUserId`);
```

**执行迁移：**
```bash
# 应用迁移到数据库
mysql -u your_user -p your_database < drizzle/0026_coupon_public_target.sql
```

## 三、数据库操作函数

### 3.1 新增函数
文件：`server/db.ts`

```typescript
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
```

### 3.2 修改现有函数
```typescript
// 更新验证函数，增加 userId 参数
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
  // 新增：定向券验证
  if (coupon.targetUserId && userId && coupon.targetUserId !== userId) {
    return { valid: false, error: '该优惠券不适用于当前用户' };
  }

  return { valid: true, coupon };
}
```

### 3.3 更新导入语句
```typescript
import { eq, and, or, desc, sql, isNull, gt } from "drizzle-orm";
```

## 四、API 接口变更

### 4.1 新增接口
文件：`server/routers.ts`

```typescript
coupons: router({
  // 新增：公开优惠券列表（无需登录）
  public: publicProcedure.query(async () => {
    return await db.getPublicCoupons();
  }),

  // 新增：我的定向优惠券
  myTargeted: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUserTargetedCoupons(ctx.user.id);
  }),

  // ... 其他接口
})
```

### 4.2 修改 create 接口
```typescript
create: protectedProcedure
  .input(z.object({
    code: SafeString.refine(val => val.length >= 1 && val.length <= 50, {
      message: '优惠券码长度必须在1-50个字符之间'
    }),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().min(1),
    tier: z.enum(['basic', 'pro']).optional(),
    maxUses: z.number().optional(),
    expiresAt: z.date().optional(),
    isPublic: z.boolean().optional(), // 新增
    targetUserId: z.number().optional(), // 新增
    description: z.string().optional(), // 新增
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('无权限访问');
    }

    // 新增：验证互斥性
    if (input.isPublic && input.targetUserId) {
      throw new Error('公开券和定向券不能同时设置');
    }

    const existing = await db.getCouponByCode(input.code);
    if (existing) {
      throw new Error('优惠券码已存在');
    }

    const id = await db.createCoupon({
      ...input,
      createdBy: ctx.user.id,
    });

    return { success: true, id };
  }),
```

### 4.3 修改 validate 接口
```typescript
validate: protectedProcedure
  .input(z.object({
    code: z.string(),
    tier: z.enum(['basic', 'pro']).optional(),
  }))
  .query(async ({ ctx, input }) => {
    // 新增：传入 userId 进行定向券验证
    return await db.validateCoupon(input.code, input.tier, ctx.user.id);
  }),
```

## 五、API 使用示例

### 5.1 前端调用示例

```typescript
// 1. 获取公开优惠券列表（优惠券中心）
const publicCoupons = await trpc.coupons.public.query();

// 2. 获取我的定向优惠券
const myTargetedCoupons = await trpc.coupons.myTargeted.query();

// 3. 管理员创建公开促销券
await trpc.coupons.create.mutate({
  code: 'NEWYEAR2024',
  discountType: 'percentage',
  discountValue: 20,
  isPublic: true,
  description: '新年8折优惠，限时3天',
  expiresAt: new Date('2024-01-03'),
  maxUses: 100,
});

// 4. 管理员创建定向券
await trpc.coupons.create.mutate({
  code: 'VIP-USER-123',
  discountType: 'fixed',
  discountValue: 5000, // 50元
  targetUserId: 123,
  description: '感谢您的支持，专属优惠券',
  tier: 'pro',
});

// 5. 用户验证优惠券
const result = await trpc.coupons.validate.query({
  code: 'NEWYEAR2024',
  tier: 'pro',
});
```

## 六、产品建议

### 6.1 优惠券中心页面

**是否需要：强烈建议添加**

**理由：**
1. **提升转化**：集中展示公开优惠券，刺激用户付费
2. **用户体验**：让用户主动发现优惠，而不是被动输入
3. **运营工具**：成为重要的营销阵地

**功能设计：**
```
优惠券中心
├── 公开促销券区域
│   ├── 券卡展示（折扣、有效期、使用条件）
│   ├── 立即领取按钮
│   └── 剩余数量显示
├── 我的专属券区域
│   ├── 定向券列表
│   ├── 使用状态标识
│   └── 快速使用入口
└── 已使用/已过期券（可折叠）
```

**页面路由建议：**
- `/coupons` - 优惠券中心
- `/coupons/my` - 我的优惠券

### 6.2 优惠券使用场景

#### 公开促销券场景
1. **节日营销**：春节、双11、周年庆等
   - 示例：`SPRING2024` - 全场8折，限量500张

2. **新用户拉新**：首次注册送优惠
   - 示例：`WELCOME` - 新人专享7折，无使用限制

3. **产品推广**：推广特定套餐
   - 示例：`PRO50OFF` - Pro版专享立减50元

4. **限时促销**：制造紧迫感
   - 示例：`FLASH24H` - 24小时闪购，限100张

#### 定向券场景
1. **流失用户召回**：针对30天未登录用户
   - 自动发放专属优惠券
   - 邮件/短信通知

2. **VIP用户权益**：高价值用户维护
   - 每月专属折扣券
   - 续费优惠

3. **客诉补偿**：服务问题补偿
   - 客服手动发放
   - 标注补偿原因

4. **推荐奖励**：邀请好友成功
   - 邀请人和被邀请人都获得专属券

### 6.3 防止薅羊毛的建议

#### 6.3.1 技术防护
```typescript
// 1. 每个用户对同一张券只能使用一次
export async function validateCouponForUser(couponId: number, userId: number) {
  const hasUsed = await hasUserUsedCoupon(userId, couponId);
  if (hasUsed) {
    return { valid: false, error: '您已使用过该优惠券' };
  }
  // ... 其他验证
}

// 2. IP限制（防止批量注册）
export async function checkIpUsageLimit(ip: string, couponId: number) {
  const count = await db.select()
    .from(couponUsage)
    .innerJoin(auditLogs, eq(auditLogs.userId, couponUsage.userId))
    .where(
      and(
        eq(couponUsage.couponId, couponId),
        eq(auditLogs.ipAddress, ip)
      )
    );

  if (count.length >= 3) {
    return { valid: false, error: '该IP地址使用次数过多' };
  }
}

// 3. 设备指纹（前端采集）
// 使用 fingerprintjs 等工具生成设备唯一标识
```

#### 6.3.2 业务规则
1. **实名认证**：高价值券要求手机验证
2. **使用门槛**：设置最低消费金额
3. **时间限制**：
   - 领取后X小时内必须使用
   - 每日领取次数限制
4. **账号限制**：
   - 新注册账号冷却期（如48小时后才能使用）
   - 要求完善个人资料

#### 6.3.3 监控预警
```typescript
// 异常监控示例
export async function monitorCouponAbuse() {
  // 1. 检测短时间内大量领取
  const recentUsage = await db.select()
    .from(couponUsage)
    .where(gt(couponUsage.usedAt, new Date(Date.now() - 3600000))) // 1小时内
    .groupBy(couponUsage.userId);

  // 如果单个用户1小时内使用超过5张券，触发预警
  const suspiciousUsers = recentUsage.filter(u => u.count > 5);

  // 2. 检测同一IP大量注册
  // 3. 检测优惠券码被爬取（访问频率异常）

  // 发送预警通知
  if (suspiciousUsers.length > 0) {
    await sendAdminAlert('优惠券异常使用', suspiciousUsers);
  }
}
```

#### 6.3.4 运营策略
1. **分层发放**：
   - 低价值券公开（如95折）
   - 高价值券定向（如5折）

2. **券池机制**：
   - 公开券总预算控制
   - 达到预算后自动下架

3. **动态调整**：
   - 根据使用数据实时调整力度
   - A/B测试不同优惠策略

4. **用户分群**：
   ```typescript
   // 根据用户行为打标签
   enum UserTag {
     NEW_USER = 'new_user',           // 新用户
     ACTIVE_USER = 'active_user',     // 活跃用户
     CHURN_RISK = 'churn_risk',       // 流失风险
     HIGH_VALUE = 'high_value',       // 高价值
     SUSPECTED_ABUSE = 'suspected_abuse' // 疑似薅羊毛
   }

   // 针对不同标签发放不同券
   ```

### 6.4 数据分析建议

建议添加以下统计维度：

```typescript
// 优惠券效果分析
interface CouponAnalytics {
  couponId: number;
  totalViews: number;        // 浏览次数
  totalClaimed: number;      // 领取次数
  totalUsed: number;         // 使用次数
  conversionRate: number;    // 转化率
  totalDiscount: number;     // 总优惠金额
  totalRevenue: number;      // 带来的收入
  roi: number;               // 投入产出比
  avgOrderValue: number;     // 平均订单金额
  userRetentionRate: number; // 用户留存率
}
```

## 七、部署步骤

### 7.1 数据库迁移
```bash
# 1. 备份数据库
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql

# 2. 执行迁移
mysql -u user -p database < drizzle/0026_coupon_public_target.sql

# 3. 验证迁移
mysql -u user -p database -e "DESCRIBE coupons;"
```

### 7.2 代码部署
```bash
# 1. 提交代码
git add .
git commit -m "feat: 优惠券系统升级 - 支持公开券和定向券"

# 2. 部署到测试环境
npm run build
npm run deploy:test

# 3. 测试验证
# 4. 部署到生产环境
npm run deploy:prod
```

### 7.3 验证清单
- [ ] 数据库字段已添加
- [ ] 索引已创建
- [ ] API接口正常
- [ ] 公开券可以正常获取
- [ ] 定向券隔离生效
- [ ] 互斥验证工作正常
- [ ] 前端页面展示正常

## 八、后续优化建议

1. **券码生成器**：自动生成随机券码
2. **批量发放**：支持CSV导入批量创建定向券
3. **使用规则引擎**：更复杂的使用条件（如满XX元可用）
4. **券包系统**：多张券组合使用
5. **积分兑换**：用户积分兑换优惠券
6. **优惠券模板**：快速创建常用类型的券

## 九、总结

本次升级完整实现了"公开促销券公开，定向券隔离"的需求：

1. **数据层**：添加 `isPublic`、`targetUserId`、`description` 字段
2. **业务层**：新增公开券查询、定向券查询、使用验证等函数
3. **接口层**：提供公开券列表、我的定向券等API
4. **安全性**：互斥验证、定向券权限校验、防薅羊毛机制
5. **可扩展**：支持优惠券中心、数据分析等未来功能

这套方案既满足了当前需求，也为未来的运营活动留下了充足的扩展空间。
