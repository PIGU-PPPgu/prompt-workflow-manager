/**
 * Subscription products and pricing configuration
 * 
 * 定价策略:
 * - 免费版: 50个提示词, 10次AI优化/月
 * - 基础版: ¥9.9/月 - 200个提示词, 100次AI优化/月, 版本管理
 * - 专业版: ¥19.9/月 - 无限提示词, 500次AI优化/月, 多模型对比, 批量操作
 */

export type SubscriptionTier = 'free' | 'basic' | 'pro';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number; // 单位: 元
  priceId?: string; // Stripe Price ID (在Stripe Dashboard创建后填入)
  interval: 'month' | 'year';
  features: {
    maxPrompts: number; // 最大提示词数量
    maxOptimizations: number; // 每月AI优化次数
    maxAgents: number; // 最大智能体数量
    maxWorkflows: number; // 最大工作流数量
    versionControl: boolean; // 版本管理
    multiModelComparison: boolean; // 多模型对比
    batchOperations: boolean; // 批量操作
    dataExport: boolean; // 数据导出
    prioritySupport: boolean; // 优先客服
  };
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: '免费版',
    price: 0,
    interval: 'month',
    features: {
      maxPrompts: 50,
      maxOptimizations: 10,
      maxAgents: 10,
      maxWorkflows: 10,
      versionControl: false,
      multiModelComparison: false,
      batchOperations: false,
      dataExport: false,
      prioritySupport: false,
    },
  },
  basic: {
    id: 'basic',
    name: '基础版',
    price: 9.9,
    priceId: process.env.STRIPE_BASIC_PRICE_ID, // 需要在Stripe Dashboard创建
    interval: 'month',
    features: {
      maxPrompts: 200,
      maxOptimizations: 100,
      maxAgents: 50,
      maxWorkflows: 50,
      versionControl: true,
      multiModelComparison: false,
      batchOperations: false,
      dataExport: true,
      prioritySupport: false,
    },
  },
  pro: {
    id: 'pro',
    name: '专业版',
    price: 19.9,
    priceId: process.env.STRIPE_PRO_PRICE_ID, // 需要在Stripe Dashboard创建
    interval: 'month',
    features: {
      maxPrompts: -1, // -1 表示无限
      maxOptimizations: 500,
      maxAgents: -1,
      maxWorkflows: -1,
      versionControl: true,
      multiModelComparison: true,
      batchOperations: true,
      dataExport: true,
      prioritySupport: true,
    },
  },
};

/**
 * 检查用户是否达到功能限制
 */
export function checkFeatureLimit(
  userTier: SubscriptionTier,
  feature: keyof SubscriptionPlan['features'],
  currentCount?: number
): { allowed: boolean; limit: number | boolean } {
  const plan = SUBSCRIPTION_PLANS[userTier];
  const featureValue = plan.features[feature];

  // 布尔类型功能
  if (typeof featureValue === 'boolean') {
    return { allowed: featureValue, limit: featureValue };
  }

  // 数字类型功能(-1表示无限)
  if (featureValue === -1) {
    return { allowed: true, limit: -1 };
  }

  // 检查是否超过限制
  if (currentCount !== undefined) {
    return { allowed: currentCount < featureValue, limit: featureValue };
  }

  return { allowed: true, limit: featureValue };
}

/**
 * 获取用户当前订阅计划
 */
export function getUserPlan(userTier: SubscriptionTier): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[userTier];
}
