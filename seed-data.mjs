import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

console.log("开始插入模拟数据...");

// 获取当前用户ID (假设是第一个用户)
const [users] = await connection.execute("SELECT id FROM users LIMIT 1");
const userId = users[0]?.id || 1;

// 插入场景分类
const scenarios = [
  { name: "营销推广", level: 1, parentId: null },
  { name: "技术开发", level: 1, parentId: null },
  { name: "内容创作", level: 1, parentId: null },
];

console.log("插入场景分类...");
for (const scenario of scenarios) {
  await connection.execute(
    "INSERT INTO scenarios (name, level, parentId) VALUES (?, ?, ?)",
    [scenario.name, scenario.level, scenario.parentId]
  );
}

// 获取场景ID
const [scenarioRows] = await connection.execute("SELECT id, name FROM scenarios WHERE level = 1");
const marketingId = scenarioRows.find(s => s.name === "营销推广")?.id;

// 插入提示词
const prompts = [
  {
    title: "小红书爆款文案生成器",
    description: "专门用于生成小红书平台的高转化文案",
    content: "你是一位小红书爆款文案专家。请根据{{产品名称}}和{{目标人群}}生成一篇吸引人的小红书文案。要求:\n1. 标题要有吸引力,使用emoji\n2. 正文要真实接地气\n3. 结尾要有行动号召\n4. 字数控制在{{字数}}字以内",
    scenarioId: marketingId,
    variables: JSON.stringify([
      { name: "产品名称", type: "text", required: true },
      { name: "目标人群", type: "text", required: true },
      { name: "字数", type: "number", defaultValue: "500" }
    ]),
    score: 92,
    version: 3,
    userId
  },
  {
    title: "技术文档撰写助手",
    description: "帮助开发者快速生成规范的技术文档",
    content: "你是一位技术文档专家。请为{{项目名称}}编写{{文档类型}}。要求:\n1. 结构清晰,层次分明\n2. 包含代码示例\n3. 使用Markdown格式\n4. 面向{{目标读者}}",
    scenarioId: null,
    variables: JSON.stringify([
      { name: "项目名称", type: "text", required: true },
      { name: "文档类型", type: "select", options: ["API文档", "使用手册", "架构设计"], required: true },
      { name: "目标读者", type: "text", defaultValue: "开发者" }
    ]),
    score: 88,
    version: 2,
    userId
  },
  {
    title: "产品需求分析模板",
    description: "系统化分析产品需求的提示词模板",
    content: "作为产品经理,请对{{功能需求}}进行详细分析:\n1. 用户痛点\n2. 解决方案\n3. 功能优先级\n4. 技术可行性\n5. 商业价值",
    scenarioId: null,
    variables: JSON.stringify([
      { name: "功能需求", type: "textarea", required: true }
    ]),
    score: 85,
    version: 1,
    userId
  }
];

console.log("插入提示词...");
const promptIds = [];
for (const prompt of prompts) {
  const [result] = await connection.execute(
    "INSERT INTO prompts (title, description, content, scenarioId, variables, score, version, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
    [prompt.title, prompt.description, prompt.content, prompt.scenarioId, prompt.variables, prompt.score, prompt.version, prompt.userId]
  );
  promptIds.push(result.insertId);
}

// 插入工作流
const workflows = [
  {
    title: "内容创作自动化流程",
    description: "从主题研究到文章发布的完整流程",
    steps: JSON.stringify([
      { id: "1", name: "主题研究", type: "prompt", config: JSON.stringify({ promptId: promptIds[0] }) },
      { id: "2", name: "大纲生成", type: "prompt", config: JSON.stringify({ model: "gpt-4" }) },
      { id: "3", name: "内容撰写", type: "prompt", config: JSON.stringify({ temperature: "0.7" }) },
      { id: "4", name: "SEO优化", type: "prompt", config: JSON.stringify({}) }
    ]),
    platform: "custom",
    userId
  },
  {
    title: "Dify客服机器人工作流",
    description: "从Dify导入的智能客服工作流",
    steps: JSON.stringify([]),
    platform: "dify",
    externalUrl: "https://dify.ai/workflow/abc123",
    externalJson: JSON.stringify({
      nodes: [
        { id: "start", type: "start", data: {} },
        { id: "llm", type: "llm", data: { model: "gpt-4", prompt: "你是客服助手" } },
        { id: "end", type: "end", data: {} }
      ]
    }),
    userId
  }
];

console.log("插入工作流...");
const workflowIds = [];
for (const workflow of workflows) {
  const [result] = await connection.execute(
    "INSERT INTO workflows (title, description, steps, platform, externalUrl, externalJson, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
    [workflow.title, workflow.description, workflow.steps, workflow.platform, workflow.externalUrl || null, workflow.externalJson || null, workflow.userId]
  );
  workflowIds.push(result.insertId);
}

// 插入智能体
const agents = [
  {
    name: "营销文案助手",
    description: "专注于营销文案创作的AI助手",
    systemPrompt: "你是一位资深的营销文案专家,擅长创作吸引人的广告文案和社交媒体内容。",
    linkedPromptIds: JSON.stringify([promptIds[0]]),
    model: "gpt-4",
    temperature: "0.7",
    maxTokens: 2000,
    userId
  },
  {
    name: "技术顾问",
    description: "提供技术咨询和解决方案的AI助手",
    systemPrompt: "你是一位经验丰富的技术顾问,能够为各种技术问题提供专业建议。",
    linkedPromptIds: JSON.stringify([promptIds[1]]),
    model: "gpt-4",
    temperature: "0.3",
    maxTokens: 3000,
    userId
  }
];

console.log("插入智能体...");
for (const agent of agents) {
  await connection.execute(
    "INSERT INTO agents (name, description, systemPrompt, linkedPromptIds, model, temperature, maxTokens, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
    [agent.name, agent.description, agent.systemPrompt, agent.linkedPromptIds, agent.model, agent.temperature, agent.maxTokens, agent.userId]
  );
}

console.log("✅ 模拟数据插入完成!");
await connection.end();
