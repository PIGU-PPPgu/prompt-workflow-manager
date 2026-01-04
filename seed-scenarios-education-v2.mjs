/**
 * seed-scenarios-education-v2.mjs
 * 教育场景分类：学段 → 学科 → 教学环节（复用同一套环节模板）
 * ID 规则：一级 1-99；二级 = 一级 * 100 + seq；三级 = 二级 * 100 + seq
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { scenarios as scenariosTable } from "./drizzle/schema.ts";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const commonTeachingSteps = [
  { seq: 1, name: '教案设计', description: '课前确定教学目标、重难点与评价标准', icon: '' },
  { seq: 2, name: '备课资源', description: '筛选教材、案例、视频与素材，形成备课包', icon: '' },
  { seq: 3, name: '课件制作', description: '制作PPT/交互课件/板书设计', icon: '' },
  { seq: 4, name: '课堂互动', description: '提问、讨论、探究、合作学习等互动设计', icon: '' },
  { seq: 5, name: '分层教学', description: '面向学情的分组、分层任务与个性化路径', icon: '' },
  { seq: 6, name: '课堂管理', description: '课堂秩序、行为规范、时间与节奏控制', icon: '' },
  { seq: 7, name: '作业设计', description: '分层作业、实践作业与探究任务布置', icon: '' },
  { seq: 8, name: '作业批改', description: '批阅、讲评与错误分析，形成作业反馈', icon: '' },
  { seq: 9, name: '辅导答疑', description: '课后辅导、在线答疑与个别化支持', icon: '' },
  { seq: 10, name: '试卷命题', description: '单元测、期中期末/校本测试卷命制与质检', icon: '' },
  { seq: 11, name: '考务管理', description: '排考、监考、巡考与考务流程管理', icon: '' },
  { seq: 12, name: '成绩分析', description: '分数/素养/能力维度的数据分析与改进', icon: '' },
  { seq: 13, name: '班级建设', description: '班级文化、制度与集体活动策划', icon: '' },
  { seq: 14, name: '家校沟通', description: '家校联系、沟通档案与家长会管理', icon: '' },
  { seq: 15, name: '学生管理与档案', description: '学籍、成长记录、心理预警与个案跟踪', icon: '' },
  { seq: 16, name: '听评课', description: '课堂观摩、记录、量表评价与反馈', icon: '' },
  { seq: 17, name: '教学反思', description: '课后反思、改进计划与公开课打磨', icon: '' },
  { seq: 18, name: '课题研究', description: '校本教研、课题立项、实验与成果整理', icon: '' },
  { seq: 19, name: '课后服务', description: '延时服务、社团/兴趣活动设计与管理', icon: '' },
  { seq: 20, name: '选科走班与排课', description: '选科指引、走班编排、排课调课与容量管控', icon: '' },
  { seq: 21, name: '课程建设', description: '课程标准、本校课程地图、选修模块与资源库建设', icon: '' },
];

/** 学段及学科定义（按 sortOrder 展示） */
const stages = [
  {
    id: 1,
    name: '学前教育',
    description: '幼儿园与托育阶段，强调保教结合与游戏化学习',
    icon: '',
    sortOrder: 1,
    subjects: [
      {
        seq: 1,
        name: '幼儿综合主题课程',
        description: '以主题/游戏/项目为载体的综合实践与艺术体验',
        icon: '',
      },
      {
        seq: 2,
        name: '家园共育与班主任工作',
        description: '班主任、德育、心理早期支持与家园共育协同',
        icon: '',
      },
    ],
  },
  {
    id: 2,
    name: '小学教育',
    description: '义务教育前段，核心素养奠基与习惯培养',
    icon: '',
    sortOrder: 2,
    subjects: [
      {
        seq: 1,
        name: '语文',
        description: '阅读、写作、口语交际与文化素养',
        icon: '',
      },
      {
        seq: 2,
        name: '数学',
        description: '数与代数、图形与几何、统计概率、实践应用',
        icon: '',
      },
      {
        seq: 3,
        name: '英语与信息素养',
        description: '英语基础听说读写与信息素养、跨学科阅读',
        icon: '',
      },
    ],
  },
  {
    id: 3,
    name: '初中教育',
    description: '义务教育后段，学科深化与综合实践提升',
    icon: '',
    sortOrder: 3,
    subjects: [
      {
        seq: 1,
        name: '道德与法治/心理健康',
        description: '德育、心理健康教育与班主任德育工作',
        icon: '',
      },
      {
        seq: 2,
        name: '综合实践与劳动教育',
        description: '劳动、社团、研究性学习与项目化实践',
        icon: '',
      },
    ],
  },
  {
    id: 4,
    name: '高中教育',
    description: '普通高中阶段，选择性必修与生涯发展并重',
    icon: '',
    sortOrder: 4,
    subjects: [
      {
        seq: 1,
        name: '核心学科群',
        description: '语文、数学、英语等必修与选择性必修模块',
        icon: '',
      },
      {
        seq: 2,
        name: '信息技术与人工智能',
        description: '信息科技、新课标AI模块与项目实践',
        icon: '',
      },
    ],
  },
  {
    id: 5,
    name: '高等教育',
    description: '本科与研究生阶段，通识教育与专业深度融合',
    icon: '',
    sortOrder: 5,
    subjects: [
      {
        seq: 1,
        name: '通识教育与思政',
        description: '大学语文、思政、心理健康与创新素养',
        icon: '',
      },
      {
        seq: 2,
        name: '专业核心课程建设',
        description: '专业基础、核心与方向选修，课程与教研一体化',
        icon: '',
      },
    ],
  },
  {
    id: 6,
    name: '职业教育',
    description: '中高职与技工教育，强调技能与岗位能力培养',
    icon: '',
    sortOrder: 6,
    subjects: [
      {
        seq: 1,
        name: '专业技能与实训课程',
        description: '专业岗位能力、实训、顶岗实习与证书对接',
        icon: '',
      },
      {
        seq: 2,
        name: '班主任与实习管理',
        description: '班主任、企业导师协同，实习管理与就业指导',
        icon: '',
      },
    ],
  },
];

/** 生成层级化场景列表 */
const scenarios = [];

stages.forEach((stage) => {
  scenarios.push({
    id: stage.id,
    name: stage.name,
    description: stage.description,
    level: 1,
    parentId: null,
    icon: stage.icon,
    sortOrder: stage.sortOrder,
  });

  stage.subjects.forEach((subject) => {
    const subjectId = stage.id * 100 + subject.seq;
    scenarios.push({
      id: subjectId,
      name: subject.name,
      description: subject.description,
      level: 2,
      parentId: stage.id,
      icon: subject.icon,
      sortOrder: subject.seq,
    });

    commonTeachingSteps.forEach((step) => {
      scenarios.push({
        id: subjectId * 100 + step.seq,
        name: step.name,
        description: step.description,
        level: 3,
        parentId: subjectId,
        icon: step.icon,
        sortOrder: step.seq,
      });
    });
  });
});

// ========== 执行数据库导入 ==========
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log("清空现有场景数据...");
await db.execute(sql`DELETE FROM ${scenariosTable}`);

console.log("\n开始插入教育场景分类数据...");
console.log(`共 ${scenarios.length} 个分类\n`);

for (const scenario of scenarios) {
  await db.insert(scenariosTable).values({
    ...scenario,
    isCustom: false,
    userId: null,
  });
  const indent = "  ".repeat(scenario.level - 1);
  console.log(`${indent}✓ ${scenario.name} (Level ${scenario.level}, ID: ${scenario.id})`);
}

console.log("\n✅ 教育场景分类数据插入完成!");
console.log(`   一级分类: ${scenarios.filter(s => s.level === 1).length} 个`);
console.log(`   二级分类: ${scenarios.filter(s => s.level === 2).length} 个`);
console.log(`   三级分类: ${scenarios.filter(s => s.level === 3).length} 个`);
console.log(`   总计: ${scenarios.length} 个分类`);

await connection.end();
