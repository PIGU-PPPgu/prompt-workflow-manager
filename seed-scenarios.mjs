import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { scenarios } from "./drizzle/schema.ts";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const scenariosData = [
  // Level 1: 主行业
  { name: "营销推广", description: "市场营销、品牌推广相关场景", level: 1, parentId: null },
  { name: "技术开发", description: "软件开发、编程相关场景", level: 1, parentId: null },
  { name: "内容创作", description: "文字、视频、音频创作场景", level: 1, parentId: null },
  { name: "设计创意", description: "UI设计、平面设计、创意设计", level: 1, parentId: null },
  { name: "数据分析", description: "数据处理、分析、可视化", level: 1, parentId: null },
  { name: "教育培训", description: "教学、培训、知识传播", level: 1, parentId: null },
  { name: "客户服务", description: "客户支持、售后服务", level: 1, parentId: null },
  { name: "项目管理", description: "项目规划、执行、监控", level: 1, parentId: null },
];

console.log("开始插入场景分类数据...");

for (const scenario of scenariosData) {
  await db.insert(scenarios).values({
    ...scenario,
    isCustom: false,
    userId: null,
  });
  console.log(`✓ 已插入: ${scenario.name}`);
}

console.log("\n场景分类数据插入完成!");
await connection.end();
