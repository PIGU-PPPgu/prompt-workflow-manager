import { invokeLLM } from "./llm";

export interface WorkflowStep {
  id: string;
  name: string;
  type: string; // prompt, api_call, transform, condition
  config: string; // JSON config
}

export interface StepResult {
  stepId: string;
  stepName: string;
  status: "success" | "failed" | "skipped";
  output: string;
  error?: string;
  duration: number;
}

export interface WorkflowExecutionResult {
  status: "completed" | "failed";
  output: string;
  error?: string;
  stepResults: StepResult[];
  totalDuration: number;
}

interface PromptStepConfig {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
}

interface ApiCallStepConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
}

interface TransformStepConfig {
  operation: "extract" | "replace" | "format" | "json_path";
  pattern?: string;
  replacement?: string;
  jsonPath?: string;
}

/**
 * Execute a single workflow step
 */
async function executeStep(
  step: WorkflowStep,
  input: string,
  variables: Record<string, string>
): Promise<StepResult> {
  const startTime = Date.now();

  try {
    let config: any = {};
    try {
      config = step.config ? JSON.parse(step.config) : {};
    } catch (e) {
      // Config might be plain text for simple prompts
      config = { prompt: step.config };
    }

    let output = "";

    switch (step.type) {
      case "prompt":
        output = await executePromptStep(config as PromptStepConfig, input, variables);
        break;
      case "api_call":
        output = await executeApiCallStep(config as ApiCallStepConfig, input, variables);
        break;
      case "transform":
        output = executeTransformStep(config as TransformStepConfig, input, variables);
        break;
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    return {
      stepId: step.id,
      stepName: step.name,
      status: "success",
      output,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      stepId: step.id,
      stepName: step.name,
      status: "failed",
      output: "",
      error: error.message || "Unknown error",
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute a prompt step - calls LLM API
 */
async function executePromptStep(
  config: PromptStepConfig,
  input: string,
  variables: Record<string, string>
): Promise<string> {
  // Replace variables in prompt
  let prompt = config.prompt || "";
  prompt = replaceVariables(prompt, { ...variables, input });

  const messages: Array<{ role: "system" | "user"; content: string }> = [];

  if (config.systemPrompt) {
    messages.push({
      role: "system",
      content: replaceVariables(config.systemPrompt, { ...variables, input }),
    });
  }

  messages.push({ role: "user", content: prompt });

  const response = await invokeLLM({
    messages,
    temperature: config.temperature,
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

/**
 * Execute an API call step
 */
async function executeApiCallStep(
  config: ApiCallStepConfig,
  input: string,
  variables: Record<string, string>
): Promise<string> {
  const url = replaceVariables(config.url, { ...variables, input });

  const headers: Record<string, string> = {};
  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      headers[key] = replaceVariables(value, { ...variables, input });
    }
  }

  const fetchOptions: RequestInit = {
    method: config.method || "GET",
    headers,
  };

  if (config.body && ["POST", "PUT"].includes(config.method)) {
    fetchOptions.body = replaceVariables(config.body, { ...variables, input });
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Execute a transform step - manipulate data
 */
function executeTransformStep(
  config: TransformStepConfig,
  input: string,
  variables: Record<string, string>
): string {
  switch (config.operation) {
    case "extract":
      if (config.pattern) {
        const regex = new RegExp(config.pattern, "g");
        const matches = input.match(regex);
        return matches ? matches.join("\n") : "";
      }
      return input;

    case "replace":
      if (config.pattern && config.replacement !== undefined) {
        const regex = new RegExp(config.pattern, "g");
        return input.replace(regex, config.replacement);
      }
      return input;

    case "format":
      // Simple formatting - trim and normalize whitespace
      return input.trim().replace(/\s+/g, " ");

    case "json_path":
      if (config.jsonPath) {
        try {
          const data = JSON.parse(input);
          const path = config.jsonPath.split(".");
          let result: any = data;
          for (const key of path) {
            result = result?.[key];
          }
          return typeof result === "string" ? result : JSON.stringify(result);
        } catch {
          throw new Error("Invalid JSON input for json_path operation");
        }
      }
      return input;

    default:
      return input;
  }
}

/**
 * Replace {{variable}} placeholders in text
 */
function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] ?? match;
  });
}

/**
 * Execute a complete workflow
 */
export async function executeWorkflow(
  steps: WorkflowStep[],
  initialInput: string
): Promise<WorkflowExecutionResult> {
  const startTime = Date.now();
  const stepResults: StepResult[] = [];
  const variables: Record<string, string> = {};

  let currentInput = initialInput;

  for (const step of steps) {
    const result = await executeStep(step, currentInput, variables);
    stepResults.push(result);

    if (result.status === "failed") {
      return {
        status: "failed",
        output: "",
        error: `Step "${step.name}" failed: ${result.error}`,
        stepResults,
        totalDuration: Date.now() - startTime,
      };
    }

    // Pass output to next step
    currentInput = result.output;
    // Store step output as variable for later steps
    variables[`step_${step.id}_output`] = result.output;
  }

  return {
    status: "completed",
    output: currentInput,
    stepResults,
    totalDuration: Date.now() - startTime,
  };
}
