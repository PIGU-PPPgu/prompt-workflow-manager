/**
 * seed-scenarios-education-v3.mjs
 * 教育场景分类 v3：优化结构，避免冗余
 *
 * 结构：大类 → 学科/领域 → 教学环节
 * - 一级：学科教学、班级管理、教研发展、通用技能
 * - 二级：具体学科（语文、数学等）或领域（内容创作等）
 * - 三级：21个教学环节（仅学科教学类使用）
 *
 * ID 规则：
 * - 一级：1-99
 * - 二级：一级ID * 100 + 序号
 * - 三级：二级ID * 100 + 序号
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { scenarios as scenariosTable } from "./drizzle/schema.ts";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

// ========== 教学环节模板（仅用于学科教学类） ==========
const teachingSteps = [
  { seq: 1, name: '教案设计', description: '确定教学目标、重难点与评价标准', icon: '📝' },
  { seq: 2, name: '备课资源', description: '筛选教材、案例、视频与素材', icon: '📚' },
  { seq: 3, name: '课件制作', description: 'PPT/交互课件/板书设计', icon: '🎨' },
  { seq: 4, name: '课堂互动', description: '提问、讨论、探究、合作学习', icon: '💬' },
  { seq: 5, name: '分层教学', description: '分组、分层任务与个性化路径', icon: '📊' },
  { seq: 6, name: '课堂管理', description: '课堂秩序、行为规范、节奏控制', icon: '⏱️' },
  { seq: 7, name: '作业设计', description: '分层作业、实践作业与探究任务', icon: '✍️' },
  { seq: 8, name: '作业批改', description: '批阅、讲评与错误分析', icon: '✅' },
  { seq: 9, name: '辅导答疑', description: '课后辅导、在线答疑', icon: '🤝' },
  { seq: 10, name: '试卷命题', description: '测试卷命制与质检', icon: '📄' },
  { seq: 11, name: '考务管理', description: '排考、监考、巡考流程', icon: '🏫' },
  { seq: 12, name: '成绩分析', description: '数据分析与改进建议', icon: '📈' },
];

// ========== 一级分类：大类 ==========
const topCategories = [
  {
    id: 1,
    name: '学科教学',
    description: '各学科的教学设计、课堂组织与评价反馈',
    icon: '📖',
    sortOrder: 1,
  },
  {
    id: 2,
    name: '班级管理',
    description: '班主任工作、学生管理与家校沟通',
    icon: '👥',
    sortOrder: 2,
  },
  {
    id: 3,
    name: '教研发展',
    description: '听评课、教学反思、课题研究与专业成长',
    icon: '🔬',
    sortOrder: 3,
  },
  {
    id: 4,
    name: '通用技能',
    description: '跨学科的内容创作、数据分析与效率工具',
    icon: '🛠️',
    sortOrder: 4,
  },
];

// ========== 二级分类：具体学科/领域 ==========
const subCategories = [
  // 1. 学科教学（id: 1xx）
  { parentId: 1, seq: 1, name: '语文', description: '阅读、写作、口语交际与文化素养', icon: '📚', hasSteps: true },
  { parentId: 1, seq: 2, name: '数学', description: '数与代数、图形几何、统计概率', icon: '🔢', hasSteps: true },
  { parentId: 1, seq: 3, name: '英语', description: '听说读写与跨文化交际', icon: '🌍', hasSteps: true },
  { parentId: 1, seq: 4, name: '物理', description: '力学、电磁学、光学与实验探究', icon: '⚛️', hasSteps: true },
  { parentId: 1, seq: 5, name: '化学', description: '物质结构、化学反应与实验操作', icon: '🧪', hasSteps: true },
  { parentId: 1, seq: 6, name: '生物', description: '生命科学、生态环境与实验观察', icon: '🌱', hasSteps: true },
  { parentId: 1, seq: 7, name: '历史', description: '中外历史、史料分析与时空观念', icon: '📜', hasSteps: true },
  { parentId: 1, seq: 8, name: '地理', description: '自然地理、人文地理与区域认知', icon: '🗺️', hasSteps: true },
  { parentId: 1, seq: 9, name: '政治/道德与法治', description: '思想政治、公民素养与法治教育', icon: '⚖️', hasSteps: true },
  { parentId: 1, seq: 10, name: '体育与健康', description: '运动技能、体能训练与健康教育', icon: '⚽', hasSteps: true },
  { parentId: 1, seq: 11, name: '音乐', description: '音乐欣赏、声乐器乐与创作表演', icon: '🎵', hasSteps: true },
  { parentId: 1, seq: 12, name: '美术', description: '绘画、设计、鉴赏与创意表达', icon: '🎨', hasSteps: true },
  { parentId: 1, seq: 13, name: '信息技术/人工智能', description: '编程、数据处理与AI应用', icon: '💻', hasSteps: true },
  { parentId: 1, seq: 14, name: '综合实践', description: '项目学习、社会调查与跨学科整合', icon: '🔍', hasSteps: true },
  { parentId: 1, seq: 15, name: '劳动教育', description: '生活技能、生产劳动与服务性劳动', icon: '🔨', hasSteps: true },
  { parentId: 1, seq: 16, name: '心理健康', description: '心理辅导、情绪管理与生涯规划', icon: '🧠', hasSteps: true },
  { parentId: 1, seq: 17, name: '幼儿教育', description: '游戏化学习、保教结合与主题活动', icon: '🧸', hasSteps: true },
  { parentId: 1, seq: 18, name: '职业技能', description: '专业技能、实训实习与就业指导', icon: '👔', hasSteps: true },

  // 2. 班级管理（id: 2xx）
  { parentId: 2, seq: 1, name: '班级建设', description: '班级文化、制度建设与集体活动', icon: '🏛️', hasSteps: false },
  { parentId: 2, seq: 2, name: '学生管理', description: '学籍管理、成长记录与个案跟踪', icon: '📋', hasSteps: false },
  { parentId: 2, seq: 3, name: '家校沟通', description: '家长会、家访与沟通技巧', icon: '📞', hasSteps: false },
  { parentId: 2, seq: 4, name: '德育工作', description: '品德教育、行为习惯培养', icon: '🌟', hasSteps: false },
  { parentId: 2, seq: 5, name: '心理预警', description: '心理健康筛查与危机干预', icon: '⚠️', hasSteps: false },

  // 3. 教研发展（id: 3xx）
  { parentId: 3, seq: 1, name: '听评课', description: '课堂观摩、评价量表与反馈', icon: '👀', hasSteps: false },
  { parentId: 3, seq: 2, name: '教学反思', description: '课后反思、改进计划与打磨', icon: '💭', hasSteps: false },
  { parentId: 3, seq: 3, name: '课题研究', description: '教研立项、实验与成果整理', icon: '📑', hasSteps: false },
  { parentId: 3, seq: 4, name: '专业发展', description: '培训学习、职称评审与成长规划', icon: '📈', hasSteps: false },
  { parentId: 3, seq: 5, name: '课程建设', description: '课程标准、校本课程与资源库', icon: '🏗️', hasSteps: false },

  // 4. 通用技能（id: 4xx）
  { parentId: 4, seq: 1, name: '内容创作', description: '文章撰写、视频制作与多媒体设计', icon: '✨', hasSteps: false },
  { parentId: 4, seq: 2, name: '数据分析', description: '教学数据分析、可视化与报告', icon: '📊', hasSteps: false },
  { parentId: 4, seq: 3, name: '效率工具', description: '时间管理、任务规划与协作工具', icon: '⚡', hasSteps: false },
  { parentId: 4, seq: 4, name: '技术应用', description: '教育技术、数字化工具与平台使用', icon: '🔧', hasSteps: false },
];

// ========== 生成完整分类列表 ==========
const scenarios = [];

// 添加一级分类
topCategories.forEach(cat => {
  scenarios.push({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    level: 1,
    parentId: null,
    icon: cat.icon,
    sortOrder: cat.sortOrder,
  });
});

// 添加二级分类和三级教学环节
subCategories.forEach(sub => {
  const subId = sub.parentId * 100 + sub.seq;
  scenarios.push({
    id: subId,
    name: sub.name,
    description: sub.description,
    level: 2,
    parentId: sub.parentId,
    icon: sub.icon,
    sortOrder: sub.seq,
  });

  // 仅学科教学类（parentId === 1）添加教学环节
  if (sub.hasSteps) {
    teachingSteps.forEach(step => {
      scenarios.push({
        id: subId * 100 + step.seq,
        name: step.name,
        description: step.description,
        level: 3,
        parentId: subId,
        icon: step.icon,
        sortOrder: step.seq,
      });
    });
  }
});

// ========== 执行数据库导入 ==========
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log("清空现有场景数据...");
await db.execute(sql`DELETE FROM ${scenariosTable}`);

console.log("\n开始插入教育场景分类数据 v3...");
console.log(`共 ${scenarios.length} 个分类\n`);

for (const scenario of scenarios) {
  await db.insert(scenariosTable).values({
    ...scenario,
    isCustom: false,
    userId: null,
  });
  const indent = "  ".repeat(scenario.level - 1);
  console.log(`${indent}✓ ${scenario.icon} ${scenario.name} (Level ${scenario.level}, ID: ${scenario.id})`);
}

console.log("\n✅ 教育场景分类数据 v3 插入完成!");
console.log(`   一级分类: ${scenarios.filter(s => s.level === 1).length} 个`);
console.log(`   二级分类: ${scenarios.filter(s => s.level === 2).length} 个`);
console.log(`   三级分类: ${scenarios.filter(s => s.level === 3).length} 个`);
console.log(`   总计: ${scenarios.length} 个分类`);

await connection.end();
