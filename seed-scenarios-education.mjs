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
  // ========== 一、按学段分类 ==========

  // 1. 学前教育
  { id: 1, name: "学前教育", description: "幼儿园、托育机构", level: 1, parentId: null, icon: "", sortOrder: 1 },
  { id: 11, name: "小班教学", description: "3-4岁幼儿教学", level: 2, parentId: 1, icon: "", sortOrder: 1 },
  { id: 12, name: "中班教学", description: "4-5岁幼儿教学", level: 2, parentId: 1, icon: "", sortOrder: 2 },
  { id: 13, name: "大班教学", description: "5-6岁幼儿教学", level: 2, parentId: 1, icon: "", sortOrder: 3 },
  { id: 14, name: "幼小衔接", description: "幼儿园到小学过渡", level: 2, parentId: 1, icon: "", sortOrder: 4 },

  // 2. 小学教育
  { id: 2, name: "小学教育", description: "小学1-6年级", level: 1, parentId: null, icon: "", sortOrder: 2 },
  { id: 21, name: "低年级", description: "1-2年级教学", level: 2, parentId: 2, icon: "", sortOrder: 1 },
  { id: 22, name: "中年级", description: "3-4年级教学", level: 2, parentId: 2, icon: "", sortOrder: 2 },
  { id: 23, name: "高年级", description: "5-6年级教学", level: 2, parentId: 2, icon: "", sortOrder: 3 },

  // 小学学科（三级分类）
  { id: 211, name: "语文", level: 3, parentId: 21, icon: "", sortOrder: 1 },
  { id: 212, name: "数学", level: 3, parentId: 21, icon: "", sortOrder: 2 },
  { id: 213, name: "英语", level: 3, parentId: 21, icon: "", sortOrder: 3 },
  { id: 214, name: "道德与法治", level: 3, parentId: 21, icon: "", sortOrder: 4 },
  { id: 215, name: "科学", level: 3, parentId: 21, icon: "", sortOrder: 5 },
  { id: 216, name: "音乐", level: 3, parentId: 21, icon: "", sortOrder: 6 },
  { id: 217, name: "美术", level: 3, parentId: 21, icon: "", sortOrder: 7 },
  { id: 218, name: "体育", level: 3, parentId: 21, icon: "", sortOrder: 8 },
  { id: 219, name: "信息技术", level: 3, parentId: 21, icon: "", sortOrder: 9 },

  // 3. 初中教育
  { id: 3, name: "初中教育", description: "初中7-9年级", level: 1, parentId: null, icon: "", sortOrder: 3 },
  { id: 31, name: "初一年级", description: "七年级教学", level: 2, parentId: 3, icon: "", sortOrder: 1 },
  { id: 32, name: "初二年级", description: "八年级教学", level: 2, parentId: 3, icon: "", sortOrder: 2 },
  { id: 33, name: "初三年级", description: "九年级教学（含中考）", level: 2, parentId: 3, icon: "", sortOrder: 3 },

  // 初中学科（三级分类）
  { id: 311, name: "语文", level: 3, parentId: 31, icon: "", sortOrder: 1 },
  { id: 312, name: "数学", level: 3, parentId: 31, icon: "", sortOrder: 2 },
  { id: 313, name: "英语", level: 3, parentId: 31, icon: "", sortOrder: 3 },
  { id: 314, name: "物理", level: 3, parentId: 31, icon: "", sortOrder: 4 },
  { id: 315, name: "化学", level: 3, parentId: 31, icon: "", sortOrder: 5 },
  { id: 316, name: "生物", level: 3, parentId: 31, icon: "", sortOrder: 6 },
  { id: 317, name: "历史", level: 3, parentId: 31, icon: "", sortOrder: 7 },
  { id: 318, name: "地理", level: 3, parentId: 31, icon: "", sortOrder: 8 },
  { id: 319, name: "道德与法治", level: 3, parentId: 31, icon: "", sortOrder: 9 },
  { id: 320, name: "体育", level: 3, parentId: 31, icon: "", sortOrder: 10 },
  { id: 321, name: "音乐", level: 3, parentId: 31, icon: "", sortOrder: 11 },
  { id: 322, name: "美术", level: 3, parentId: 31, icon: "", sortOrder: 12 },
  { id: 323, name: "信息技术", level: 3, parentId: 31, icon: "", sortOrder: 13 },

  // 4. 高中教育
  { id: 4, name: "高中教育", description: "高中10-12年级", level: 1, parentId: null, icon: "", sortOrder: 4 },
  { id: 41, name: "高一年级", description: "高一年级教学", level: 2, parentId: 4, icon: "", sortOrder: 1 },
  { id: 42, name: "高二年级", description: "高二年级教学（含选科）", level: 2, parentId: 4, icon: "", sortOrder: 2 },
  { id: 43, name: "高三年级", description: "高三年级教学（含高考）", level: 2, parentId: 4, icon: "", sortOrder: 3 },

  // 高中学科（三级分类）
  { id: 411, name: "语文", level: 3, parentId: 41, icon: "", sortOrder: 1 },
  { id: 412, name: "数学", level: 3, parentId: 41, icon: "", sortOrder: 2 },
  { id: 413, name: "英语", level: 3, parentId: 41, icon: "", sortOrder: 3 },
  { id: 414, name: "物理", level: 3, parentId: 41, icon: "", sortOrder: 4 },
  { id: 415, name: "化学", level: 3, parentId: 41, icon: "", sortOrder: 5 },
  { id: 416, name: "生物", level: 3, parentId: 41, icon: "", sortOrder: 6 },
  { id: 417, name: "历史", level: 3, parentId: 41, icon: "", sortOrder: 7 },
  { id: 418, name: "地理", level: 3, parentId: 41, icon: "", sortOrder: 8 },
  { id: 419, name: "政治", level: 3, parentId: 41, icon: "", sortOrder: 9 },
  { id: 420, name: "技术（通用/信息）", level: 3, parentId: 41, icon: "", sortOrder: 10 },
  { id: 421, name: "体育", level: 3, parentId: 41, icon: "", sortOrder: 11 },
  { id: 422, name: "音乐", level: 3, parentId: 41, icon: "", sortOrder: 12 },
  { id: 423, name: "美术", level: 3, parentId: 41, icon: "", sortOrder: 13 },

  // 5. 高等教育
  { id: 5, name: "高等教育", description: "大学及研究生教育", level: 1, parentId: null, icon: "", sortOrder: 5 },
  { id: 51, name: "本科教育", description: "本科课程教学", level: 2, parentId: 5, icon: "", sortOrder: 1 },
  { id: 52, name: "研究生教育", description: "硕士/博士研究生教育", level: 2, parentId: 5, icon: "", sortOrder: 2 },
  { id: 53, name: "学术研究", description: "科研项目、论文指导", level: 2, parentId: 5, icon: "", sortOrder: 3 },

  // 高等教育三级分类
  { id: 511, name: "通识课程", level: 3, parentId: 51, icon: "", sortOrder: 1 },
  { id: 512, name: "专业课程", level: 3, parentId: 51, icon: "", sortOrder: 2 },
  { id: 513, name: "实践课程", level: 3, parentId: 51, icon: "", sortOrder: 3 },
  { id: 521, name: "论文指导", level: 3, parentId: 52, icon: "", sortOrder: 1 },
  { id: 522, name: "开题答辩", level: 3, parentId: 52, icon: "", sortOrder: 2 },
  { id: 531, name: "课题申报", level: 3, parentId: 53, icon: "", sortOrder: 1 },
  { id: 532, name: "学术写作", level: 3, parentId: 53, icon: "", sortOrder: 2 },

  // 6. 职业培训
  { id: 6, name: "职业培训", description: "职业技能培训", level: 1, parentId: null, icon: "", sortOrder: 6 },
  { id: 61, name: "技能培训", description: "职业技能培训", level: 2, parentId: 6, icon: "", sortOrder: 1 },
  { id: 62, name: "资格考试", description: "职业资格考试培训", level: 2, parentId: 6, icon: "", sortOrder: 2 },
  { id: 63, name: "企业内训", description: "企业员工培训", level: 2, parentId: 6, icon: "", sortOrder: 3 },

  { id: 611, name: "编程开发", level: 3, parentId: 61, icon: "", sortOrder: 1 },
  { id: 612, name: "设计创意", level: 3, parentId: 61, icon: "", sortOrder: 2 },
  { id: 613, name: "办公软件", level: 3, parentId: 61, icon: "", sortOrder: 3 },
  { id: 614, name: "语言培训", level: 3, parentId: 61, icon: "", sortOrder: 4 },

  // ========== 二、按教学场景分类 ==========

  // 7. 教学设计
  { id: 7, name: "教学设计", description: "课程设计、教案制作", level: 1, parentId: null, icon: "", sortOrder: 7 },
  { id: 71, name: "教案设计", description: "课堂教学教案", level: 2, parentId: 7, icon: "", sortOrder: 1 },
  { id: 72, name: "课件制作", description: "PPT、多媒体课件", level: 2, parentId: 7, icon: "", sortOrder: 2 },
  { id: 73, name: "活动设计", description: "课堂活动、游戏设计", level: 2, parentId: 7, icon: "", sortOrder: 3 },
  { id: 74, name: "项目式学习", description: "PBL项目设计", level: 2, parentId: 7, icon: "", sortOrder: 4 },

  { id: 711, name: "导入环节", level: 3, parentId: 71, icon: "", sortOrder: 1 },
  { id: 712, name: "新授环节", level: 3, parentId: 71, icon: "", sortOrder: 2 },
  { id: 713, name: "巩固练习", level: 3, parentId: 71, icon: "", sortOrder: 3 },
  { id: 714, name: "总结提升", level: 3, parentId: 71, icon: "", sortOrder: 4 },

  // 8. 作业与评价
  { id: 8, name: "作业与评价", description: "作业设计、学业评价", level: 1, parentId: null, icon: "", sortOrder: 8 },
  { id: 81, name: "作业设计", description: "课后作业、实践作业", level: 2, parentId: 8, icon: "", sortOrder: 1 },
  { id: 82, name: "试题命制", description: "试卷、测验题目设计", level: 2, parentId: 8, icon: "", sortOrder: 2 },
  { id: 83, name: "作业批改", description: "作业批改、反馈", level: 2, parentId: 8, icon: "", sortOrder: 3 },
  { id: 84, name: "学业评价", description: "学生评价、成长档案", level: 2, parentId: 8, icon: "", sortOrder: 4 },

  { id: 811, name: "基础练习", level: 3, parentId: 81, icon: "", sortOrder: 1 },
  { id: 812, name: "拓展作业", level: 3, parentId: 81, icon: "", sortOrder: 2 },
  { id: 813, name: "实践作业", level: 3, parentId: 81, icon: "", sortOrder: 3 },
  { id: 821, name: "选择题", level: 3, parentId: 82, icon: "", sortOrder: 1 },
  { id: 822, name: "主观题", level: 3, parentId: 82, icon: "", sortOrder: 2 },
  { id: 823, name: "综合题", level: 3, parentId: 82, icon: "", sortOrder: 3 },

  // 9. 班级管理
  { id: 9, name: "班级管理", description: "班主任工作、学生管理", level: 1, parentId: null, icon: "", sortOrder: 9 },
  { id: 91, name: "班级建设", description: "班级文化、制度建设", level: 2, parentId: 9, icon: "", sortOrder: 1 },
  { id: 92, name: "学生沟通", description: "师生谈话、心理辅导", level: 2, parentId: 9, icon: "", sortOrder: 2 },
  { id: 93, name: "家校沟通", description: "家长会、家访、家长群", level: 2, parentId: 9, icon: "", sortOrder: 3 },
  { id: 94, name: "活动组织", description: "班会、集体活动", level: 2, parentId: 9, icon: "", sortOrder: 4 },

  { id: 911, name: "班规制定", level: 3, parentId: 91, icon: "", sortOrder: 1 },
  { id: 912, name: "班干部培养", level: 3, parentId: 91, icon: "", sortOrder: 2 },
  { id: 913, name: "环境布置", level: 3, parentId: 91, icon: "", sortOrder: 3 },
  { id: 921, name: "个别谈话", level: 3, parentId: 92, icon: "", sortOrder: 1 },
  { id: 922, name: "心理疏导", level: 3, parentId: 92, icon: "", sortOrder: 2 },
  { id: 931, name: "家长会发言", level: 3, parentId: 93, icon: "", sortOrder: 1 },
  { id: 932, name: "家访记录", level: 3, parentId: 93, icon: "", sortOrder: 2 },
  { id: 933, name: "家长群沟通", level: 3, parentId: 93, icon: "", sortOrder: 3 },

  // 10. 教研活动
  { id: 10, name: "教研活动", description: "教学研究、专业发展", level: 1, parentId: null, icon: "", sortOrder: 10 },
  { id: 101, name: "听评课", description: "听课评课、同课异构", level: 2, parentId: 10, icon: "", sortOrder: 1 },
  { id: 102, name: "教学反思", description: "教学总结、经验分享", level: 2, parentId: 10, icon: "", sortOrder: 2 },
  { id: 103, name: "课题研究", description: "教研课题、行动研究", level: 2, parentId: 10, icon: "", sortOrder: 3 },
  { id: 104, name: "专业发展", description: "教师培训、进修学习", level: 2, parentId: 10, icon: "", sortOrder: 4 },

  { id: 1011, name: "听课记录", level: 3, parentId: 101, icon: "", sortOrder: 1 },
  { id: 1012, name: "评课发言", level: 3, parentId: 101, icon: "", sortOrder: 2 },
  { id: 1021, name: "课后反思", level: 3, parentId: 102, icon: "", sortOrder: 1 },
  { id: 1022, name: "教学总结", level: 3, parentId: 102, icon: "", sortOrder: 2 },
  { id: 1031, name: "开题报告", level: 3, parentId: 103, icon: "", sortOrder: 1 },
  { id: 1032, name: "研究论文", level: 3, parentId: 103, icon: "", sortOrder: 2 },

  // ========== 三、通用工具场景（保留） ==========

  // 11. 内容创作
  { id: 11, name: "内容创作", description: "教学素材创作", level: 1, parentId: null, icon: "", sortOrder: 11 },
  { id: 111, name: "文字创作", description: "文章、讲稿撰写", level: 2, parentId: 11, icon: "", sortOrder: 1 },
  { id: 112, name: "视频制作", description: "微课、教学视频", level: 2, parentId: 11, icon: "", sortOrder: 2 },
  { id: 113, name: "图文设计", description: "海报、宣传册设计", level: 2, parentId: 11, icon: "", sortOrder: 3 },

  { id: 1111, name: "教学案例", level: 3, parentId: 111, icon: "", sortOrder: 1 },
  { id: 1112, name: "教育叙事", level: 3, parentId: 111, icon: "", sortOrder: 2 },
  { id: 1113, name: "经验总结", level: 3, parentId: 111, icon: "", sortOrder: 3 },

  // 12. 数据分析
  { id: 12, name: "数据分析", description: "教学数据分析", level: 1, parentId: null, icon: "", sortOrder: 12 },
  { id: 121, name: "成绩分析", description: "考试成绩统计分析", level: 2, parentId: 12, icon: "", sortOrder: 1 },
  { id: 122, name: "学情分析", description: "学生学习情况分析", level: 2, parentId: 12, icon: "", sortOrder: 2 },
  { id: 123, name: "教学质量", description: "教学质量评估", level: 2, parentId: 12, icon: "", sortOrder: 3 },

  { id: 1211, name: "试卷分析", level: 3, parentId: 121, icon: "", sortOrder: 1 },
  { id: 1212, name: "成绩对比", level: 3, parentId: 121, icon: "", sortOrder: 2 },
  { id: 1213, name: "进步跟踪", level: 3, parentId: 121, icon: "", sortOrder: 3 },
];

console.log("开始插入教育场景分类数据...");
console.log(`共 ${scenariosData.length} 个分类\n`);

for (const scenario of scenariosData) {
  await db.insert(scenarios).values({
    ...scenario,
    isCustom: false,
    userId: null,
  });
  const indent = "  ".repeat(scenario.level - 1);
  console.log(`${indent}✓ ${scenario.name} (Level ${scenario.level})`);
}

console.log("\n✅ 教育场景分类数据插入完成!");
console.log(`   一级分类: ${scenariosData.filter(s => s.level === 1).length} 个`);
console.log(`   二级分类: ${scenariosData.filter(s => s.level === 2).length} 个`);
console.log(`   三级分类: ${scenariosData.filter(s => s.level === 3).length} 个`);
console.log(`   总计: ${scenariosData.length} 个分类`);

await connection.end();
