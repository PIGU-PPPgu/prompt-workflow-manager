/**
 * API 速率限制中间件
 *
 * 使用内存存储的简单速率限制实现
 * 针对不同API端点和用户级别设置不同的限制
 *
 * 功能特性：
 * - 全局开关控制（默认关闭，可随时启用）
 * - 支持按用户等级动态调整限制
 * - 提供管理接口查看和修改配置
 * - 内存存储，自动清理过期记录
 */

interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
  message?: string; // 超限提示消息
  enabled?: boolean; // 是否启用（默认false）
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// 内存存储
const store: RateLimitStore = {};

// 全局开关（默认关闭）
let globalEnabled = false;

// 定期清理过期的记录（每小时）
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60 * 60 * 1000);

/**
 * 速率限制配置（默认所有限制都关闭，enabled=false）
 *
 * 使用说明：
 * 1. 修改配置后无需重启服务器（内存配置）
 * 2. 使用管理接口动态启用/禁用限制
 * 3. 可按API类型单独控制
 */
export const RATE_LIMITS = {
  // AI优化接口 - 按用户级别区分
  optimize: {
    enabled: false, // 总开关
    free: { windowMs: 60 * 60 * 1000, maxRequests: 10, message: "免费用户每小时限制10次优化", enabled: false },
    basic: { windowMs: 60 * 60 * 1000, maxRequests: 50, message: "基础版每小时限制50次优化", enabled: false },
    pro: { windowMs: 60 * 60 * 1000, maxRequests: 100, message: "专业版每小时限制100次优化", enabled: false },
    admin: { windowMs: 60 * 60 * 1000, maxRequests: 1000, message: "管理员每小时限制1000次优化", enabled: false },
  },

  // 批量导入接口
  import: {
    enabled: false,
    all: { windowMs: 60 * 60 * 1000, maxRequests: 5, message: "每小时限制5次批量导入", enabled: false },
  },

  // 分享链接创建
  createShare: {
    enabled: false,
    all: { windowMs: 60 * 60 * 1000, maxRequests: 20, message: "每小时限制创建20个分享链接", enabled: false },
  },

  // 通用API限制（防止滥用）
  general: {
    enabled: false,
    all: { windowMs: 60 * 1000, maxRequests: 100, message: "每分钟限制100次请求", enabled: false },
  },

  // AI图片生成接口 - 按用户级别区分
  imageGeneration: {
    enabled: false, // 总开关
    free: { windowMs: 60 * 60 * 1000, maxRequests: 5, message: "免费用户每小时限制5次图片生成", enabled: false },
    basic: { windowMs: 60 * 60 * 1000, maxRequests: 20, message: "基础版每小时限制20次图片生成", enabled: false },
    pro: { windowMs: 60 * 60 * 1000, maxRequests: 50, message: "专业版每小时限制50次图片生成", enabled: false },
    admin: { windowMs: 60 * 60 * 1000, maxRequests: 500, message: "管理员每小时限制500次图片生成", enabled: false },
  },
};

/**
 * 检查速率限制
 *
 * @param identifier 唯一标识符（通常是 "type:userId"）
 * @param config 限制配置
 * @param skipIfDisabled 如果禁用则跳过检查（默认true）
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  skipIfDisabled: boolean = true
): { allowed: boolean; remaining: number; resetTime: number; disabled: boolean } {
  // 如果全局禁用或配置禁用，直接通过
  if (skipIfDisabled && (!globalEnabled || config.enabled === false)) {
    return {
      allowed: true,
      remaining: -1, // -1 表示未启用限制
      resetTime: 0,
      disabled: true,
    };
  }

  const now = Date.now();
  const record = store[identifier];

  // 如果没有记录或已过期，创建新记录
  if (!record || record.resetTime < now) {
    store[identifier] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: store[identifier].resetTime,
      disabled: false,
    };
  }

  // 如果未超限，增加计数
  if (record.count < config.maxRequests) {
    record.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
      disabled: false,
    };
  }

  // 超限
  return {
    allowed: false,
    remaining: 0,
    resetTime: record.resetTime,
    disabled: false,
  };
}

/**
 * tRPC中间件：AI优化速率限制
 */
export function createOptimizeRateLimiter() {
  return async function optimizeRateLimiter(opts: any) {
    const { ctx } = opts;
    const userId = ctx.user?.id;

    if (!userId) {
      throw new Error("未登录");
    }

    // ⚠️ 性能优化：先检查是否启用，避免不必要的数据库查询
    if (!globalEnabled || !RATE_LIMITS.optimize.enabled) {
      return opts.next();
    }

    // 获取用户订阅等级（仅在启用时才查询）
    const { getUserSubscription } = await import("../db");
    const subscription = await getUserSubscription(userId);
    const tier: 'free' | 'basic' | 'pro' | 'admin' = (ctx.user.role === 'admin' ? 'admin' : subscription?.subscriptionTier || 'free') as 'free' | 'basic' | 'pro' | 'admin';

    const config = RATE_LIMITS.optimize[tier];
    const identifier = `optimize:${userId}`;

    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
      const resetDate = new Date(result.resetTime);
      throw new Error(
        `${config.message}。重置时间：${resetDate.toLocaleTimeString('zh-CN')}`
      );
    }

    // 继续执行
    return opts.next();
  };
}

/**
 * tRPC中间件：批量导入速率限制
 */
export function createImportRateLimiter() {
  return async function importRateLimiter(opts: any) {
    const { ctx } = opts;
    const userId = ctx.user?.id;

    if (!userId) {
      throw new Error("未登录");
    }

    const config = RATE_LIMITS.import.all;
    const identifier = `import:${userId}`;

    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
      const resetDate = new Date(result.resetTime);
      throw new Error(
        `${config.message}。重置时间：${resetDate.toLocaleTimeString('zh-CN')}`
      );
    }

    return opts.next();
  };
}

/**
 * tRPC中间件：分享链接创建速率限制
 */
export function createShareRateLimiter() {
  return async function shareRateLimiter(opts: any) {
    const { ctx } = opts;
    const userId = ctx.user?.id;

    if (!userId) {
      throw new Error("未登录");
    }

    const config = RATE_LIMITS.createShare.all;
    const identifier = `share:${userId}`;

    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
      const resetDate = new Date(result.resetTime);
      throw new Error(
        `${config.message}。重置时间：${resetDate.toLocaleTimeString('zh-CN')}`
      );
    }

    return opts.next();
  };
}

/**
 * tRPC中间件：AI图片生成速率限制
 */
export function createImageGenerationRateLimiter() {
  return async function imageGenerationRateLimiter(opts: any) {
    const { ctx } = opts;
    const userId = ctx.user?.id;

    if (!userId) {
      throw new Error("未登录");
    }

    // ⚠️ 性能优化：先检查是否启用，避免不必要的数据库查询
    if (!globalEnabled || !RATE_LIMITS.imageGeneration.enabled) {
      return opts.next();
    }

    // 获取用户订阅等级（仅在启用时才查询）
    const { getUserSubscription } = await import("../db");
    const subscription = await getUserSubscription(userId);
    const tier: 'free' | 'basic' | 'pro' | 'admin' = (ctx.user.role === 'admin' ? 'admin' : subscription?.subscriptionTier || 'free') as 'free' | 'basic' | 'pro' | 'admin';

    const config = RATE_LIMITS.imageGeneration[tier];
    const identifier = `imageGeneration:${userId}`;

    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
      const resetDate = new Date(result.resetTime);
      throw new Error(
        `${config.message}。重置时间：${resetDate.toLocaleTimeString('zh-CN')}`
      );
    }

    // 继续执行
    return opts.next();
  };
}

/**
 * 通用速率限制检查（可用于其他场景）
 */
export async function checkGeneralRateLimit(userId: number): Promise<void> {
  const config = RATE_LIMITS.general.all;
  const identifier = `general:${userId}`;

  const result = checkRateLimit(identifier, config);

  if (!result.allowed) {
    const resetDate = new Date(result.resetTime);
    throw new Error(
      `${config.message}。重置时间：${resetDate.toLocaleTimeString('zh-CN')}`
    );
  }
}

/**
 * 获取用户当前速率限制状态
 */
export function getRateLimitStatus(
  userId: number,
  type: 'optimize' | 'import' | 'createShare' | 'general' | 'imageGeneration',
  tier?: 'free' | 'basic' | 'pro' | 'admin'
) {
  const identifier = `${type}:${userId}`;
  const record = store[identifier];

  // 获取配置以计算 maxRequests
  let maxRequests = 0;
  const typeConfig = RATE_LIMITS[type] as any;

  if (typeConfig) {
    if ((type === 'optimize' || type === 'imageGeneration') && tier) {
      // AI优化接口和图片生成接口按用户等级区分
      maxRequests = typeConfig[tier]?.maxRequests || 0;
    } else {
      // 其他接口使用统一配置
      maxRequests = typeConfig.all?.maxRequests || 0;
    }
  }

  if (!record || record.resetTime < Date.now()) {
    return {
      used: 0,
      remaining: maxRequests,
      resetTime: null,
      maxRequests,
    };
  }

  return {
    used: record.count,
    remaining: Math.max(0, maxRequests - record.count),
    resetTime: record.resetTime,
    maxRequests,
  };
}

// ============ 管理接口 ============

/**
 * 获取全局开关状态
 */
export function isGlobalEnabled(): boolean {
  return globalEnabled;
}

/**
 * 设置全局开关
 */
export function setGlobalEnabled(enabled: boolean): void {
  globalEnabled = enabled;
}

/**
 * 获取所有速率限制配置
 */
export function getRateLimitConfig() {
  return {
    globalEnabled,
    limits: RATE_LIMITS,
  };
}

/**
 * 更新特定类型的限制配置
 */
export function updateRateLimitConfig(
  type: 'optimize' | 'import' | 'createShare' | 'general' | 'imageGeneration',
  tier: string,
  updates: Partial<RateLimitConfig>
): boolean {
  try {
    const limitConfig = RATE_LIMITS[type] as any;
    if (!limitConfig) return false;

    if (tier === 'enabled') {
      // 更新总开关
      limitConfig.enabled = updates.enabled ?? limitConfig.enabled;
    } else {
      // 更新具体层级的配置
      if (limitConfig[tier]) {
        Object.assign(limitConfig[tier], updates);
      } else {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 重置用户的速率限制记录（用于测试或手动重置）
 */
export function resetUserRateLimit(userId: number, type?: string): void {
  if (type) {
    const identifier = `${type}:${userId}`;
    delete store[identifier];
  } else {
    // 删除该用户的所有记录
    Object.keys(store).forEach(key => {
      if (key.endsWith(`:${userId}`)) {
        delete store[key];
      }
    });
  }
}

/**
 * 清空所有速率限制记录
 */
export function clearAllRateLimits(): void {
  Object.keys(store).forEach(key => {
    delete store[key];
  });
}

/**
 * 获取当前内存中的所有速率限制记录（调试用）
 */
export function getAllRateLimitRecords() {
  const now = Date.now();
  const records: Array<{
    identifier: string;
    count: number;
    resetTime: number;
    expired: boolean;
  }> = [];

  Object.keys(store).forEach(key => {
    const record = store[key];
    records.push({
      identifier: key,
      count: record.count,
      resetTime: record.resetTime,
      expired: record.resetTime < now,
    });
  });

  return records;
}

/**
 * 快速配置预设
 */
export const RATE_LIMIT_PRESETS = {
  // 严格模式
  strict: {
    optimize: {
      free: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
      basic: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
      pro: { maxRequests: 50, windowMs: 60 * 60 * 1000 },
    },
    imageGeneration: {
      free: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
      basic: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
      pro: { maxRequests: 30, windowMs: 60 * 60 * 1000 },
    },
    import: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
    createShare: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  },
  // 宽松模式（默认）
  relaxed: {
    optimize: {
      free: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
      basic: { maxRequests: 50, windowMs: 60 * 60 * 1000 },
      pro: { maxRequests: 100, windowMs: 60 * 60 * 1000 },
    },
    imageGeneration: {
      free: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
      basic: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
      pro: { maxRequests: 50, windowMs: 60 * 60 * 1000 },
    },
    import: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
    createShare: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  },
  // 无限制（仅供测试）
  unlimited: {
    optimize: {
      free: { maxRequests: 10000, windowMs: 60 * 60 * 1000 },
      basic: { maxRequests: 10000, windowMs: 60 * 60 * 1000 },
      pro: { maxRequests: 10000, windowMs: 60 * 60 * 1000 },
    },
    imageGeneration: {
      free: { maxRequests: 10000, windowMs: 60 * 60 * 1000 },
      basic: { maxRequests: 10000, windowMs: 60 * 60 * 1000 },
      pro: { maxRequests: 10000, windowMs: 60 * 60 * 1000 },
    },
    import: { maxRequests: 10000, windowMs: 60 * 60 * 1000 },
    createShare: { maxRequests: 10000, windowMs: 60 * 60 * 1000 },
  },
};

/**
 * 应用预设配置
 */
export function applyPreset(preset: 'strict' | 'relaxed' | 'unlimited'): void {
  const config = RATE_LIMIT_PRESETS[preset];

  // 更新optimize配置
  if (config.optimize) {
    Object.entries(config.optimize).forEach(([tier, settings]) => {
      updateRateLimitConfig('optimize', tier, settings);
    });
  }

  // 更新imageGeneration配置
  if (config.imageGeneration) {
    Object.entries(config.imageGeneration).forEach(([tier, settings]) => {
      updateRateLimitConfig('imageGeneration', tier, settings);
    });
  }

  // 更新其他配置
  if (config.import) {
    updateRateLimitConfig('import', 'all', config.import);
  }

  if (config.createShare) {
    updateRateLimitConfig('createShare', 'all', config.createShare);
  }
}
