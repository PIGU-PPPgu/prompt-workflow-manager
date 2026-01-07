import { getDb } from './db';
import { scenarios } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * 场景分类种子数据
 * 教育领域三级分类：大类 > 学科/领域 > 具体场景
 */
const scenarioSeedData = [
  // ========== 一级：学科教学 ==========
  {
    name: '📚 学科教学',
    description: '各学科课堂教学与学业辅导',
    level: 1,
    icon: '📚',
    children: [
      {
        name: '语文',
        description: '语文学科教学',
        level: 2,
        icon: '📖',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '课堂导入', icon: '🎬', level: 3 },
          { name: '课文讲解', icon: '👨‍🏫', level: 3 },
          { name: '阅读指导', icon: '📚', level: 3 },
          { name: '写作训练', icon: '✏️', level: 3 },
          { name: '作业批改', icon: '✍️', level: 3 },
          { name: '考试命题', icon: '📋', level: 3 },
          { name: '古诗词教学', icon: '🏯', level: 3 },
          { name: '作文评语', icon: '💬', level: 3 },
        ]
      },
      {
        name: '数学',
        description: '数学学科教学',
        level: 2,
        icon: '🔢',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '概念讲解', icon: '💡', level: 3 },
          { name: '例题演示', icon: '📐', level: 3 },
          { name: '习题设计', icon: '✏️', level: 3 },
          { name: '作业批改', icon: '✍️', level: 3 },
          { name: '错题分析', icon: '🔍', level: 3 },
          { name: '考试命题', icon: '📋', level: 3 },
          { name: '解题思路', icon: '🧠', level: 3 },
        ]
      },
      {
        name: '英语',
        description: '英语学科教学',
        level: 2,
        icon: '🌍',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '词汇教学', icon: '📖', level: 3 },
          { name: '语法讲解', icon: '📐', level: 3 },
          { name: '听力训练', icon: '🎧', level: 3 },
          { name: '口语练习', icon: '💬', level: 3 },
          { name: '阅读理解', icon: '📚', level: 3 },
          { name: '写作指导', icon: '✏️', level: 3 },
          { name: '作业批改', icon: '✍️', level: 3 },
          { name: '考试命题', icon: '📋', level: 3 },
        ]
      },
      {
        name: '物理',
        description: '物理学科教学',
        level: 2,
        icon: '⚛️',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '概念讲解', icon: '💡', level: 3 },
          { name: '实验设计', icon: '🔬', level: 3 },
          { name: '习题讲解', icon: '📐', level: 3 },
          { name: '作业批改', icon: '✍️', level: 3 },
          { name: '考试命题', icon: '📋', level: 3 },
        ]
      },
      {
        name: '化学',
        description: '化学学科教学',
        level: 2,
        icon: '🧪',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '概念讲解', icon: '💡', level: 3 },
          { name: '实验设计', icon: '🔬', level: 3 },
          { name: '方程式教学', icon: '⚗️', level: 3 },
          { name: '作业批改', icon: '✍️', level: 3 },
          { name: '考试命题', icon: '📋', level: 3 },
        ]
      },
      {
        name: '生物',
        description: '生物学科教学',
        level: 2,
        icon: '🧬',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '概念讲解', icon: '💡', level: 3 },
          { name: '实验设计', icon: '🔬', level: 3 },
          { name: '作业批改', icon: '✍️', level: 3 },
          { name: '考试命题', icon: '📋', level: 3 },
        ]
      },
      {
        name: '历史',
        description: '历史学科教学',
        level: 2,
        icon: '🏛️',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '史料分析', icon: '📜', level: 3 },
          { name: '时间线梳理', icon: '📅', level: 3 },
          { name: '作业批改', icon: '✍️', level: 3 },
          { name: '考试命题', icon: '📋', level: 3 },
        ]
      },
      {
        name: '地理',
        description: '地理学科教学',
        level: 2,
        icon: '🌏',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '地图教学', icon: '🗺️', level: 3 },
          { name: '区域分析', icon: '📊', level: 3 },
          { name: '作业批改', icon: '✍️', level: 3 },
          { name: '考试命题', icon: '📋', level: 3 },
        ]
      },
      {
        name: '政治',
        description: '政治学科教学',
        level: 2,
        icon: '⚖️',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '时政分析', icon: '📰', level: 3 },
          { name: '案例教学', icon: '📋', level: 3 },
          { name: '作业批改', icon: '✍️', level: 3 },
          { name: '考试命题', icon: '📋', level: 3 },
        ]
      },
      {
        name: '信息技术',
        description: '信息技术学科教学',
        level: 2,
        icon: '💻',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '编程教学', icon: '👨‍💻', level: 3 },
          { name: '软件操作', icon: '🖥️', level: 3 },
          { name: '项目指导', icon: '🎯', level: 3 },
          { name: '作业批改', icon: '✍️', level: 3 },
        ]
      },
      {
        name: '音乐',
        description: '音乐学科教学',
        level: 2,
        icon: '🎵',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '乐理教学', icon: '🎼', level: 3 },
          { name: '歌曲教唱', icon: '🎤', level: 3 },
          { name: '欣赏指导', icon: '🎧', level: 3 },
        ]
      },
      {
        name: '美术',
        description: '美术学科教学',
        level: 2,
        icon: '🎨',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '技法指导', icon: '🖌️', level: 3 },
          { name: '作品赏析', icon: '🖼️', level: 3 },
          { name: '创作指导', icon: '✨', level: 3 },
        ]
      },
      {
        name: '体育',
        description: '体育学科教学',
        level: 2,
        icon: '⚽',
        children: [
          { name: '备课设计', icon: '📝', level: 3 },
          { name: '技能教学', icon: '🏃', level: 3 },
          { name: '体能训练', icon: '💪', level: 3 },
          { name: '比赛组织', icon: '🏆', level: 3 },
        ]
      },
    ]
  },
  // ========== 一级：班级管理 ==========
  {
    name: '👥 班级管理',
    description: '班主任工作与班级日常管理',
    level: 1,
    icon: '👥',
    children: [
      {
        name: '学生管理',
        description: '学生日常管理与评价',
        level: 2,
        icon: '👨‍🎓',
        children: [
          { name: '学生评语', icon: '📝', level: 3 },
          { name: '综合素质评价', icon: '⭐', level: 3 },
          { name: '行为规范', icon: '📋', level: 3 },
          { name: '奖惩记录', icon: '🏅', level: 3 },
          { name: '学业跟踪', icon: '📊', level: 3 },
        ]
      },
      {
        name: '家校沟通',
        description: '与家长的沟通协作',
        level: 2,
        icon: '👨‍👩‍👧',
        children: [
          { name: '家长会', icon: '🏫', level: 3 },
          { name: '家访记录', icon: '🏠', level: 3 },
          { name: '通知公告', icon: '📢', level: 3 },
          { name: '个别沟通', icon: '💬', level: 3 },
          { name: '问题反馈', icon: '📩', level: 3 },
        ]
      },
      {
        name: '心理辅导',
        description: '学生心理健康指导',
        level: 2,
        icon: '💝',
        children: [
          { name: '心理疏导', icon: '🤗', level: 3 },
          { name: '青春期教育', icon: '🌱', level: 3 },
          { name: '压力管理', icon: '😌', level: 3 },
          { name: '人际交往', icon: '🤝', level: 3 },
          { name: '危机干预', icon: '🆘', level: 3 },
        ]
      },
      {
        name: '班级活动',
        description: '班级活动策划与组织',
        level: 2,
        icon: '🎉',
        children: [
          { name: '主题班会', icon: '📢', level: 3 },
          { name: '团队建设', icon: '🤝', level: 3 },
          { name: '文体活动', icon: '🎭', level: 3 },
          { name: '志愿服务', icon: '❤️', level: 3 },
          { name: '研学旅行', icon: '🚌', level: 3 },
        ]
      },
      {
        name: '班级文化',
        description: '班级文化建设',
        level: 2,
        icon: '🎯',
        children: [
          { name: '班规制定', icon: '📜', level: 3 },
          { name: '班级口号', icon: '💪', level: 3 },
          { name: '环境布置', icon: '🖼️', level: 3 },
          { name: '班级荣誉', icon: '🏆', level: 3 },
        ]
      },
    ]
  },
  // ========== 一级：教研发展 ==========
  {
    name: '🔬 教研发展',
    description: '教学研究与教师专业成长',
    level: 1,
    icon: '🔬',
    children: [
      {
        name: '教学研究',
        description: '课堂教学研究与改进',
        level: 2,
        icon: '📊',
        children: [
          { name: '课题研究', icon: '🔍', level: 3 },
          { name: '教学设计', icon: '📐', level: 3 },
          { name: '案例分析', icon: '📋', level: 3 },
          { name: '教学反思', icon: '🤔', level: 3 },
          { name: '经验总结', icon: '📝', level: 3 },
        ]
      },
      {
        name: '论文写作',
        description: '教育教学论文撰写',
        level: 2,
        icon: '📄',
        children: [
          { name: '选题指导', icon: '🎯', level: 3 },
          { name: '文献综述', icon: '📚', level: 3 },
          { name: '论文框架', icon: '🏗️', level: 3 },
          { name: '论文润色', icon: '✨', level: 3 },
          { name: '投稿指南', icon: '📮', level: 3 },
        ]
      },
      {
        name: '听评课',
        description: '课堂观察与评价',
        level: 2,
        icon: '👂',
        children: [
          { name: '听课记录', icon: '📝', level: 3 },
          { name: '评课意见', icon: '💬', level: 3 },
          { name: '优质课评析', icon: '⭐', level: 3 },
          { name: '同课异构', icon: '🔄', level: 3 },
        ]
      },
      {
        name: '专业成长',
        description: '教师个人发展规划',
        level: 2,
        icon: '📈',
        children: [
          { name: '成长规划', icon: '🎯', level: 3 },
          { name: '技能提升', icon: '💪', level: 3 },
          { name: '教学比赛', icon: '🏆', level: 3 },
          { name: '职称评审', icon: '📜', level: 3 },
          { name: '培训学习', icon: '🎓', level: 3 },
        ]
      },
      {
        name: '集体备课',
        description: '教研组协作备课',
        level: 2,
        icon: '👥',
        children: [
          { name: '备课方案', icon: '📋', level: 3 },
          { name: '资源共享', icon: '🔗', level: 3 },
          { name: '问题研讨', icon: '💭', level: 3 },
          { name: '进度协调', icon: '📅', level: 3 },
        ]
      },
    ]
  },
  // ========== 一级：通用技能 ==========
  {
    name: '🛠️ 通用技能',
    description: '跨学科通用教学技能',
    level: 1,
    icon: '🛠️',
    children: [
      {
        name: '教学设计',
        description: '通用教学设计方法',
        level: 2,
        icon: '📐',
        children: [
          { name: '学情分析', icon: '📊', level: 3 },
          { name: '目标设定', icon: '🎯', level: 3 },
          { name: '活动设计', icon: '🎮', level: 3 },
          { name: '评价设计', icon: '📋', level: 3 },
          { name: '差异化教学', icon: '🔀', level: 3 },
        ]
      },
      {
        name: '课堂管理',
        description: '课堂秩序与氛围管理',
        level: 2,
        icon: '🎓',
        children: [
          { name: '课堂导入', icon: '🎬', level: 3 },
          { name: '提问技巧', icon: '❓', level: 3 },
          { name: '课堂互动', icon: '🙋', level: 3 },
          { name: '时间管理', icon: '⏰', level: 3 },
          { name: '秩序维护', icon: '📢', level: 3 },
        ]
      },
      {
        name: '作业管理',
        description: '作业设计与批改',
        level: 2,
        icon: '✍️',
        children: [
          { name: '作业设计', icon: '📝', level: 3 },
          { name: '批改评语', icon: '💬', level: 3 },
          { name: '错题整理', icon: '📋', level: 3 },
          { name: '作业分析', icon: '📊', level: 3 },
        ]
      },
      {
        name: '考试评价',
        description: '考试命题与成绩分析',
        level: 2,
        icon: '📝',
        children: [
          { name: '试题设计', icon: '📋', level: 3 },
          { name: '试卷分析', icon: '📊', level: 3 },
          { name: '成绩分析', icon: '📈', level: 3 },
          { name: '质量报告', icon: '📄', level: 3 },
        ]
      },
      {
        name: '教育技术',
        description: '信息化教学工具应用',
        level: 2,
        icon: '💻',
        children: [
          { name: 'PPT制作', icon: '🖼️', level: 3 },
          { name: '微课制作', icon: '🎥', level: 3 },
          { name: '在线教学', icon: '🌐', level: 3 },
          { name: 'AI辅助教学', icon: '🤖', level: 3 },
          { name: '数据分析', icon: '📊', level: 3 },
        ]
      },
      {
        name: '文案写作',
        description: '教育相关文案撰写',
        level: 2,
        icon: '✏️',
        children: [
          { name: '工作计划', icon: '📅', level: 3 },
          { name: '工作总结', icon: '📝', level: 3 },
          { name: '活动方案', icon: '📋', level: 3 },
          { name: '申报材料', icon: '📄', level: 3 },
          { name: '宣传稿件', icon: '📰', level: 3 },
        ]
      },
    ]
  },
  // ========== 一级：学生辅导 ==========
  {
    name: '🌟 学生辅导',
    description: '个性化学生指导与帮助',
    level: 1,
    icon: '🌟',
    children: [
      {
        name: '学业辅导',
        description: '学习方法与习惯指导',
        level: 2,
        icon: '📖',
        children: [
          { name: '学习方法', icon: '💡', level: 3 },
          { name: '习惯养成', icon: '📅', level: 3 },
          { name: '时间管理', icon: '⏰', level: 3 },
          { name: '记忆技巧', icon: '🧠', level: 3 },
          { name: '考试技巧', icon: '✍️', level: 3 },
        ]
      },
      {
        name: '培优补差',
        description: '分层辅导与个别指导',
        level: 2,
        icon: '🎯',
        children: [
          { name: '学优生培养', icon: '🌟', level: 3 },
          { name: '后进生转化', icon: '💪', level: 3 },
          { name: '个别辅导', icon: '👤', level: 3 },
          { name: '小组辅导', icon: '👥', level: 3 },
        ]
      },
      {
        name: '生涯规划',
        description: '学生发展与升学指导',
        level: 2,
        icon: '🛤️',
        children: [
          { name: '兴趣探索', icon: '🔍', level: 3 },
          { name: '选科指导', icon: '📚', level: 3 },
          { name: '升学规划', icon: '🎓', level: 3 },
          { name: '志愿填报', icon: '📝', level: 3 },
        ]
      },
      {
        name: '特长发展',
        description: '学生特长培养与竞赛指导',
        level: 2,
        icon: '🏅',
        children: [
          { name: '竞赛辅导', icon: '🏆', level: 3 },
          { name: '社团指导', icon: '🎭', level: 3 },
          { name: '特长培养', icon: '⭐', level: 3 },
          { name: '自主招生', icon: '🎯', level: 3 },
        ]
      },
    ]
  },
  // ========== 一级：学校管理 ==========
  {
    name: '🏫 学校管理',
    description: '学校行政与教育管理工作',
    level: 1,
    icon: '🏫',
    children: [
      {
        name: '行政管理',
        description: '学校日常行政事务',
        level: 2,
        icon: '📋',
        children: [
          { name: '工作计划', icon: '📅', level: 3 },
          { name: '工作总结', icon: '📝', level: 3 },
          { name: '会议组织', icon: '🤝', level: 3 },
          { name: '制度建设', icon: '📜', level: 3 },
          { name: '档案管理', icon: '🗂️', level: 3 },
          { name: '公文写作', icon: '✏️', level: 3 },
        ]
      },
      {
        name: '教学管理',
        description: '教学质量监控与管理',
        level: 2,
        icon: '📊',
        children: [
          { name: '教学计划', icon: '📅', level: 3 },
          { name: '课程安排', icon: '📋', level: 3 },
          { name: '教学督导', icon: '👁️', level: 3 },
          { name: '质量分析', icon: '📈', level: 3 },
          { name: '教研管理', icon: '🔬', level: 3 },
          { name: '考务管理', icon: '📝', level: 3 },
        ]
      },
      {
        name: '德育管理',
        description: '学生德育与思政工作',
        level: 2,
        icon: '🎯',
        children: [
          { name: '德育计划', icon: '📅', level: 3 },
          { name: '主题教育', icon: '📢', level: 3 },
          { name: '校风建设', icon: '🏫', level: 3 },
          { name: '学生表彰', icon: '🏆', level: 3 },
          { name: '违纪处理', icon: '⚠️', level: 3 },
          { name: '心理健康', icon: '💝', level: 3 },
        ]
      },
      {
        name: '人事管理',
        description: '教职工管理与发展',
        level: 2,
        icon: '👔',
        children: [
          { name: '招聘录用', icon: '📋', level: 3 },
          { name: '绩效考核', icon: '📊', level: 3 },
          { name: '培训发展', icon: '📈', level: 3 },
          { name: '职称评审', icon: '📜', level: 3 },
          { name: '师德建设', icon: '⭐', level: 3 },
          { name: '团队建设', icon: '🤝', level: 3 },
        ]
      },
      {
        name: '后勤管理',
        description: '后勤保障与服务',
        level: 2,
        icon: '🔧',
        children: [
          { name: '财务管理', icon: '💰', level: 3 },
          { name: '资产管理', icon: '🏢', level: 3 },
          { name: '采购管理', icon: '🛒', level: 3 },
          { name: '食堂管理', icon: '🍽️', level: 3 },
          { name: '宿舍管理', icon: '🏠', level: 3 },
          { name: '设施维护', icon: '🔨', level: 3 },
        ]
      },
      {
        name: '安全管理',
        description: '校园安全与应急管理',
        level: 2,
        icon: '🛡️',
        children: [
          { name: '安全制度', icon: '📜', level: 3 },
          { name: '安全教育', icon: '📢', level: 3 },
          { name: '隐患排查', icon: '🔍', level: 3 },
          { name: '应急预案', icon: '🆘', level: 3 },
          { name: '事故处理', icon: '⚠️', level: 3 },
          { name: '消防安全', icon: '🧯', level: 3 },
        ]
      },
      {
        name: '招生管理',
        description: '招生宣传与录取工作',
        level: 2,
        icon: '📣',
        children: [
          { name: '招生计划', icon: '📅', level: 3 },
          { name: '招生宣传', icon: '📢', level: 3 },
          { name: '政策解读', icon: '📋', level: 3 },
          { name: '录取工作', icon: '✅', level: 3 },
          { name: '生源分析', icon: '📊', level: 3 },
        ]
      },
      {
        name: '对外交流',
        description: '校际合作与社会联系',
        level: 2,
        icon: '🌐',
        children: [
          { name: '校际合作', icon: '🤝', level: 3 },
          { name: '家委会', icon: '👨‍👩‍👧', level: 3 },
          { name: '社区联系', icon: '🏘️', level: 3 },
          { name: '媒体宣传', icon: '📰', level: 3 },
          { name: '参观接待', icon: '🎊', level: 3 },
        ]
      },
      {
        name: '信息化建设',
        description: '智慧校园与数字化管理',
        level: 2,
        icon: '💻',
        children: [
          { name: '系统建设', icon: '🖥️', level: 3 },
          { name: '数据管理', icon: '📊', level: 3 },
          { name: '网络安全', icon: '🔒', level: 3 },
          { name: '智慧课堂', icon: '🎓', level: 3 },
          { name: '办公自动化', icon: '⚙️', level: 3 },
        ]
      },
    ]
  },
];

/**
 * 插入场景分类数据
 * @param forceReset 是否强制重置（删除现有预设分类后重新创建）
 */
export async function seedScenarios(forceReset = false) {
  console.log('开始初始化场景分类数据...');

  const db = await getDb();
  if (!db) {
    throw new Error('数据库连接失败');
  }

  // 检查是否已有数据
  const existingScenarios = await db.select().from(scenarios).where(eq(scenarios.isCustom, false));

  if (existingScenarios.length > 0) {
    if (forceReset) {
      console.log(`发现 ${existingScenarios.length} 个系统预设场景，强制重置模式，删除后重新创建...`);
      await db.delete(scenarios).where(eq(scenarios.isCustom, false));
    } else {
      console.log(`已存在 ${existingScenarios.length} 个系统预设场景，跳过初始化`);
      return;
    }
  }

  let totalCount = 0;

  for (const level1Data of scenarioSeedData) {
    // 插入一级分类
    const [level1Result] = await db.insert(scenarios).values({
      name: level1Data.name,
      description: level1Data.description,
      level: level1Data.level,
      icon: level1Data.icon,
      isCustom: false,
      userId: null,
      sortOrder: totalCount++,
    });

    const level1Id = level1Result.insertId;
    console.log(`✓ 创建一级分类: ${level1Data.name} (ID: ${level1Id})`);

    // 插入二级分类
    if (level1Data.children) {
      for (const level2Data of level1Data.children) {
        const [level2Result] = await db.insert(scenarios).values({
          name: level2Data.name,
          description: level2Data.description,
          level: level2Data.level,
          icon: level2Data.icon,
          parentId: level1Id,
          isCustom: false,
          userId: null,
          sortOrder: totalCount++,
        });

        const level2Id = level2Result.insertId;
        console.log(`  ✓ 创建二级分类: ${level2Data.name} (ID: ${level2Id})`);

        // 插入三级分类
        if (level2Data.children) {
          for (const level3Data of level2Data.children) {
            await db.insert(scenarios).values({
              name: level3Data.name,
              level: level3Data.level,
              icon: level3Data.icon,
              parentId: level2Id,
              isCustom: false,
              userId: null,
              sortOrder: totalCount++,
            });

            console.log(`    ✓ 创建三级分类: ${level3Data.name}`);
          }
        }
      }
    }
  }

  console.log(`场景分类初始化完成！共创建 ${totalCount} 个分类`);
}

// 如果直接运行此文件，执行种子数据
if (import.meta.url === `file://${process.argv[1]}`) {
  seedScenarios()
    .then(() => {
      console.log('种子数据插入成功！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('种子数据插入失败:', error);
      process.exit(1);
    });
}
