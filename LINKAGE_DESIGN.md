# 教育场景智能联动方案

## 📊 现状分析

### 当前模块
1. **指令市场 (Marketplace)** - 公共提示词模板分享平台
2. **教研场景库 (ScenarioBrowser)** - 三级场景分类管理（教育培训→K12教育→语文教学）
3. **学科分类 (Scenarios)** - 场景分类数据（已有32个分类，覆盖K12/高教/职培）
4. **场景导航** - 树形/卡片视图浏览场景
5. **提示词库 (Prompts)** - 个人提示词管理

### 数据关系
```
prompts 表
├── scenarioId → 关联到 scenarios (场景分类)
├── isPublic → 是否公开到市场
├── isTemplate → 是否为官方模板
└── templateCategory → 模板分类

scenarios 表 (三级结构)
├── Level 1: 教育培训、内容创作、营销推广...
│   ├── Level 2: K12教育、高等教育、职业培训...
│   │   └── Level 3: 语文教学、数学教学、英语教学...
```

---

## 🎯 核心联动设计

### 方案一：**场景驱动的智能推荐系统**

#### 1.1 场景导航 → 指令市场 (场景模板推荐)
**功能**：在场景导航页点击某个学科，自动推荐该场景下的优质模板

**实现路径**：
```
用户操作：ScenarioBrowser → 点击"语文教学"
系统响应：
  ├─ 显示该场景的统计信息（已有15个提示词）
  ├─ 推荐官方模板（来自Marketplace，筛选isTemplate=true + scenarioId=111）
  ├─ 推荐热门模板（来自Marketplace，按useCount排序）
  └─ 显示"创建新提示词"按钮（自动带上scenarioId）
```

**UI设计**：
```tsx
// ScenarioBrowser.tsx 增强
<ScenarioCard onClick={handleScenarioClick(scenario)}>
  <div className="flex justify-between">
    <h3>{scenario.name}</h3>
    <Badge>{getPromptCount(scenario.id)} 个提示词</Badge>
  </div>

  {/* 新增：模板推荐区 */}
  {expandedScenario === scenario.id && (
    <div className="mt-4 border-t pt-4">
      <h4>官方推荐模板</h4>
      <TemplateRecommendations scenarioId={scenario.id} />

      <div className="flex gap-2 mt-4">
        <Button onClick={() => navigateToMarketplace(scenario.id)}>
          浏览更多模板
        </Button>
        <Button onClick={() => createPromptWithScenario(scenario.id)}>
          创建新提示词
        </Button>
      </div>
    </div>
  )}
</ScenarioCard>
```

#### 1.2 提示词库 → 场景导航 (快速定位)
**功能**：在提示词列表中点击场景标签，跳转到场景导航定位到该场景

**实现**：
```tsx
// Prompts.tsx
<Badge
  className="cursor-pointer hover:bg-primary/20"
  onClick={() => navigateToScenario(prompt.scenarioId)}
>
  {getScenarioPath(prompt.scenarioId)} // 显示完整路径：教育培训 > K12教育 > 语文教学
</Badge>
```

#### 1.3 指令市场 → 学科分类筛选
**功能**：市场页面支持按三级学科分类筛选模板

**UI增强**：
```tsx
// Marketplace.tsx 新增筛选区
<div className="flex gap-4 mb-6">
  <Select value={level1Filter} onValueChange={setLevel1Filter}>
    <SelectTrigger className="w-48">
      <SelectValue placeholder="选择一级分类" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">全部行业</SelectItem>
      {level1Scenarios.map(s => (
        <SelectItem value={s.id.toString()}>{s.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* 联动的二级、三级筛选 */}
  {level1Filter !== "all" && (
    <Select value={level2Filter} onValueChange={setLevel2Filter}>
      <SelectValue placeholder="选择二级分类" />
      {/* ... */}
    </Select>
  )}
</div>

{/* 显示当前筛选路径 */}
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <FolderTree className="h-4 w-4" />
  <span>{getScenarioPath(level3Filter || level2Filter || level1Filter)}</span>
</div>
```

---

### 方案二：**教研工作流智能助手**

#### 2.1 场景导航 + AI生成 (一键生成教案模板)
**功能**：针对教育场景，提供"AI生成教案模板"功能

**场景示例**：
```
用户选择：教育培训 > K12教育 > 语文教学
点击："AI生成教案模板"

AI对话助手询问：
  - 年级：小学/初中/高中
  - 教材版本：人教版/苏教版...
  - 课文名称
  - 课时安排

生成结果：
  → 自动创建提示词，包含：
    - 教学目标设定
    - 重难点分析
    - 教学过程设计
    - 作业布置建议
  → 自动关联到 scenarioId=111 (语文教学)
  → 保存到提示词库
```

**实现代码**：
```tsx
// ScenarioBrowser.tsx 增强
const handleAIGenerate = async (scenario: Scenario) => {
  const conversation = await createConversationMutation.mutateAsync({
    scenarioId: scenario.id,
    scenarioName: scenario.name,
  });

  setAiConversationId(conversation.id);
  setAiChatDialogOpen(true);
};

<Button
  variant="outline"
  onClick={() => handleAIGenerate(scenario)}
>
  <Sparkles className="h-4 w-4 mr-2" />
  AI生成{scenario.name}模板
</Button>
```

#### 2.2 提示词库 → 场景分析报告
**功能**：分析用户在各个学科的提示词分布，生成教研报告

**报告内容**：
```
【教研场景分析报告】

一、场景覆盖度
  - 语文教学: 15个提示词 ✓ 完善
  - 数学教学: 3个提示词 ⚠️ 需补充
  - 英语教学: 0个提示词 ❌ 缺失

二、推荐行动
  1. 建议补充数学教学场景的提示词
     → 推荐模板：「小学数学应用题解析模板」
  2. 建议从市场导入英语教学模板
     → 查看英语教学热门模板

三、使用频率分析
  - 最常用：「作文批改助手」(使用35次)
  - 待优化：「古诗文鉴赏」(评分58/100)
```

**实现**：
```tsx
// Prompts.tsx 新增统计面板
<Card className="mb-6">
  <CardHeader>
    <div className="flex justify-between items-center">
      <CardTitle>场景分析报告</CardTitle>
      <Button variant="outline" onClick={generateReport}>
        <BarChart3 className="h-4 w-4 mr-2" />
        生成报告
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <ScenarioCoverageChart scenarios={scenarios} prompts={prompts} />
  </CardContent>
</Card>
```

---

### 方案三：**智能模板推荐引擎**

#### 3.1 基于场景的个性化推荐
**算法逻辑**：
```javascript
function recommendTemplates(userId, scenarioId) {
  // 1. 用户在该场景的历史行为
  const userHistory = getUserPromptsByScenario(userId, scenarioId);

  // 2. 找相似用户（同场景下活跃的教师）
  const similarUsers = findSimilarUsers(userId, scenarioId);

  // 3. 协同过滤推荐
  const recommendations = getPopularPromptsAmongSimilarUsers(similarUsers, scenarioId);

  // 4. 过滤用户已有的
  return recommendations.filter(r => !userHistory.includes(r.id));
}
```

**UI展示**：
```tsx
// Marketplace.tsx 新增推荐区
<section className="mb-8">
  <h2 className="text-xl font-bold mb-4">为您推荐</h2>
  <p className="text-sm text-muted-foreground mb-4">
    基于您在「语文教学」场景的使用，推荐以下模板
  </p>
  <div className="grid grid-cols-3 gap-4">
    {recommendations.map(template => (
      <RecommendedTemplateCard
        template={template}
        reason="同为语文教师的89%都在使用"
      />
    ))}
  </div>
</section>
```

#### 3.2 跨场景模板复用建议
**功能**：发现用户某个场景的优质提示词，建议复用到相关场景

**示例**：
```
您在「语文教学」创建的提示词「课文重难点分析助手」
评分高达92分，建议复用到：
  - 历史地理 (相似度85%)
  - 英语教学 (相似度78%)

[一键复制到其他场景]
```

---

### 方案四：**教研协作网络**

#### 4.1 场景社区（同学科教师交流）
**功能**：基于场景建立教师社区

**实现**：
```tsx
// ScenarioBrowser.tsx
<Tab value="community">
  <div className="space-y-4">
    <h3>{scenario.name} 社区</h3>

    {/* 社区统计 */}
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="教师人数" value="1,248" />
      <StatCard label="分享模板" value="357" />
      <StatCard label="讨论话题" value="89" />
    </div>

    {/* 最新分享 */}
    <h4>最新模板分享</h4>
    <CommunityTemplateList scenarioId={scenario.id} />

    {/* 热门讨论 */}
    <h4>热门讨论</h4>
    <DiscussionList scenarioId={scenario.id} />
  </div>
</Tab>
```

#### 4.2 场景徽章系统
**功能**：激励教师在各场景的贡献

**徽章设计**：
```
语文教学场景徽章
├─ 语文教学新手 (创建1个提示词)
├─ 语文教学专家 (创建10个提示词)
├─ 语文教学大师 (创建50个提示词 + 平均评分90+)
└─ 语文教学导师 (分享模板被导入100+次)
```

---

## 🚀 优先级建议

### 第一阶段（核心联动）- 1周
1. ✅ **场景导航 → 指令市场筛选**
   - Marketplace添加三级场景筛选器
   - 显示场景路径面包屑

2. ✅ **提示词库 → 场景快速定位**
   - 场景标签可点击跳转
   - 显示完整场景路径

3. ✅ **场景卡片增强**
   - 显示提示词数量统计
   - 显示官方模板推荐（3个）

### 第二阶段（智能推荐）- 2周
4. 📊 **场景分析报告**
   - 统计用户各场景覆盖度
   - 推荐补充建议

5. 🤖 **AI场景模板生成**
   - 针对教育场景的对话式模板生成
   - 自动关联场景ID

### 第三阶段（生态构建）- 1个月
6. 👥 **场景社区**
   - 基于场景的教师交流
   - 模板评分和评论

7. 🏆 **场景徽章系统**
   - 激励用户在各场景的贡献

---

## 📐 技术实现要点

### 1. 路由联动
```typescript
// 统一的场景导航函数
export function navigateToScenario(scenarioId: number) {
  // 计算场景路径
  const path = getScenarioPath(scenarioId);
  // 跳转到场景导航并展开对应节点
  setLocation(`/scenarios?highlight=${scenarioId}`);
}

export function navigateToMarketplaceByScenario(scenarioId: number) {
  setLocation(`/marketplace?scenario=${scenarioId}`);
}
```

### 2. 数据聚合查询
```typescript
// 场景统计信息
type ScenarioStats = {
  scenarioId: number;
  promptCount: number;          // 用户提示词数
  templateCount: number;         // 官方模板数
  communityPromptCount: number;  // 社区分享数
  avgScore: number;              // 平均评分
}
```

### 3. 推荐算法API
```typescript
// server/routers.ts
marketplace: router({
  recommendByScenario: protectedProcedure
    .input(z.object({ scenarioId: z.number() }))
    .query(async ({ ctx, input }) => {
      // 实现推荐逻辑
      return await recommendTemplates(ctx.user.id, input.scenarioId);
    }),
})
```

---

## 🎨 UI/UX 优化建议

### 1. 场景路径可视化
```tsx
// 面包屑导航
<div className="flex items-center gap-2 text-sm">
  <span className="text-muted-foreground">教育培训</span>
  <ChevronRight className="h-4 w-4" />
  <span className="text-muted-foreground">K12教育</span>
  <ChevronRight className="h-4 w-4" />
  <span className="font-medium">语文教学</span>
</div>
```

### 2. 场景卡片统一设计
```tsx
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <div className="flex justify-between">
      <h3>{scenario.name}</h3>
      <Badge variant="secondary">{stats.promptCount} 个提示词</Badge>
    </div>
  </CardHeader>
  <CardContent>
    {/* 官方模板预览 */}
    <div className="space-y-2">
      <h4 className="text-sm font-medium">推荐模板</h4>
      <TemplatePreviewList scenarioId={scenario.id} limit={3} />
    </div>
  </CardContent>
  <CardFooter className="flex gap-2">
    <Button variant="outline" onClick={() => viewAllTemplates(scenario.id)}>
      查看更多
    </Button>
    <Button onClick={() => createNew(scenario.id)}>
      创建新提示词
    </Button>
  </CardFooter>
</Card>
```

### 3. 智能提示
```tsx
// 创建提示词时的场景建议
{!selectedScenario && (
  <Alert>
    <Sparkles className="h-4 w-4" />
    <AlertTitle>建议选择场景分类</AlertTitle>
    <AlertDescription>
      选择合适的场景可以帮助您更好地组织和查找提示词
      <Button variant="link" onClick={openScenarioPicker}>
        选择场景
      </Button>
    </AlertDescription>
  </Alert>
)}
```

---

## 📈 预期效果

### 用户体验提升
- ✅ 提示词发现效率提升 **60%**（通过场景筛选）
- ✅ 模板复用率提升 **40%**（智能推荐）
- ✅ 新用户上手时间减少 **50%**（场景引导）

### 平台价值
- ✅ 用户留存率提升（场景归属感）
- ✅ 内容质量提升（场景专业化）
- ✅ 社区活跃度提升（场景社区）

---

这个方案怎么样？我建议先实施**第一阶段的核心联动**，快速验证效果后再逐步推进后续功能。您觉得哪些功能最符合您的需求？
