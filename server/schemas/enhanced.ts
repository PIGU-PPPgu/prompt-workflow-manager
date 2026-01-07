/**
 * 增强的 Zod Schema
 *
 * 集成输入验证和安全检查
 */

import { z } from 'zod';
import {
  sanitizeHtml,
  validateUrl,
  isSafeUrlSync,
  validateEmail,
  validateApiKey,
  validatePasswordStrength,
  detectSensitiveWords,
  VALIDATION_CONFIG,
} from '../middleware/inputValidation';

// ============ 基础 Schema ============

/**
 * 安全的字符串 Schema（自动清理 HTML）
 */
export const SafeString = z.string().transform((val) => sanitizeHtml(val));

/**
 * 纯文本字符串 Schema（移除所有 HTML）
 */
export const PlainString = z.string().transform((val) => val.replace(/<[^>]*>/g, ''));

/**
 * Email Schema
 */
export const Email = z.string().email('邮箱格式不正确').refine(
  (val) => validateEmail(val),
  { message: '邮箱格式不正确' }
);

/**
 * URL Schema（带安全检查）
 */
export const SafeUrl = z.string().refine(
  (val) => validateUrl(val),
  { message: 'URL 格式不正确' }
).refine(
  (val) => {
    const check = isSafeUrlSync(val);
    return check.safe;
  },
  { message: 'URL 不安全，禁止访问内网地址' }
);

/**
 * API Key Schema
 */
export const ApiKeyValue = z.string().refine(
  (val) => {
    const result = validateApiKey(val);
    return result.valid;
  },
  { message: 'API Key 格式不正确' }
);

/**
 * 密码 Schema
 */
export const Password = z.string().superRefine((val, ctx) => {
  const result = validatePasswordStrength(val);
  if (!result.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error || '密码强度不足',
    });
  }
});

// ============ 业务 Schema ============

/**
 * 提示词内容 Schema
 */
export const PromptContent = z.string()
  .min(VALIDATION_CONFIG.prompt.minLength, '提示词内容不能为空')
  .max(VALIDATION_CONFIG.prompt.maxLength, `提示词内容不能超过 ${VALIDATION_CONFIG.prompt.maxLength} 个字符`)
  .transform((val) => sanitizeHtml(val));

/**
 * 提示词标题 Schema
 */
export const PromptTitle = z.string()
  .min(VALIDATION_CONFIG.title.minLength, '标题不能为空')
  .max(VALIDATION_CONFIG.title.maxLength, `标题不能超过 ${VALIDATION_CONFIG.title.maxLength} 个字符`)
  .transform((val) => sanitizeHtml(val));

/**
 * 描述 Schema
 */
export const Description = z.string()
  .max(VALIDATION_CONFIG.description.maxLength, `描述不能超过 ${VALIDATION_CONFIG.description.maxLength} 个字符`)
  .optional()
  .transform((val) => val ? sanitizeHtml(val) : val);

/**
 * 标签 Schema
 */
export const Tags = z.string()
  .max(VALIDATION_CONFIG.tags.maxLength, `标签不能超过 ${VALIDATION_CONFIG.tags.maxLength} 个字符`)
  .optional()
  .transform((val) => val ? sanitizeHtml(val) : val);

/**
 * 教育元数据 Schema
 */
export const GradeLevel = z.string().max(100).optional().transform((val) => val ? sanitizeHtml(val) : val);
export const Subject = z.string().max(100).optional().transform((val) => val ? sanitizeHtml(val) : val);
export const TeachingScene = z.string().max(100).optional().transform((val) => val ? sanitizeHtml(val) : val);
export const TextbookVersion = z.string().max(200).optional().transform((val) => val ? sanitizeHtml(val) : val);

/**
 * CSV 内容 Schema
 */
export const CsvContent = z.string().superRefine((val, ctx) => {
  const { validateCsvContent } = require('../middleware/inputValidation');
  const result = validateCsvContent(val, VALIDATION_CONFIG.file.maxSizeMB);
  if (!result.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error || 'CSV 内容不合法',
    });
  }
});

/**
 * JSON 内容 Schema
 */
export const JsonContent = z.string().superRefine((val, ctx) => {
  const { validateJsonContent } = require('../middleware/inputValidation');
  const result = validateJsonContent(val, VALIDATION_CONFIG.file.maxSizeMB);
  if (!result.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error || 'JSON 内容不合法',
    });
  }
});

// ============ 创建提示词 Schema（完整） ============

export const CreatePromptInput = z.object({
  title: PromptTitle,
  content: PromptContent,
  description: Description,
  categoryId: z.number().optional(),
  scenarioId: z.number().optional(),
  isPublic: z.boolean().optional(),
  tags: Tags,
  variables: z.string().optional(),
  gradeLevel: GradeLevel,
  subject: Subject,
  teachingScene: TeachingScene,
  textbookVersion: TextbookVersion,
});

// ============ 更新提示词 Schema（完整） ============

export const UpdatePromptInput = z.object({
  id: z.number(),
  title: PromptTitle.optional(),
  content: PromptContent.optional(),
  description: Description,
  categoryId: z.number().optional(),
  scenarioId: z.number().optional(),
  isPublic: z.boolean().optional(),
  tags: Tags,
  variables: z.string().optional(),
  gradeLevel: GradeLevel,
  subject: Subject,
  teachingScene: TeachingScene,
  textbookVersion: TextbookVersion,
});

// ============ 导入模板 Schema（增强） ============

export const ImportTemplateInput = z.object({
  fileContent: z.string(),
  fileType: z.enum(['csv', 'json']),
}).superRefine((data, ctx) => {
  if (data.fileType === 'csv') {
    const { validateCsvContent } = require('../middleware/inputValidation');
    const result = validateCsvContent(data.fileContent);
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || '文件内容不合法',
      });
    }
  } else {
    const { validateJsonContent } = require('../middleware/inputValidation');
    const result = validateJsonContent(data.fileContent);
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || '文件内容不合法',
      });
    }
  }
});

// ============ API Key Schema（增强） ============

export const CreateApiKeyInput = z.object({
  name: z.string()
    .min(1, '名称不能为空')
    .max(100, '名称不能超过100个字符')
    .transform((val) => sanitizeHtml(val)),
  provider: z.string()
    .min(1, '提供商不能为空')
    .max(50, '提供商名称不能超过50个字符'),
  apiUrl: z.string().url('URL 格式不正确').optional(),  // 宽松验证，允许各种 AI API 服务商
  keyValue: ApiKeyValue,
  models: z.string().optional(),
  modelMetadata: z.string().optional(),
});

export const UpdateApiKeyInput = z.object({
  id: z.number(),
  name: z.string().optional(),
  provider: z.string().optional(),
  apiUrl: z.string().url('URL 格式不正确').optional(),  // 宽松验证，允许各种 AI API 服务商
  keyValue: ApiKeyValue.optional(),
  models: z.string().optional(),
  modelMetadata: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============ 用户输入 Schema ============

export const UserMessage = z.string()
  .min(1, '消息不能为空')
  .max(5000, '消息不能超过5000个字符')
  .transform((val) => sanitizeHtml(val));

// ============ 分类导入 Schema ============

/**
 * 单个分类项 Schema
 */
export const CategoryImportItem = z.object({
  name: z.string()
    .min(1, '分类名称不能为空')
    .max(100, '分类名称不能超过100个字符'),
  description: z.string()
    .max(500, '描述不能超过500个字符')
    .optional(),
  parentName: z.string()
    .max(100, '父分类名称不能超过100个字符')
    .optional(),
  icon: z.string()
    .max(50, '图标不能超过50个字符')
    .optional(),
  level: z.number()
    .int('层级必须是整数')
    .min(1, '层级最小为1')
    .max(3, '最多支持3级分类'),
});

/**
 * 分类导入数据 Schema
 * 限制条目数量，防止恶意导入
 */
export const CategoryImportData = z.array(CategoryImportItem)
  .min(1, '导入数据不能为空')
  .max(500, '单次最多导入500个分类')
  .refine(
    (items) => {
      // 检查是否有重复的分类名称
      const names = items.map(item => item.name);
      const uniqueNames = new Set(names);
      return names.length === uniqueNames.size;
    },
    { message: '存在重复的分类名称' }
  )
  .refine(
    (items) => {
      // 检查父分类引用是否有效
      const nameSet = new Set(items.map(item => item.name));
      for (const item of items) {
        if (item.parentName && !nameSet.has(item.parentName)) {
          return false;
        }
      }
      return true;
    },
    { message: '存在无效的父分类引用' }
  );

// ============ 导出 ============

export const EnhancedSchemas = {
  // 基础类型
  SafeString,
  PlainString,
  Email,
  SafeUrl,
  ApiKeyValue,
  Password,

  // 业务类型
  PromptContent,
  PromptTitle,
  Description,
  Tags,
  CsvContent,
  JsonContent,

  // 完整 Schema
  CreatePromptInput,
  UpdatePromptInput,
  ImportTemplateInput,
  CreateApiKeyInput,
  UserMessage,

  // 分类导入
  CategoryImportItem,
  CategoryImportData,
};
