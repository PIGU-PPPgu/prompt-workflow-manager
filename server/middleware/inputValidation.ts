/**
 * 输入验证与安全增强模块
 *
 * 功能：
 * - XSS 防护（HTML/Script 注入）
 * - SQL 注入防护
 * - 文件上传安全（CSV/JSON）
 * - 敏感词过滤
 * - 长度和格式验证
 * - URL 安全检查
 */

import sanitizeHtmlLib from 'sanitize-html';
import { promises as dns } from 'dns';
import * as ipaddr from 'ipaddr.js';

// ============ XSS 防护 ============

/**
 * 移除危险的 HTML 标签和脚本
 * 使用 sanitize-html 库进行安全的 HTML 清理
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  return sanitizeHtmlLib(input, {
    // 允许的标签（仅允许基本的文本格式标签）
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    // 允许的属性（非常有限）
    allowedAttributes: {},
    // 不允许的标签直接移除内容
    disallowedTagsMode: 'discard',
    // 移除所有协议（防止 javascript:, data: 等）
    allowedSchemes: [],
    // 不允许 iframe
    allowedIframeHostnames: [],
  });
}

/**
 * 严格清理（移除所有 HTML 标签）
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '');
}

/**
 * HTML 实体编码（用于显示用户输入）
 */
export function escapeHtml(input: string): string {
  if (!input) return '';

  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'\/]/g, (char) => entityMap[char] || char);
}

// ============ SQL 注入防护 ============

/**
 * ⚠️ 重要：SQL 注入的真正防御措施是使用参数化查询（Prepared Statements）
 *
 * 本模块的检测函数仅用于日志记录和监控，不应用于数据清理。
 * 任何基于字符串替换的 SQL "清理" 都会：
 * 1. 破坏合法数据（例如：用户名包含单引号）
 * 2. 仍然无法防止所有注入攻击
 *
 * ✅ 正确做法：始终使用 ORM（如 Drizzle）或参数化查询
 * ❌ 错误做法：尝试通过字符串替换清理 SQL
 */

/**
 * 检测潜在的 SQL 注入模式（仅用于日志/监控）
 * @deprecated 仅用于监控，不应作为安全防护手段
 */
export function detectSqlInjection(input: string): boolean {
  if (!input) return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(union\s+select)/i,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * @deprecated 已弃用：不要使用此函数清理 SQL
 *
 * 此函数会破坏合法数据且无法真正防止 SQL 注入。
 * 请使用参数化查询代替。
 */
export function sanitizeSql(input: string): string {
  console.warn('sanitizeSql is deprecated and should not be used. Use parameterized queries instead.');
  return input; // 不再进行任何清理，避免破坏数据
}

// ============ 敏感词过滤 ============

/**
 * 教育行业敏感词黑名单（防止泄题、不当内容）
 */
const SENSITIVE_KEYWORDS = [
  // 考试泄密相关
  '答案', '泄题', '作弊', '考试答案',
  // 个人隐私相关
  '身份证号', '手机号码', '家庭住址', '银行卡号',
  // 不当内容（示例，需根据实际情况扩充）
  '暴力', '色情',
];

/**
 * 检测敏感词
 */
export function detectSensitiveWords(input: string): { found: boolean; words: string[] } {
  if (!input) return { found: false, words: [] };

  const foundWords: string[] = [];
  const lowerInput = input.toLowerCase();

  for (const keyword of SENSITIVE_KEYWORDS) {
    if (lowerInput.includes(keyword.toLowerCase())) {
      foundWords.push(keyword);
    }
  }

  return {
    found: foundWords.length > 0,
    words: foundWords,
  };
}

// ============ 长度和格式验证 ============

/**
 * 验证字符串长度
 */
export function validateLength(input: string, min: number, max: number): { valid: boolean; error?: string } {
  if (!input) {
    return { valid: false, error: '输入不能为空' };
  }

  const length = input.length;

  if (length < min) {
    return { valid: false, error: `输入长度不能少于 ${min} 个字符` };
  }

  if (length > max) {
    return { valid: false, error: `输入长度不能超过 ${max} 个字符` };
  }

  return { valid: true };
}

/**
 * 验证 Email 格式
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证 URL 格式
 */
export function validateUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    // 只允许 http 和 https 协议
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 验证 URL 安全性（防止 SSRF）
 * 使用 DNS 解析和 IP 地址验证，防止绕过
 */
export async function isSafeUrl(url: string): Promise<{ safe: boolean; reason?: string }> {
  if (!validateUrl(url)) {
    return { safe: false, reason: 'URL 格式不正确' };
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // 危险的元数据服务域名（直接阻止）
    const dangerousHosts = [
      'metadata.google.internal', // GCP metadata
      'metadata.azure.com',         // Azure metadata
      'metadata',                   // Generic metadata
    ];

    if (dangerousHosts.includes(hostname)) {
      return { safe: false, reason: '禁止访问云服务元数据地址' };
    }

    // 检查是否为 IP 地址
    let ipsToCheck: string[] = [];

    if (ipaddr.isValid(hostname)) {
      // 直接是 IP 地址
      ipsToCheck.push(hostname);
    } else {
      // 是域名，需要 DNS 解析
      try {
        // 解析 IPv4
        const ipv4Addresses = await dns.resolve4(hostname).catch(() => []);
        ipsToCheck.push(...ipv4Addresses);

        // 解析 IPv6
        const ipv6Addresses = await dns.resolve6(hostname).catch(() => []);
        ipsToCheck.push(...ipv6Addresses);

        // 如果无法解析任何 IP，返回错误
        if (ipsToCheck.length === 0) {
          return { safe: false, reason: '无法解析域名' };
        }
      } catch (error) {
        return { safe: false, reason: '域名解析失败' };
      }
    }

    // 检查所有解析到的 IP 地址
    for (const ip of ipsToCheck) {
      try {
        const addr = ipaddr.process(ip);

        // 检查是否为私有地址
        if (addr.range() === 'private' ||
            addr.range() === 'loopback' ||
            addr.range() === 'linkLocal' ||
            addr.range() === 'uniqueLocal') {
          return { safe: false, reason: `禁止访问内网地址: ${ip}` };
        }

        // 额外检查云服务元数据 IP（169.254.169.254）
        if (ip === '169.254.169.254' || ip === 'fd00:ec2::254') {
          return { safe: false, reason: '禁止访问云服务元数据 IP' };
        }

        // 检查是否为 IPv4 映射的 IPv6 地址（可能绕过检查）
        if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
          const ipv4 = addr.toIPv4Address();
          if (ipv4.range() === 'private' ||
              ipv4.range() === 'loopback' ||
              ipv4.range() === 'linkLocal') {
            return { safe: false, reason: `禁止访问内网地址（IPv4映射）: ${ip}` };
          }
        }
      } catch (error) {
        return { safe: false, reason: `无效的 IP 地址: ${ip}` };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'URL 解析失败' };
  }
}

/**
 * 同步版本的 isSafeUrl（不进行 DNS 解析，仅基本检查）
 * 用于不支持异步的场景
 */
export function isSafeUrlSync(url: string): { safe: boolean; reason?: string } {
  if (!validateUrl(url)) {
    return { safe: false, reason: 'URL 格式不正确' };
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // 可信的 Webhook 服务域名（企业通讯工具）
    const trustedWebhookDomains = [
      'open.feishu.cn',        // 飞书
      'open.larksuite.com',    // Lark (国际版飞书)
      'oapi.dingtalk.com',     // 钉钉
      'qyapi.weixin.qq.com',   // 企业微信
      'hooks.slack.com',       // Slack
      'discord.com',           // Discord
    ];

    // 检查是否为可信 Webhook 域名
    for (const trustedDomain of trustedWebhookDomains) {
      if (hostname === trustedDomain || hostname.endsWith('.' + trustedDomain)) {
        return { safe: true };
      }
    }

    // 危险的元数据服务域名
    const dangerousHosts = [
      'localhost',
      'metadata.google.internal',
      'metadata.azure.com',
      'metadata',
    ];

    if (dangerousHosts.includes(hostname)) {
      return { safe: false, reason: '禁止访问内网/元数据地址' };
    }

    // 如果是有效的 IP 地址，进行检查
    if (ipaddr.isValid(hostname)) {
      try {
        const addr = ipaddr.process(hostname);

        if (addr.range() === 'private' ||
            addr.range() === 'loopback' ||
            addr.range() === 'linkLocal' ||
            addr.range() === 'uniqueLocal') {
          return { safe: false, reason: '禁止访问内网地址' };
        }

        // 检查云服务元数据 IP
        if (hostname === '169.254.169.254' || hostname === 'fd00:ec2::254') {
          return { safe: false, reason: '禁止访问云服务元数据 IP' };
        }

        // 检查 IPv4 映射的 IPv6
        if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
          const ipv4 = addr.toIPv4Address();
          if (ipv4.range() === 'private' ||
              ipv4.range() === 'loopback' ||
              ipv4.range() === 'linkLocal') {
            return { safe: false, reason: '禁止访问内网地址（IPv4映射）' };
          }
        }
      } catch {
        return { safe: false, reason: '无效的 IP 地址' };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'URL 解析失败' };
  }
}

// ============ 文件上传安全 ============

/**
 * 检测 CSV 公式注入（Formula Injection）
 *
 * CSV 文件中以 =, +, -, @ 开头的单元格可能被 Excel 等软件
 * 解释为公式，可能导致远程代码执行或信息泄露。
 */
export function detectCsvFormulaInjection(content: string): { found: boolean; dangerousCells: string[] } {
  if (!content) return { found: false, dangerousCells: [] };

  const dangerousCells: string[] = [];
  const lines = content.split('\n');

  // 检查每一行的每个单元格
  for (let i = 0; i < Math.min(lines.length, 1000); i++) { // 只检查前1000行
    const line = lines[i];
    if (!line.trim()) continue;

    // 简单的 CSV 解析（处理引号包裹的字段）
    const cells = line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));

    for (const cell of cells) {
      // 检查是否以危险字符开头
      if (cell.length > 0 && /^[=+\-@]/.test(cell)) {
        dangerousCells.push(cell.substring(0, 50)); // 记录前50个字符
      }
    }
  }

  return {
    found: dangerousCells.length > 0,
    dangerousCells: dangerousCells.slice(0, 5), // 最多返回5个示例
  };
}

/**
 * 清理 CSV 公式注入（在危险字符前添加单引号）
 */
export function sanitizeCsvFormulaInjection(content: string): string {
  if (!content) return '';

  const lines = content.split('\n');
  const sanitizedLines: string[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      sanitizedLines.push(line);
      continue;
    }

    // 简单的 CSV 解析
    const cells = line.split(',');
    const sanitizedCells = cells.map(cell => {
      const trimmed = cell.trim();
      // 如果单元格以危险字符开头，添加单引号前缀
      if (trimmed.length > 0 && /^[=+\-@]/.test(trimmed)) {
        // 如果已经有引号包裹，在内容前加单引号
        if (/^["']/.test(trimmed)) {
          return trimmed.replace(/^(["'])/, '$1\'');
        }
        // 否则直接添加单引号
        return `'${trimmed}`;
      }
      return cell;
    });

    sanitizedLines.push(sanitizedCells.join(','));
  }

  return sanitizedLines.join('\n');
}

/**
 * 验证 CSV 内容安全性
 */
export function validateCsvContent(content: string, maxSizeMB: number = 5): { valid: boolean; error?: string; warnings?: string[] } {
  if (!content) {
    return { valid: false, error: 'CSV 内容为空' };
  }

  const warnings: string[] = [];

  // 检查文件大小
  const sizeInMB = new Blob([content]).size / (1024 * 1024);
  if (sizeInMB > maxSizeMB) {
    return { valid: false, error: `文件大小超过限制 (${maxSizeMB}MB)` };
  }

  // 检查行数（防止过大的文件）
  const lines = content.split('\n');
  if (lines.length > 10000) {
    return { valid: false, error: 'CSV 行数超过限制 (10,000行)' };
  }

  // 检查 CSV 公式注入
  const formulaCheck = detectCsvFormulaInjection(content);
  if (formulaCheck.found) {
    warnings.push(
      `检测到潜在的 CSV 公式注入风险。` +
      `以下单元格以 =, +, -, @ 开头：${formulaCheck.dangerousCells.join(', ')}。` +
      `建议使用 sanitizeCsvFormulaInjection() 清理。`
    );
  }

  // 注意：移除了 SQL 注入检测，因为：
  // 1. CSV 文件可能包含合法的 SQL 关键字
  // 2. 真正的防护应该在数据库查询层使用参数化查询
  // 3. 字符串匹配会产生误报，破坏用户数据

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * 验证 JSON 内容安全性
 */
export function validateJsonContent(content: string, maxSizeMB: number = 5): { valid: boolean; error?: string; data?: any } {
  if (!content) {
    return { valid: false, error: 'JSON 内容为空' };
  }

  // 检查文件大小
  const sizeInMB = new Blob([content]).size / (1024 * 1024);
  if (sizeInMB > maxSizeMB) {
    return { valid: false, error: `文件大小超过限制 (${maxSizeMB}MB)` };
  }

  // 尝试解析 JSON
  try {
    const parsed = JSON.parse(content);

    // 检查深度（防止嵌套炸弹）
    const depth = getJsonDepth(parsed);
    if (depth > 10) {
      return { valid: false, error: 'JSON 嵌套层级过深' };
    }

    return { valid: true, data: parsed };
  } catch (error) {
    return { valid: false, error: 'JSON 格式错误' };
  }
}

/**
 * 计算 JSON 深度
 */
function getJsonDepth(obj: any, currentDepth: number = 0): number {
  if (typeof obj !== 'object' || obj === null) {
    return currentDepth;
  }

  let maxDepth = currentDepth;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const depth = getJsonDepth(obj[key], currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  }

  return maxDepth;
}

// ============ 加密验证 ============

/**
 * 验证密码强度
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string; strength?: 'weak' | 'medium' | 'strong' } {
  if (!password) {
    return { valid: false, error: '密码不能为空' };
  }

  if (password.length < 8) {
    return { valid: false, error: '密码长度至少为 8 个字符' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const criteriaCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

  if (criteriaCount < 2) {
    return { valid: false, error: '密码必须包含至少2种类型（大写、小写、数字、特殊字符）', strength: 'weak' };
  }

  if (criteriaCount === 2) {
    return { valid: true, strength: 'medium' };
  }

  return { valid: true, strength: 'strong' };
}

/**
 * 验证 API Key 格式
 */
export function validateApiKey(key: string): { valid: boolean; error?: string } {
  if (!key) {
    return { valid: false, error: 'API Key 不能为空' };
  }

  // 长度检查
  if (key.length < 16 || key.length > 256) {
    return { valid: false, error: 'API Key 长度不合法' };
  }

  // 格式检查（只允许字母、数字、中划线、下划线）
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    return { valid: false, error: 'API Key 格式不正确' };
  }

  return { valid: true };
}

// ============ 综合验证函数 ============

/**
 * 验证提示词内容
 */
export function validatePromptContent(content: string): { valid: boolean; error?: string; warnings?: string[] } {
  const warnings: string[] = [];

  // 长度检查
  const lengthCheck = validateLength(content, 1, 50000);
  if (!lengthCheck.valid) {
    return { valid: false, error: lengthCheck.error };
  }

  // XSS 检查（警告，不阻止）
  const original = content;
  const sanitized = sanitizeHtml(content);
  if (original !== sanitized) {
    warnings.push('内容包含潜在的不安全 HTML 标签，已自动清理');
  }

  // 敏感词检查
  const sensitiveCheck = detectSensitiveWords(content);
  if (sensitiveCheck.found) {
    warnings.push(`内容包含敏感词: ${sensitiveCheck.words.join(', ')}`);
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * 验证用户输入（通用）
 */
export function validateUserInput(
  input: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowHtml?: boolean;
    checkSensitive?: boolean;
  } = {}
): { valid: boolean; sanitized: string; error?: string; warnings?: string[] } {
  const {
    minLength = 1,
    maxLength = 10000,
    allowHtml = false,
    checkSensitive = true,
  } = options;

  if (!input) {
    return { valid: false, sanitized: '', error: '输入不能为空' };
  }

  const warnings: string[] = [];

  // 长度检查
  const lengthCheck = validateLength(input, minLength, maxLength);
  if (!lengthCheck.valid) {
    return { valid: false, sanitized: input, error: lengthCheck.error };
  }

  // HTML 清理
  let sanitized = input;
  if (!allowHtml) {
    sanitized = sanitizeHtml(input);
    if (sanitized !== input) {
      warnings.push('已清理不安全的 HTML 内容');
    }
  }

  // 敏感词检查
  if (checkSensitive) {
    const sensitiveCheck = detectSensitiveWords(sanitized);
    if (sensitiveCheck.found) {
      warnings.push(`包含敏感词: ${sensitiveCheck.words.join(', ')}`);
    }
  }

  return {
    valid: true,
    sanitized,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ============ 导出配置 ============

/**
 * 输入验证配置
 */
export const VALIDATION_CONFIG = {
  // 提示词
  prompt: {
    minLength: 1,
    maxLength: 50000,
    allowHtml: false,
    checkSensitive: true,
  },
  // 标题
  title: {
    minLength: 1,
    maxLength: 200,
    allowHtml: false,
    checkSensitive: false,
  },
  // 描述
  description: {
    minLength: 0,
    maxLength: 1000,
    allowHtml: false,
    checkSensitive: false,
  },
  // 标签
  tags: {
    minLength: 1,
    maxLength: 500,
    allowHtml: false,
    checkSensitive: false,
  },
  // URL
  url: {
    minLength: 1,
    maxLength: 2048,
    allowHtml: false,
    checkSensitive: false,
  },
  // 文件上传
  file: {
    maxSizeMB: 5,
    maxLines: 10000,
    maxDepth: 10,
  },
} as const;
