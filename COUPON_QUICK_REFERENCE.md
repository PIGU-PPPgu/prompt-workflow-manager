# 优惠券系统快速参考

## 修改文件清单

### 已修改的文件
1. `/drizzle/schema.ts` - 添加了 isPublic、targetUserId、description 字段
2. `/drizzle/0026_coupon_public_target.sql` - 数据库迁移SQL（新建）
3. `/server/db.ts` - 新增函数和更新导入
4. `/server/routers.ts` - 新增API接口和更新现有接口

## 三种优惠券类型

| 类型 | isPublic | targetUserId | 适用场景 |
|------|----------|--------------|----------|
| 公开促销券 | true | null | 节日促销、新人优惠 |
| 定向券 | false | 指定用户ID | VIP专属、客诉补偿 |
| 普通券 | false | null | 管理员手动创建，用户手动输入 |

## API 快速查询

### 公开接口（无需登录）
```typescript
// 获取公开优惠券列表
GET /api/trpc/coupons.public
```

### 用户接口（需要登录）
```typescript
// 获取我的定向优惠券
GET /api/trpc/coupons.myTargeted

// 验证优惠券（会检查定向权限）
GET /api/trpc/coupons.validate?code=XXX&tier=pro
```

### 管理员接口
```typescript
// 创建公开促销券
POST /api/trpc/coupons.create
{
  "code": "NEWYEAR2024",
  "discountType": "percentage",
  "discountValue": 20,
  "isPublic": true,
  "description": "新年8折优惠"
}

// 创建定向券
POST /api/trpc/coupons.create
{
  "code": "VIP-USER-123",
  "discountType": "fixed",
  "discountValue": 5000,
  "targetUserId": 123,
  "description": "专属优惠券"
}
```

## 数据库查询示例

```sql
-- 查询所有公开券
SELECT * FROM coupons
WHERE isPublic = 1
  AND isActive = 1
  AND targetUserId IS NULL
  AND (expiresAt IS NULL OR expiresAt > NOW());

-- 查询某用户的定向券
SELECT * FROM coupons
WHERE targetUserId = 123
  AND isActive = 1
  AND (expiresAt IS NULL OR expiresAt > NOW());

-- 统计券使用情况
SELECT
  c.code,
  c.isPublic,
  c.targetUserId,
  c.maxUses,
  c.usedCount,
  COUNT(cu.id) as actual_used
FROM coupons c
LEFT JOIN couponUsage cu ON c.id = cu.couponId
GROUP BY c.id;
```

## 常见问题

### Q1: 如何创建一张公开的新人券？
```typescript
await trpc.coupons.create.mutate({
  code: 'NEWUSER50',
  discountType: 'percentage',
  discountValue: 50,          // 5折
  isPublic: true,             // 公开
  description: '新用户专享5折',
  maxUses: 1000,              // 限量1000张
  expiresAt: new Date('2024-12-31'),
});
```

### Q2: 如何给VIP用户发定向券？
```typescript
await trpc.coupons.create.mutate({
  code: 'VIP-EXCLUSIVE-789',
  discountType: 'fixed',
  discountValue: 10000,       // 100元
  targetUserId: 789,          // 指定用户
  tier: 'pro',                // 仅限Pro版
  description: 'VIP专属续费优惠',
});
```

### Q3: 为什么公开券设置了 targetUserId 报错？
因为系统强制要求：公开券和定向券互斥。
- 公开券 = isPublic: true, targetUserId: null
- 定向券 = targetUserId: 指定ID (isPublic会被忽略或设为false)

### Q4: 如何防止用户重复使用同一张券？
系统已内置检查机制，但建议在使用券时调用：
```typescript
const hasUsed = await hasUserUsedCoupon(userId, couponId);
if (hasUsed) {
  throw new Error('您已使用过该优惠券');
}
```

## 部署清单

- [ ] 备份数据库
- [ ] 执行迁移 SQL: `drizzle/0026_coupon_public_target.sql`
- [ ] 验证字段已添加
- [ ] 验证索引已创建
- [ ] 重启应用服务
- [ ] 测试公开券接口
- [ ] 测试定向券接口
- [ ] 测试管理后台创建功能

## 监控指标

建议监控以下指标：
1. 公开券领取率 = 使用次数 / 浏览次数
2. 定向券使用率 = 使用次数 / 发放次数
3. 优惠券带来的GMV
4. 异常IP使用次数（防薅羊毛）
5. 单个用户24小时内使用券数量

## 安全提醒

1. 高价值券必须设置 maxUses 限制
2. 定向券不要暴露给其他用户
3. 定期检查异常使用行为
4. 优惠券码不要使用可预测的规则（如连续数字）
