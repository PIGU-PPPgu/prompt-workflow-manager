import mysql from 'mysql2/promise';

// 教育行业分类模板(基于用户提供的结构)
const educationCategories = [
  // 一级分类
  { name: "备课环节", description: "教学准备相关提示词", level: 1, icon: "📚" },
  { name: "教学环节", description: "课堂教学相关提示词", level: 1, icon: "👨‍🏫" },
  { name: "评价环节", description: "学生评价相关提示词", level: 1, icon: "📝" },
  { name: "内容创作", description: "教育内容创作提示词", level: 1, icon: "🎬" },
  { name: "教务管理", description: "教务行政管理提示词", level: 1, icon: "💼" },
  { name: "教研科研", description: "教学研究相关提示词", level: 1, icon: "🔬" },
  
  // 备课环节二级分类
  { name: "课标解读", description: "课程标准解读分析", parentName: "备课环节", level: 2, icon: "📖" },
  { name: "教材分析", description: "教材内容深度分析", parentName: "备课环节", level: 2, icon: "📚" },
  { name: "教学设计", description: "教学方案设计", parentName: "备课环节", level: 2, icon: "✏️" },
  { name: "资源收集", description: "教学资源整理", parentName: "备课环节", level: 2, icon: "📦" },
  { name: "学情分析", description: "学生情况分析", parentName: "备课环节", level: 2, icon: "👥" },
  
  // 教学环节二级分类
  { name: "课堂导入", description: "课堂引入活动设计", parentName: "教学环节", level: 2, icon: "🚪" },
  { name: "知识讲解", description: "知识点讲解设计", parentName: "教学环节", level: 2, icon: "💡" },
  { name: "互动活动", description: "课堂互动设计", parentName: "教学环节", level: 2, icon: "🎯" },
  { name: "练习设计", description: "课堂练习题设计", parentName: "教学环节", level: 2, icon: "✍️" },
  { name: "课堂总结", description: "课堂小结设计", parentName: "教学环节", level: 2, icon: "📌" },
  
  // 评价环节二级分类
  { name: "作业批改", description: "作业批改辅助", parentName: "评价环节", level: 2, icon: "✅" },
  { name: "试卷命题", description: "考试试卷设计", parentName: "评价环节", level: 2, icon: "📄" },
  { name: "学生评语", description: "学生评语生成", parentName: "评价环节", level: 2, icon: "💬" },
  { name: "学情诊断", description: "学习情况诊断", parentName: "评价环节", level: 2, icon: "🔍" },
  { name: "教学反思", description: "教学反思总结", parentName: "评价环节", level: 2, icon: "🤔" },
  
  // 内容创作二级分类
  { name: "视频脚本", description: "教学视频脚本", parentName: "内容创作", level: 2, icon: "🎬" },
  { name: "公众号文章", description: "教育公众号内容", parentName: "内容创作", level: 2, icon: "📱" },
  { name: "课件制作", description: "PPT课件内容", parentName: "内容创作", level: 2, icon: "📊" },
  { name: "思维导图", description: "思维导图设计", parentName: "内容创作", level: 2, icon: "🗺️" },
  { name: "海报设计", description: "教育海报文案", parentName: "内容创作", level: 2, icon: "🎨" },
  
  // 教务管理二级分类
  { name: "工作计划", description: "工作计划制定", parentName: "教务管理", level: 2, icon: "📅" },
  { name: "活动方案", description: "活动策划方案", parentName: "教务管理", level: 2, icon: "🎉" },
  { name: "通知公告", description: "通知公告撰写", parentName: "教务管理", level: 2, icon: "📢" },
  { name: "会议纪要", description: "会议记录整理", parentName: "教务管理", level: 2, icon: "📝" },
  { name: "总结报告", description: "工作总结报告", parentName: "教务管理", level: 2, icon: "📋" },
  
  // 教研科研二级分类
  { name: "课题申报", description: "科研课题申报", parentName: "教研科研", level: 2, icon: "📑" },
  { name: "论文写作", description: "学术论文撰写", parentName: "教研科研", level: 2, icon: "📄" },
  { name: "案例分析", description: "教学案例分析", parentName: "教研科研", level: 2, icon: "🔎" },
  { name: "数据分析", description: "教学数据分析", parentName: "教研科研", level: 2, icon: "📊" },
  { name: "文献综述", description: "文献综述撰写", parentName: "教研科研", level: 2, icon: "📚" },
];

const educationTemplate = {
  name: "教育行业分类体系",
  description: "适用于教师、教育工作者的完整提示词分类结构,涵盖备课、教学、评价、内容创作、教务管理、教研科研六大场景",
  industry: "教育",
  icon: "📚",
  isOfficial: 1,
  templateData: JSON.stringify(educationCategories),
  categoryCount: educationCategories.length,
  level1Count: educationCategories.filter(c => c.level === 1).length,
  level2Count: educationCategories.filter(c => c.level === 2).length,
  level3Count: educationCategories.filter(c => c.level === 3).length,
  downloadCount: 0,
  rating: 0,
};

// 电商、内容创作、医疗、企业管理模板数据...
const templates = [
  educationTemplate,
  {
    name: "电商运营分类体系",
    description: "适用于电商从业者的提示词分类结构,涵盖商品运营、营销推广、客户服务、数据分析等核心场景",
    industry: "电商",
    icon: "🛒",
    isOfficial: 1,
    categoryCount: 30,
    level1Count: 5,
    level2Count: 25,
    level3Count: 0,
    downloadCount: 0,
    rating: 0,
    templateData: JSON.stringify([
      { name: "商品运营", description: "商品管理相关提示词", level: 1, icon: "📦" },
      { name: "营销推广", description: "营销活动相关提示词", level: 1, icon: "📢" },
      { name: "客户服务", description: "客户沟通相关提示词", level: 1, icon: "💬" },
      { name: "数据分析", description: "运营数据分析提示词", level: 1, icon: "📊" },
      { name: "内容创作", description: "电商内容创作提示词", level: 1, icon: "✍️" },
      { name: "商品文案", description: "商品描述文案", parentName: "商品运营", level: 2, icon: "📝" },
      { name: "标题优化", description: "商品标题优化", parentName: "商品运营", level: 2, icon: "⭐" },
      { name: "详情页设计", description: "商品详情页策划", parentName: "商品运营", level: 2, icon: "📄" },
      { name: "SKU管理", description: "商品规格管理", parentName: "商品运营", level: 2, icon: "🏷️" },
      { name: "价格策略", description: "定价策略分析", parentName: "商品运营", level: 2, icon: "💰" },
      { name: "活动策划", description: "促销活动策划", parentName: "营销推广", level: 2, icon: "🎉" },
      { name: "广告文案", description: "广告投放文案", parentName: "营销推广", level: 2, icon: "📣" },
      { name: "社交媒体", description: "社交媒体运营", parentName: "营销推广", level: 2, icon: "📱" },
      { name: "直播脚本", description: "直播带货脚本", parentName: "营销推广", level: 2, icon: "🎬" },
      { name: "短视频", description: "短视频创作", parentName: "营销推广", level: 2, icon: "📹" },
      { name: "售前咨询", description: "售前问题解答", parentName: "客户服务", level: 2, icon: "❓" },
      { name: "售后处理", description: "售后问题处理", parentName: "客户服务", level: 2, icon: "🔧" },
      { name: "客户回访", description: "客户满意度回访", parentName: "客户服务", level: 2, icon: "📞" },
      { name: "投诉处理", description: "客户投诉应对", parentName: "客户服务", level: 2, icon: "⚠️" },
      { name: "会员管理", description: "会员运营管理", parentName: "客户服务", level: 2, icon: "👥" },
      { name: "销售分析", description: "销售数据分析", parentName: "数据分析", level: 2, icon: "📈" },
      { name: "用户画像", description: "用户行为分析", parentName: "数据分析", level: 2, icon: "👤" },
      { name: "竞品分析", description: "竞争对手分析", parentName: "数据分析", level: 2, icon: "🔍" },
      { name: "流量分析", description: "流量来源分析", parentName: "数据分析", level: 2, icon: "🌊" },
      { name: "转化优化", description: "转化率优化", parentName: "数据分析", level: 2, icon: "🎯" },
      { name: "图文内容", description: "图文推广内容", parentName: "内容创作", level: 2, icon: "🖼️" },
      { name: "视频脚本", description: "产品视频脚本", parentName: "内容创作", level: 2, icon: "🎥" },
      { name: "种草文案", description: "种草推荐文案", parentName: "内容创作", level: 2, icon: "🌱" },
      { name: "评测报告", description: "产品评测内容", parentName: "内容创作", level: 2, icon: "📋" },
      { name: "买家秀", description: "买家秀文案", parentName: "内容创作", level: 2, icon: "📸" },
    ]),
  },
  {
    name: "内容创作分类体系",
    description: "适用于自媒体、内容创作者的提示词分类结构,涵盖文章写作、视频制作、社交媒体运营等场景",
    industry: "内容创作",
    icon: "📝",
    isOfficial: 1,
    categoryCount: 30,
    level1Count: 5,
    level2Count: 25,
    level3Count: 0,
    downloadCount: 0,
    rating: 0,
    templateData: JSON.stringify([
      { name: "文章写作", description: "各类文章创作", level: 1, icon: "📰" },
      { name: "视频制作", description: "视频内容创作", level: 1, icon: "🎬" },
      { name: "社交媒体", description: "社交平台运营", level: 1, icon: "📱" },
      { name: "音频内容", description: "音频节目制作", level: 1, icon: "🎙️" },
      { name: "图文设计", description: "视觉内容设计", level: 1, icon: "🎨" },
      { name: "公众号文章", description: "微信公众号内容", parentName: "文章写作", level: 2, icon: "📱" },
      { name: "知乎回答", description: "知乎问答内容", parentName: "文章写作", level: 2, icon: "💡" },
      { name: "小红书笔记", description: "小红书种草内容", parentName: "文章写作", level: 2, icon: "📓" },
      { name: "技术博客", description: "技术类博客文章", parentName: "文章写作", level: 2, icon: "💻" },
      { name: "SEO文章", description: "SEO优化文章", parentName: "文章写作", level: 2, icon: "🔍" },
      { name: "短视频脚本", description: "短视频创作脚本", parentName: "视频制作", level: 2, icon: "📹" },
      { name: "长视频脚本", description: "长视频内容脚本", parentName: "视频制作", level: 2, icon: "🎥" },
      { name: "直播脚本", description: "直播内容策划", parentName: "视频制作", level: 2, icon: "📡" },
      { name: "视频标题", description: "视频标题优化", parentName: "视频制作", level: 2, icon: "⭐" },
      { name: "视频简介", description: "视频描述文案", parentName: "视频制作", level: 2, icon: "📝" },
      { name: "微博运营", description: "微博内容策划", parentName: "社交媒体", level: 2, icon: "🐦" },
      { name: "抖音运营", description: "抖音账号运营", parentName: "社交媒体", level: 2, icon: "🎵" },
      { name: "B站运营", description: "B站内容运营", parentName: "社交媒体", level: 2, icon: "📺" },
      { name: "Instagram", description: "Instagram运营", parentName: "社交媒体", level: 2, icon: "📷" },
      { name: "Twitter", description: "Twitter内容策划", parentName: "社交媒体", level: 2, icon: "🐤" },
      { name: "播客脚本", description: "播客节目脚本", parentName: "音频内容", level: 2, icon: "🎙️" },
      { name: "有声书", description: "有声书内容", parentName: "音频内容", level: 2, icon: "📚" },
      { name: "音频广告", description: "音频广告文案", parentName: "音频内容", level: 2, icon: "📻" },
      { name: "语音导览", description: "语音导览内容", parentName: "音频内容", level: 2, icon: "🗺️" },
      { name: "配音文案", description: "配音脚本文案", parentName: "音频内容", level: 2, icon: "🎤" },
      { name: "海报文案", description: "海报设计文案", parentName: "图文设计", level: 2, icon: "🖼️" },
      { name: "信息图表", description: "信息图表设计", parentName: "图文设计", level: 2, icon: "📊" },
      { name: "表情包", description: "表情包创意", parentName: "图文设计", level: 2, icon: "😊" },
      { name: "漫画脚本", description: "漫画内容脚本", parentName: "图文设计", level: 2, icon: "🎨" },
      { name: "PPT设计", description: "PPT内容设计", parentName: "图文设计", level: 2, icon: "📊" },
    ]),
  },
  {
    name: "医疗健康分类体系",
    description: "适用于医疗健康行业的提示词分类结构,涵盖患者沟通、健康教育、医学科普、病历管理等场景",
    industry: "医疗",
    icon: "🏥",
    isOfficial: 1,
    categoryCount: 30,
    level1Count: 5,
    level2Count: 25,
    level3Count: 0,
    downloadCount: 0,
    rating: 0,
    templateData: JSON.stringify([
      { name: "患者沟通", description: "患者交流相关提示词", level: 1, icon: "💬" },
      { name: "健康教育", description: "健康知识教育", level: 1, icon: "📚" },
      { name: "医学科普", description: "医学知识科普", level: 1, icon: "🔬" },
      { name: "病历管理", description: "病历文档管理", level: 1, icon: "📋" },
      { name: "医院管理", description: "医院运营管理", level: 1, icon: "🏢" },
      { name: "问诊记录", description: "问诊内容记录", parentName: "患者沟通", level: 2, icon: "📝" },
      { name: "病情解释", description: "病情说明解释", parentName: "患者沟通", level: 2, icon: "💡" },
      { name: "用药指导", description: "用药说明指导", parentName: "患者沟通", level: 2, icon: "💊" },
      { name: "术前沟通", description: "手术前沟通", parentName: "患者沟通", level: 2, icon: "🏥" },
      { name: "随访记录", description: "患者随访记录", parentName: "患者沟通", level: 2, icon: "📞" },
      { name: "疾病预防", description: "疾病预防知识", parentName: "健康教育", level: 2, icon: "🛡️" },
      { name: "营养指导", description: "营养健康指导", parentName: "健康教育", level: 2, icon: "🥗" },
      { name: "运动康复", description: "运动康复指导", parentName: "健康教育", level: 2, icon: "🏃" },
      { name: "心理健康", description: "心理健康教育", parentName: "健康教育", level: 2, icon: "🧠" },
      { name: "慢病管理", description: "慢性病管理", parentName: "健康教育", level: 2, icon: "📊" },
      { name: "疾病科普", description: "常见疾病科普", parentName: "医学科普", level: 2, icon: "📖" },
      { name: "急救知识", description: "急救常识科普", parentName: "医学科普", level: 2, icon: "🚑" },
      { name: "用药常识", description: "用药安全知识", parentName: "医学科普", level: 2, icon: "💊" },
      { name: "体检指南", description: "体检项目指南", parentName: "医学科普", level: 2, icon: "🔍" },
      { name: "健康谣言", description: "健康谣言辟谣", parentName: "医学科普", level: 2, icon: "⚠️" },
      { name: "病历书写", description: "病历文书撰写", parentName: "病历管理", level: 2, icon: "✍️" },
      { name: "诊断报告", description: "诊断报告撰写", parentName: "病历管理", level: 2, icon: "📄" },
      { name: "手术记录", description: "手术记录整理", parentName: "病历管理", level: 2, icon: "🏥" },
      { name: "出院小结", description: "出院小结撰写", parentName: "病历管理", level: 2, icon: "📋" },
      { name: "会诊记录", description: "会诊讨论记录", parentName: "病历管理", level: 2, icon: "👥" },
      { name: "排班管理", description: "医护排班管理", parentName: "医院管理", level: 2, icon: "📅" },
      { name: "质量管理", description: "医疗质量管理", parentName: "医院管理", level: 2, icon: "⭐" },
      { name: "培训计划", description: "医护培训计划", parentName: "医院管理", level: 2, icon: "📚" },
      { name: "应急预案", description: "应急预案制定", parentName: "医院管理", level: 2, icon: "🚨" },
      { name: "工作总结", description: "工作总结报告", parentName: "医院管理", level: 2, icon: "📊" },
    ]),
  },
  {
    name: "企业管理分类体系",
    description: "适用于企业管理人员的提示词分类结构,涵盖人力资源、项目管理、市场营销、财务管理等场景",
    industry: "企业管理",
    icon: "💼",
    isOfficial: 1,
    categoryCount: 30,
    level1Count: 5,
    level2Count: 25,
    level3Count: 0,
    downloadCount: 0,
    rating: 0,
    templateData: JSON.stringify([
      { name: "人力资源", description: "人力资源管理", level: 1, icon: "👥" },
      { name: "项目管理", description: "项目管理相关", level: 1, icon: "📊" },
      { name: "市场营销", description: "市场营销策划", level: 1, icon: "📢" },
      { name: "财务管理", description: "财务管理相关", level: 1, icon: "💰" },
      { name: "行政办公", description: "行政办公事务", level: 1, icon: "📝" },
      { name: "招聘管理", description: "招聘流程管理", parentName: "人力资源", level: 2, icon: "🔍" },
      { name: "培训发展", description: "员工培训发展", parentName: "人力资源", level: 2, icon: "📚" },
      { name: "绩效考核", description: "绩效管理考核", parentName: "人力资源", level: 2, icon: "📈" },
      { name: "薪酬福利", description: "薪酬福利管理", parentName: "人力资源", level: 2, icon: "💵" },
      { name: "员工关系", description: "员工关系管理", parentName: "人力资源", level: 2, icon: "🤝" },
      { name: "项目规划", description: "项目计划制定", parentName: "项目管理", level: 2, icon: "📋" },
      { name: "任务分配", description: "任务分配管理", parentName: "项目管理", level: 2, icon: "✅" },
      { name: "进度跟踪", description: "项目进度跟踪", parentName: "项目管理", level: 2, icon: "📊" },
      { name: "风险管理", description: "项目风险管理", parentName: "项目管理", level: 2, icon: "⚠️" },
      { name: "项目总结", description: "项目复盘总结", parentName: "项目管理", level: 2, icon: "📝" },
      { name: "市场调研", description: "市场调研分析", parentName: "市场营销", level: 2, icon: "🔍" },
      { name: "营销策划", description: "营销活动策划", parentName: "市场营销", level: 2, icon: "🎯" },
      { name: "品牌推广", description: "品牌推广策略", parentName: "市场营销", level: 2, icon: "🏆" },
      { name: "客户关系", description: "客户关系管理", parentName: "市场营销", level: 2, icon: "💬" },
      { name: "数据分析", description: "营销数据分析", parentName: "市场营销", level: 2, icon: "📊" },
      { name: "预算管理", description: "预算编制管理", parentName: "财务管理", level: 2, icon: "💰" },
      { name: "成本控制", description: "成本控制分析", parentName: "财务管理", level: 2, icon: "📉" },
      { name: "财务报表", description: "财务报表分析", parentName: "财务管理", level: 2, icon: "📊" },
      { name: "税务筹划", description: "税务规划筹划", parentName: "财务管理", level: 2, icon: "📋" },
      { name: "投资分析", description: "投资决策分析", parentName: "财务管理", level: 2, icon: "📈" },
      { name: "会议管理", description: "会议组织管理", parentName: "行政办公", level: 2, icon: "📅" },
      { name: "文档撰写", description: "公文文档撰写", parentName: "行政办公", level: 2, icon: "📝" },
      { name: "流程优化", description: "流程优化改进", parentName: "行政办公", level: 2, icon: "⚙️" },
      { name: "资产管理", description: "资产设备管理", parentName: "行政办公", level: 2, icon: "🏢" },
      { name: "后勤保障", description: "后勤服务保障", parentName: "行政办公", level: 2, icon: "🔧" },
    ]),
  },
];

async function seedTemplates() {
  let connection;
  
  try {
    console.log("开始插入分类模板数据...");
    
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    for (const template of templates) {
      const [result] = await connection.execute(
        `INSERT INTO categoryTemplates 
        (name, description, industry, icon, templateData, categoryCount, level1Count, level2Count, level3Count, isOfficial, downloadCount, rating) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          template.name,
          template.description,
          template.industry,
          template.icon,
          template.templateData,
          template.categoryCount,
          template.level1Count,
          template.level2Count,
          template.level3Count,
          template.isOfficial,
          template.downloadCount,
          template.rating,
        ]
      );
      console.log(`✓ 已插入: ${template.name}`);
    }
    
    console.log("\n所有模板插入完成!");
    console.log(`共插入 ${templates.length} 个行业模板`);
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("插入失败:", error);
    if (connection) await connection.end();
    process.exit(1);
  }
}

seedTemplates();
