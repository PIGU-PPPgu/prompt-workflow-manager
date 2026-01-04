import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 安全解析 tags 字段
 * 支持 JSON 数组格式和逗号分隔字符串格式
 */
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];

  try {
    // 尝试解析为 JSON 数组
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 如果解析失败，尝试按逗号分隔
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }
}
