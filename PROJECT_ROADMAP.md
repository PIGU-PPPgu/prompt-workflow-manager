# TeachPT 项目完善计划

> 教育行业提示词/智能体/工作流管理平台 - 功能完善路线图   

## 📋 项目定位确认

- **核心价值**：教育行业的提示词、智能体、工作流收集与管理
- **目标用户**：教师、教研组、教育机构
- **不做的事**：通用型提示词平台、过度UI美化、非教育场景功能

---

## 🎯 优先级分级标准

- **P0（必须做）**：影响安全、核心功能、用户体验关键问题
- **P1（应该做）**：提升效率、增强差异化、改善体验
- **P2（可以做）**：锦上添花、长期规划
- **❌（不做/移除）**：与定位不符、投入产出比低

---

## 🔴 P0 - 高优先级（1-2周完成）

### 1. 安全与稳定性 ⚠️

#### 1.1 API速率限制
- **问题**：AI优化接口可能被滥用，产生高额费用
- **方案**：
  ```typescript
  // 使用 express-rate-limit
  - 优化接口：10次/小时（免费）、100次/小时（订阅）
  - 导入接口：5次/小时
  - 分享接口：20次/小时
  ```
- **预计工时**：0.5天

#### 1.2 输入验证与安全
- **问题**：用户输入未全面验证，存在XSS/注入风险
- **方案**：
  - 所有API入口统一Zod校验
  - CSV/JSON导入做schema验证和大小限制（最大5MB）
  - 敏感字段（API Key、密码）做加密存储验证
  - AI生成内容过滤（教育行业敏感词黑名单）
- **预计工时**：1天

#### 1.3 审计日志
- **问题**：管理员操作无记录，难以追溯
- **方案**：
  - 记录操作：删除资源、升级订阅、修改权限、批量导入
  - 存储字段：userId, action, resourceType, resourceId, ip, timestamp, details
  - 管理员可查看日志列表
- **预计工时**：0.5天

### 2. 功能补齐 ✅

#### 2.1 TODO.md核心项完成
- [x] 多模型对比差异高亮显示（PromptOptimizer.tsx 272行）
  - 方案：使用diff算法标注差异部分，颜色区分
  - 工时：1天

- [x] 订阅管理完善
  - 到期提醒（邮件/站内信）
  - 续费入口优化
  - 订阅数据统计图表
  - 工时：1.5天

- [x] 移动端体验优化
  - 关键页面响应式修复：提示词列表、优化器、订阅页
  - 触摸交互优化
  - 工时：1天

#### 2.2 Stripe相关决策
- **决策点**：是否使用国际支付？
  - ✅ 如果用：补全配置、测试、文档（1天）
  - ❌ 如果不用：删除相关代码、依赖、路由（0.5天）
- **建议**：教育行业国内用户为主，建议删除Stripe，保留支付宝/微信

### 3. 提示词互动功能 ⭐ **[新增]**

#### 3.1 点赞、收藏、复制统计
- **数据库设计**：
  ```sql
  -- 新增字段到 prompts 表
  ALTER TABLE prompts ADD COLUMN likes INTEGER DEFAULT 0;
  ALTER TABLE prompts ADD COLUMN favorites INTEGER DEFAULT 0;
  ALTER TABLE prompts ADD COLUMN copies INTEGER DEFAULT 0;
  ALTER TABLE prompts ADD COLUMN views INTEGER DEFAULT 0;

  -- 用户互动记录表（防止重复点赞）
  CREATE TABLE prompt_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    promptId INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'like' | 'favorite' | 'copy' | 'view'
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, promptId, type)
  );
  ```

- **功能实现**：
  - 点赞：用户可点赞/取消点赞，显示点赞数
  - 收藏：收藏到"我的收藏"，方便快速访问
  - 复制统计：每次复制提示词内容时+1
  - 浏览统计：打开提示词详情时+1

- **UI展示**：
  - 提示词卡片底部显示：👍 123 | ⭐ 45 | 📋 67 | 👁️ 890
  - 我的收藏页面：展示所有收藏的提示词
  - 排行榜：按点赞数、收藏数、复制数排序

- **预计工时**：2天

### 4. 教育场景核心 🎓

#### 4.1 学科/年级分类体系
- **当前问题**：分类过于通用，不符合教育场景
- **方案**：
  ```typescript
  // 学段
  enum EducationLevel {
    PRIMARY = "小学",
    JUNIOR = "初中",
    SENIOR = "高中",
    COLLEGE = "大学"
  }

  // 学科
  enum Subject {
    CHINESE = "语文",
    MATH = "数学",
    ENGLISH = "英语",
    PHYSICS = "物理",
    // ... 更多学科
  }

  // 提示词增加字段
  - educationLevel?: EducationLevel
  - subject?: Subject
  ```
- **前端改动**：筛选器增加学段、学科双维度筛选
- **预计工时**：1.5天

#### 3.2 教学场景标签
- **方案**：
  ```typescript
  enum TeachingScenario {
    PREPARATION = "备课",      // 教案设计、课件制作
    TEACHING = "授课",          // 课堂互动、讲解
    HOMEWORK = "作业批改",      // 评语生成、错误分析
    ASSESSMENT = "学情分析",    // 成绩分析、报告生成
    COMMUNICATION = "家校沟通", // 家长会、通知
    RESEARCH = "教研活动"       // 集体备课、研讨
  }
  ```
- **应用场景**：筛选、推荐、统计
- **预计工时**：1天

---

## 🟡 P1 - 中优先级（3-4周完成）

### 4. 性能优化 ⚡

#### 4.1 前端性能
- **懒加载**：PromptOptimizer、Statistics、AdminUsers等大页面
  ```typescript
  const PromptOptimizer = lazy(() => import("@/pages/PromptOptimizer"));
  ```
- **列表虚拟化**：提示词列表超过100条时使用react-virtual
- **预计工时**：1天

#### 4.2 数据库优化
```sql
-- 高频查询索引
CREATE INDEX idx_prompts_user_scenario ON prompts(userId, scenarioId);
CREATE INDEX idx_prompts_public_time ON prompts(isPublic, createdAt);
CREATE INDEX idx_prompts_education ON prompts(educationLevel, subject);

-- 缓存策略
- 热门提示词（Redis，1小时）
- 分类树（内存，24小时）
- 用户订阅信息（Redis，30分钟）
```
- **预计工时**：0.5天

### 5. 教育特色增强 🎯

#### 5.1 提示词效果评估
- **功能**：
  - 教师反馈：效果评分（1-5星）+ 使用心得
  - 学生反馈：（可选）学生理解度、参与度
  - 统计展示：平均分、使用次数、反馈数
- **应用**：推荐算法、质量排序
- **预计工时**：2天

#### 5.2 教研组共享空间
- **功能**：
  - 创建教研组（邀请制/申请制）
  - 组内共享提示词库
  - 协作编辑（版本记录）
  - 组内讨论区
- **预计工时**：3天

#### 5.3 使用统计与排行
- **教师端**：
  - 我的使用统计：创建数、优化次数、分享数、收藏数
  - 我的提示词排行：浏览量、收藏量、评分
- **管理员端**：
  - 平台总览：用户活跃度、热门学科、高频场景
  - 提示词排行榜：Top50（按学科、场景）
- **预计工时**：2天

### 6. 用户体验提升 ✨

#### 6.1 批量操作
- **导入**：
  - 支持CSV模板批量导入提示词
  - 字段映射：标题、内容、分类、标签、学科、场景
  - 导入预览和错误提示
- **导出**：
  - 批量导出为CSV/JSON
  - 支持筛选条件导出
- **预计工时**：1.5天

#### 6.2 搜索优化
- **当前问题**：仅标题模糊搜索
- **改进**：
  - 全文搜索（标题+内容）
  - 高级筛选：学科+场景+标签组合
  - 搜索历史记录
  - 搜索建议（自动补全）
- **预计工时**：1.5天

---

## 🟢 P2 - 低优先级（长期规划）

### 7. 高级功能

#### 7.1 版本协作编辑
- **场景**：教研组协作完善提示词
- **功能**：类似Google Docs的版本历史、diff对比、回滚
- **预计工时**：5天

#### 7.2 教育平台集成
- **钉钉教育版**：机器人推送热门提示词、订阅提醒
- **企业微信教育版**：消息通知、快捷分享
- **预计工时**：3天

#### 7.3 多模态提示词
- **支持图片**：OCR识别课本/试卷，生成讲解提示词
- **支持语音**：语音转文字后生成提示词
- **预计工时**：5天

### 8. 运维增强

#### 8.1 监控告警
- 健康检查端点：`/api/health`
- 错误监控：Sentry
- 性能监控：响应时间、数据库慢查询
- **预计工时**：2天

#### 8.2 自动化运维
- 数据库自动备份（每日）
- 日志轮转和清理
- 定期生成数据报告
- **预计工时**：1天

---

## ❌ 不做/移除清单

### 明确不做的功能
1. **通用型AI功能**：非教育场景的提示词模板
2. **复杂UI组件库**：保持现有shadcn/ui即可
3. **社交功能**：点赞、关注、私信等（除非教研组需要）
4. **国际化**：暂不支持多语言（聚焦国内市场）
5. **移动App**：H5响应式即可，不开发原生

### 需要移除的残留代码
- [ ] Stripe相关（如果确定不用）：
  - `server/routes/stripe.ts`
  - `client/src/pages/Subscription.tsx` 中的Stripe部分
  - package.json中的stripe依赖
  - 数据库中的stripeCustomerId、stripeSubscriptionId字段
- [ ] 未使用的组件和依赖清理

---

## 📊 实施计划建议

### 第1-2周：P0安全与核心功能
```
Week 1:
- Day 1-2: API速率限制 + 输入验证
- Day 3: 审计日志
- Day 4-5: 学科/年级分类体系

Week 2:
- Day 1: 教学场景标签
- Day 2-3: 多模型对比差异高亮
- Day 4-5: 订阅管理完善
```

### 第3-4周：P1性能与体验
```
Week 3:
- Day 1: 前端懒加载 + 虚拟化
- Day 2: 数据库优化
- Day 3-4: 提示词效果评估
- Day 5: 批量导入导出

Week 4:
- Day 1-2: 教研组共享空间
- Day 3: 搜索优化
- Day 4: 移动端优化补充
- Day 5: 测试与Bug修复
```

### 第5周+：P2长期规划
- 根据用户反馈和使用数据，决定是否开发高级功能
- 建议先观察1-2个月，收集真实需求

---

## 🎯 关键指标（KPI）

完成后应达到的目标：

### 安全指标
- ✅ 所有API接口有速率限制
- ✅ 0个XSS/注入漏洞
- ✅ 100%敏感操作有审计日志

### 功能指标
- ✅ 支持12+学科分类
- ✅ 支持6+教学场景标签
- ✅ 提示词效果评分功能上线
- ✅ 教研组功能可用（至少1个测试组）

### 性能指标
- ✅ 首页加载时间 < 2秒
- ✅ 列表渲染1000条无卡顿
- ✅ 数据库查询 < 100ms（90%请求）

### 体验指标
- ✅ 移动端核心功能可用
- ✅ 批量导入成功率 > 95%
- ✅ 搜索准确率 > 90%

---

## 💡 建议的技术选型补充

```json
{
  "速率限制": "express-rate-limit",
  "缓存": "node-cache 或 Redis",
  "列表虚拟化": "@tanstack/react-virtual",
  "diff算法": "diff-match-patch",
  "错误监控": "Sentry（可选）",
  "数据导入导出": "papaparse（CSV）"
}
```

---

## ✅ 决策结果

已确认的实施决策：

- [x] **保留Stripe** - 支持国际用户订阅
- [x] **订阅功能启用** - 需要完善定价策略和订阅流程
- [x] **邮件通知启用** - 到期提醒、操作通知等（需配置SMTP）
- [x] **教研组优先级** - P2（低优先级，长期规划）
- [x] **提示词互动功能** - 收藏、复制统计、点赞（提至P0）
- [ ] 数据库迁移准备（新增字段需要migration）
- [ ] 定价策略确定（免费/基础/专业版）

## 🎯 新增需求

### App Store上线计划
- **目标平台**：iOS App Store
- **技术方案**：
  1. **PWA转原生**：使用Capacitor.js（推荐）或React Native
  2. **Xcode项目配置**：iOS原生壳 + WebView
  3. **App Store审核准备**：隐私政策、用户协议、截图、描述
- **预计额外工时**：5-7天（见下文详细方案）

---

---

## 📱 App Store上线详细方案

### 方案选择：Capacitor.js（推荐）

#### 为什么选择Capacitor？
- ✅ 官方支持React，无需重构现有代码
- ✅ 原生功能封装完善（推送、相机、文件等）
- ✅ 热更新支持（绕过App Store审核）
- ✅ 性能接近原生App
- ✅ 同时支持iOS和Android

#### 实施步骤

**Phase 1: Capacitor集成（2天）**
```bash
# 1. 安装Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init

# 2. 添加iOS平台
npx cap add ios

# 3. 构建并同步
npm run build
npx cap sync
npx cap open ios  # 打开Xcode项目
```

**Phase 2: iOS原生配置（1.5天）**
- 配置App图标和启动屏
- 设置Bundle ID（如：com.teachpt.app）
- 配置权限（相机、相册、网络等）
- 适配iOS安全区域（刘海屏、动态岛）
- 配置深链接（Deep Links）

**Phase 3: 功能适配（1.5天）**
```typescript
// 检测运行环境
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

// 原生分享
import { Share } from '@capacitor/share';
await Share.share({
  title: '提示词分享',
  text: content,
  url: shareUrl
});

// 原生剪贴板
import { Clipboard } from '@capacitor/clipboard';
await Clipboard.write({ string: content });

// 推送通知（订阅到期提醒）
import { PushNotifications } from '@capacitor/push-notifications';
```

**Phase 4: App Store准备（2天）**
- [ ] Apple Developer账号（$99/年）
- [ ] App隐私政策页面
- [ ] 用户协议页面
- [ ] App截图（6.7寸、6.5寸、5.5寸）
- [ ] App Store描述文案
- [ ] App预览视频（可选）
- [ ] 测试账号和演示数据

**Phase 5: 审核与发布（1天）**
- [ ] TestFlight内测
- [ ] 提交App Store审核
- [ ] 处理审核反馈
- [ ] 正式上线

#### 注意事项
1. **苹果审核重点**：
   - 必须有独立价值，不能只是网站套壳
   - 订阅功能必须使用IAP（In-App Purchase）
   - 不能有"Android版"等字样
   - 必须有隐私政策链接

2. **IAP vs Stripe**：
   - iOS内订阅必须走IAP（苹果抽成30%）
   - 可以保留Stripe用于网页版
   - 需要同步两套订阅系统

3. **版本管理**：
   - Web版本：v1.0.0
   - iOS版本：v1.0.0 (Build 1)
   - 保持功能同步

---

## 🔍 代码审查Checkpoint机制

### 审查频率和时机

**Checkpoint 1: P0核心功能完成后**
- 时间节点：完成安全基础 + 互动功能 + 教育分类（约5-7天后）
- 审查重点：
  - 数据库设计合理性（新增表和字段）
  - API安全性（速率限制、输入验证）
  - 代码架构（是否符合最佳实践）
- 提交给Codex的内容：
  - 数据库schema变更
  - 新增的API路由和Controller
  - 关键业务逻辑代码

**Checkpoint 2: P0全部完成后**
- 时间节点：完成订阅管理 + 邮件通知 + Stripe（约10-12天后）
- 审查重点：
  - 订阅流程完整性
  - 支付安全性
  - 邮件模板和通知逻辑
- 提交给Codex的内容：
  - Stripe集成代码
  - 邮件服务实现
  - 订阅状态管理逻辑

**Checkpoint 3: P1性能优化后**
- 时间节点：完成前端优化 + 数据库优化（约18-20天后）
- 审查重点：
  - 性能瓶颈识别
  - 缓存策略
  - 查询优化
- 提交给Codex的内容：
  - 性能测试报告
  - 优化前后对比数据
  - 关键路径代码

**Checkpoint 4: App Store上线前**
- 时间节点：Capacitor集成完成后（约25-27天后）
- 审查重点：
  - iOS适配完整性
  - 原生功能集成
  - 审核合规性
- 提交给Codex的内容：
  - Xcode项目配置
  - Capacitor插件使用
  - App Store资料

### 审查模板

每次提交给Codex时，使用以下格式：

```markdown
# 代码审查请求 - Checkpoint X

## 本次变更概述
[简述完成了哪些功能，大约X天工作量]

## 关键文件清单
- server/db/schema.ts - 数据库schema变更
- server/routes/prompts.ts - 提示词互动API
- client/src/components/PromptCard.tsx - 互动UI组件

## 重点审查问题
1. 数据库设计是否合理？是否有冗余或性能隐患？
2. API安全性如何？速率限制是否足够？
3. 代码架构是否符合最佳实践？

## 自查发现的问题
[列出你已经发现但还没解决的问题]

## 需要Codex建议的点
[具体问题，如："订阅到期后是否应该自动降级到免费版？"]
```

---

## 📅 更新后的实施计划

### 第1-2周：P0核心功能（含互动功能）
```
Week 1:
- Day 1-2: API速率限制 + 输入验证 + 审计日志
- Day 3-4: 提示词互动功能（点赞、收藏、复制统计）
- Day 5: 学科/年级分类体系

💡 Checkpoint 1: 提交代码给Codex审查

Week 2:
- Day 1: 教学场景标签
- Day 2-3: 订阅管理完善（Stripe集成）
- Day 4: 邮件通知配置和模板
- Day 5: 移动端优化 + Bug修复

💡 Checkpoint 2: 提交代码给Codex审查
```

### 第3-4周：P1性能与体验
```
Week 3:
- Day 1: 前端懒加载 + 虚拟化
- Day 2: 数据库优化 + 缓存
- Day 3-4: 提示词效果评估功能
- Day 5: 批量导入导出

💡 Checkpoint 3: 提交性能数据给Codex审查

Week 4:
- Day 1-2: 搜索优化
- Day 3: 使用统计和排行榜
- Day 4: 教研组基础功能（降级到P2，仅保留数据表设计）
- Day 5: 测试与Bug修复
```

### 第5周：App Store准备
```
Week 5:
- Day 1-2: Capacitor集成 + iOS配置
- Day 3: 功能适配（分享、剪贴板等）
- Day 4: App Store资料准备
- Day 5: TestFlight内测

💡 Checkpoint 4: 提交iOS代码给Codex审查
```

### 第6周+：发布与优化
```
Week 6:
- Day 1-2: 处理TestFlight反馈
- Day 3: 提交App Store审核
- Day 4-5: 等待审核期间优化Web版
```

---

## 📝 总结

**核心理念**：聚焦教育场景，强化安全与核心功能，准备iOS上线

**实施顺序**：安全稳定 → 互动功能 → 教育特色 → 性能体验 → App上线

**资源投入**：
- P0约2-2.5人周（含互动功能）
- P1约2人周
- App Store准备约1人周
- **总计约5-6周**

**审查机制**：每完成一个阶段提交给Codex审查，确保代码质量和架构合理性

**成功标准**：
1. 教师用户能高效管理和分享教育提示词
2. 平台安全稳定运行，支持订阅付费
3. 互动功能活跃（点赞、收藏、复制）
4. 成功通过App Store审核并上线
