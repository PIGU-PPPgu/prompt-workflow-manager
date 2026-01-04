import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { scenarios } from "./drizzle/schema.ts";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// 先清空现有数据
console.log("清空现有场景数据...");
await db.execute(sql`DELETE FROM ${scenarios}`);

const scenariosData = [
  // ========== 教育培训 ==========
  // Level 1
  { id: 1, name: "教育培训", description: "教学、培训、知识传播", level: 1, parentId: null, icon: "", sortOrder: 6 },

  // Level 2
  { id: 11, name: "K12教育", description: "小学到高中教育", level: 2, parentId: 1, icon: "", sortOrder: 1 },
  { id: 12, name: "高等教育", description: "大学及研究生教育", level: 2, parentId: 1, icon: "", sortOrder: 2 },
  { id: 13, name: "职业培训", description: "职业技能培训", level: 2, parentId: 1, icon: "", sortOrder: 3 },
  { id: 14, name: "兴趣爱好", description: "兴趣班、素质教育", level: 2, parentId: 1, icon: "", sortOrder: 4 },

  // Level 3 - K12教育
  { id: 111, name: "语文教学", description: "语文课程设计与教学", level: 3, parentId: 11, icon: "", sortOrder: 1 },
  { id: 112, name: "数学教学", description: "数学课程设计与教学", level: 3, parentId: 11, icon: "", sortOrder: 2 },
  { id: 113, name: "英语教学", description: "英语课程设计与教学", level: 3, parentId: 11, icon: "", sortOrder: 3 },
  { id: 114, name: "科学教学", description: "物理化学生物教学", level: 3, parentId: 11, icon: "", sortOrder: 4 },
  { id: 115, name: "历史地理", description: "历史地理教学", level: 3, parentId: 11, icon: "", sortOrder: 5 },

  // Level 3 - 高等教育
  { id: 121, name: "课程设计", description: "大学课程设计", level: 3, parentId: 12, icon: "", sortOrder: 1 },
  { id: 122, name: "科研指导", description: "学术研究指导", level: 3, parentId: 12, icon: "", sortOrder: 2 },
  { id: 123, name: "论文写作", description: "学术论文指导", level: 3, parentId: 12, icon: "", sortOrder: 3 },

  // Level 3 - 职业培训
  { id: 131, name: "编程培训", description: "编程技能培训", level: 3, parentId: 13, icon: "", sortOrder: 1 },
  { id: 132, name: "设计培训", description: "设计技能培训", level: 3, parentId: 13, icon: "", sortOrder: 2 },
  { id: 133, name: "营销培训", description: "市场营销培训", level: 3, parentId: 13, icon: "", sortOrder: 3 },

  // ========== 内容创作 ==========
  // Level 1
  { id: 2, name: "内容创作", description: "文字、视频、音频创作", level: 1, parentId: null, icon: "", sortOrder: 3 },

  // Level 2
  { id: 21, name: "文章写作", description: "博客、新闻、专栏写作", level: 2, parentId: 2, icon: "", sortOrder: 1 },
  { id: 22, name: "视频制作", description: "视频策划与制作", level: 2, parentId: 2, icon: "", sortOrder: 2 },
  { id: 23, name: "社交媒体", description: "社交媒体内容创作", level: 2, parentId: 2, icon: "", sortOrder: 3 },

  // Level 3 - 文章写作
  { id: 211, name: "博客文章", description: "个人博客写作", level: 3, parentId: 21, icon: "", sortOrder: 1 },
  { id: 212, name: "技术文档", description: "技术文档编写", level: 3, parentId: 21, icon: "", sortOrder: 2 },
  { id: 213, name: "新闻稿", description: "新闻稿撰写", level: 3, parentId: 21, icon: "", sortOrder: 3 },

  // ========== 营销推广 ==========
  // Level 1
  { id: 3, name: "营销推广", description: "市场营销、品牌推广", level: 1, parentId: null, icon: "", sortOrder: 1 },

  // Level 2
  { id: 31, name: "品牌营销", description: "品牌建设与推广", level: 2, parentId: 3, icon: "", sortOrder: 1 },
  { id: 32, name: "广告文案", description: "广告创意与文案", level: 2, parentId: 3, icon: "", sortOrder: 2 },

  // ========== 技术开发 ==========
  // Level 1
  { id: 4, name: "技术开发", description: "软件开发、编程", level: 1, parentId: null, icon: "", sortOrder: 2 },

  // Level 2
  { id: 41, name: "前端开发", description: "Web前端开发", level: 2, parentId: 4, icon: "", sortOrder: 1 },
  { id: 42, name: "后端开发", description: "服务端开发", level: 2, parentId: 4, icon: "", sortOrder: 2 },

  // ========== 数据分析 ==========
  // Level 1
  { id: 5, name: "数据分析", description: "数据处理、分析、可视化", level: 1, parentId: null, icon: "", sortOrder: 5 },

  // Level 2
  { id: 51, name: "数据清洗", description: "数据预处理", level: 2, parentId: 5, icon: "", sortOrder: 1 },
  { id: 52, name: "数据可视化", description: "图表制作", level: 2, parentId: 5, icon: "", sortOrder: 2 },
];

console.log("开始插入场景分类数据...");

for (const scenario of scenariosData) {
  await db.insert(scenarios).values({
    ...scenario,
    isCustom: false,
    userId: null,
  });
  const indent = "  ".repeat(scenario.level - 1);
  console.log(`${indent}✓ ${scenario.name} (Level ${scenario.level})`);
}

console.log("\n✅ 场景分类数据插入完成!");
console.log(`   共插入 ${scenariosData.length} 个场景分类`);
await connection.end();
