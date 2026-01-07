import { ENV } from "./env";

export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConfigError";
  }
}

export class LLMRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "LLMRequestError";
    this.status = status;
  }
}

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice = 
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  temperature?: number;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{ 
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new LLMConfigError(
      "BUILT_IN_FORGE_API_KEY is not configured, cannot call built-in LLM"
    );
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {})
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    temperature,
  } = params;

  const payload: Record<string, unknown> = {
    model: "deepseek-chat",
    messages: messages.map(normalizeMessage),
  };

  if (typeof temperature === "number") {
    payload.temperature = temperature;
  }

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 8192; // DeepSeek 最大支持 8192

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error: any) {
    throw new LLMRequestError(
      `LLM network request failed: ${error?.message || "unknown error"}`
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new LLMRequestError(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`,
      response.status
    );
  }

  return (await response.json()) as InvokeResult;
}

// New function to test external models
export async function testExternalModel(params: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  provider: string;
  apiType?: "chat" | "images";
}): Promise<{ success: boolean; message: string; latency?: number }> {
  const { apiKey, baseUrl, model, provider, apiType = "chat" } = params;

  // Default URL handling
  let url = baseUrl;
  if (!url) {
    if (provider === 'openai') url = "https://api.openai.com/v1";
    else if (provider === 'anthropic') url = "https://api.anthropic.com/v1";
    else if (provider === 'google') url = "https://generativelanguage.googleapis.com/v1beta";
    else url = "https://api.openai.com/v1"; // Fallback to OpenAI format
  }

  // Normalize URL (ensure no trailing slash)
  url = url.replace(/\/$/, "");

  // Handle image generation API
  if (apiType === "images") {
    const endpoint = `${url}/images/generations`;
    const start = Date.now();
    try {
      // Try HEAD request first (faster)
      let response = await fetch(endpoint, {
        method: "HEAD",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      // If HEAD not supported, try minimal POST
      if (response.status === 405 || response.status === 404) {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: "test",
            model: model,
            n: 1,
            size: "256x256"
          }),
        });
      }

      const latency = Date.now() - start;
      if (!response.ok) {
        const err = await response.text();
        try {
          const jsonErr = JSON.parse(err);
          if (jsonErr.error?.message) return { success: false, message: jsonErr.error.message };
        } catch {}
        return { success: false, message: `Error ${response.status}: ${err.substring(0, 100)}` };
      }
      return { success: true, message: "Connection successful", latency };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Handle chat API (original logic)
  if (provider === 'anthropic') {
    // Anthropic API
    const endpoint = `${url}/messages`;
    const start = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      const latency = Date.now() - start;
      if (!response.ok) {
        const err = await response.text();
        return { success: false, message: `Error ${response.status}: ${err}` };
      }
      return { success: true, message: "Connection successful", latency };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  } else if (provider === 'google') {
    // Google Gemini API (REST)
    // URL usually needs :generateContent?key=API_KEY
    const endpoint = `${url}/models/${model}:generateContent?key=${apiKey}`;
    const start = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hi" }] }]
        }),
      });
      const latency = Date.now() - start;
      if (!response.ok) {
        const err = await response.text();
        return { success: false, message: `Error ${response.status}: ${err}` };
      }
      return { success: true, message: "Connection successful", latency };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  } else {
    // OpenAI Compatible (default)
    const endpoint = `${url}/chat/completions`;
    const start = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 5
        }),
      });

      const latency = Date.now() - start;
      if (!response.ok) {
        const err = await response.text();
        try {
            const jsonErr = JSON.parse(err);
            if (jsonErr.error?.message) return { success: false, message: jsonErr.error.message };
        } catch {}
        return { success: false, message: `Error ${response.status}: ${err.substring(0, 100)}` };
      }
      return { success: true, message: "Connection successful", latency };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
}
