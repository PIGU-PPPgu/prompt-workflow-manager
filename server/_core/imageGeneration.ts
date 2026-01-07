/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

type Provider = "openai" | "volcengine" | "forge";

function detectProvider(apiUrl: string, model?: string): Provider {
  // 火山引擎（需要特殊处理）
  if (apiUrl.includes("volces.com") || apiUrl.includes("volcengine.com")) {
    return "volcengine";
  }
  if (model?.toLowerCase().includes("doubao") || model?.toLowerCase().includes("seedream")) {
    return "volcengine";
  }

  // OpenAI 官方 API
  if (apiUrl.includes("api.openai.com")) return "openai";

  // OpenAI 兼容服务（阿里云百炼、DeepSeek 等）
  if (apiUrl.includes("compatible-mode")) return "openai";
  if (apiUrl.includes("dashscope.aliyuncs.com")) return "openai";
  if (apiUrl.includes("api.deepseek.com")) return "openai";

  // 根据模型名判断
  if (model?.toLowerCase().includes("dall-e")) return "openai";
  if (model?.toLowerCase().includes("qwen-image")) return "openai";
  if (model?.toLowerCase().includes("image")) return "openai";

  return "forge";
}

// 映射 size 参数到火山引擎格式
function mapSizeToVolcengine(size?: string): string {
  if (!size) return "2K";
  // 所有 1024x 格式都映射到 2K
  if (size.startsWith("1024x") || size.endsWith("x1024")) return "2K";
  // 2048x 格式映射到 4K
  if (size.startsWith("2048x") || size.endsWith("x2048")) return "4K";
  return "2K"; // 默认
}

export type GenerateImageOptions = {
  prompt: string;
  model?: string;
  size?: string;
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
  apiKey?: string;        // 用户提供的 API Key
  apiUrl?: string;        // 用户提供的 API URL
  provider?: "openai" | "volcengine" | "forge";      // 提供商类型
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  // 优先使用用户提供的 API Key 和 URL，否则回退到内置配置
  const apiKey = options.apiKey || ENV.forgeApiKey;
  const apiUrl = options.apiUrl || ENV.forgeApiUrl;

  if (!apiUrl) {
    throw new Error("API URL 未配置，请在「API 密钥」页面配置生图服务");
  }
  if (!apiKey) {
    throw new Error("API Key 未配置，请在「API 密钥」页面配置生图服务");
  }

  const provider =
    (options.provider === "openai" || options.provider === "forge" || options.provider === "volcengine"
      ? options.provider
      : undefined) || detectProvider(apiUrl, options.model);

  const baseUrl = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
  const endpointPath =
    provider === "forge"
      ? "images.v1.ImageService/GenerateImage"
      : "images/generations";
  const fullUrl = new URL(endpointPath, baseUrl).toString();

  let payload: Record<string, any>;

  if (provider === "volcengine") {
    // 火山引擎专用格式
    payload = {
      model: options.model,
      prompt: options.prompt,
      size: mapSizeToVolcengine(options.size),
      sequential_image_generation: "disabled",
      response_format: "url",  // 火山引擎返回 URL，不是 b64_json
      stream: false,
      watermark: true,
    };
  } else if (provider === "openai") {
    // OpenAI 兼容格式
    payload = {
      prompt: options.prompt,
      model: options.model,
      n: options.n ?? 1,
      size: options.size,
      quality: options.quality,
      style: options.style,
      response_format: "b64_json",
    };
  } else {
    // Forge 格式
    payload = {
      prompt: options.prompt,
      original_images: options.originalImages || [],
      model: options.model,
      size: options.size,
      quality: options.quality,
      style: options.style,
      n: options.n,
    };
  }

  // 移除 undefined 值
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
  };
  if (provider === "forge") {
    headers["connect-protocol-version"] = "1";
  }

  const response = await fetch(fullUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000), // 120秒超时
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `图片生成请求失败 (${response.status} ${response.statusText}) [apiUrl=${apiUrl}, provider=${provider}, endpoint=${fullUrl}]${detail ? `: ${detail}` : ""}`
    );
  }

  let base64Data: string | undefined;
  let imageUrl: string | undefined;
  let mimeType = "image/png";

  if (provider === "volcengine") {
    // 火山引擎返回 URL
    const result = (await response.json()) as {
      data?: Array<{ url?: string }>;
    };
    imageUrl = result.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error(
        `图片生成返回数据为空 [apiUrl=${apiUrl}, provider=${provider}, endpoint=${fullUrl}]`
      );
    }

    // 直接返回火山引擎的 URL（火山引擎图片 URL 有效期为 24 小时）
    return { url: imageUrl };

  } else if (provider === "openai") {
    const result = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
    };
    base64Data = result.data?.[0]?.b64_json;
  } else {
    const result = (await response.json()) as {
      image?: {
        b64Json?: string;
        mimeType?: string;
      };
    };
    base64Data = result.image?.b64Json;
    mimeType = result.image?.mimeType || "image/png";
  }

  if (!base64Data) {
    throw new Error(
      `图片生成返回数据为空 [apiUrl=${apiUrl}, provider=${provider}, endpoint=${fullUrl}]`
    );
  }

  const buffer = Buffer.from(base64Data, "base64");

  // Save to S3
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    mimeType
  );
  return {
    url,
  };
}
