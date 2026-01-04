import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

// 模型类型定义
type ModelType = "text" | "vision" | "image" | "audio" | "reasoning" | "code" | "search";

// 模型类型标签配置
const MODEL_TYPE_LABELS: Record<ModelType, { label: string; color: string }> = {
  text: { label: "文本", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  vision: { label: "视觉", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  image: { label: "生图", color: "bg-pink-500/10 text-pink-600 border-pink-200" },
  audio: { label: "语音", color: "bg-green-500/10 text-green-600 border-green-200" },
  reasoning: { label: "推理", color: "bg-orange-500/10 text-orange-600 border-orange-200" },
  code: { label: "代码", color: "bg-cyan-500/10 text-cyan-600 border-cyan-200" },
  search: { label: "搜索", color: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
};

// 根据模型名称推断类型
function inferModelType(modelName: string): ModelType {
  const name = modelName.toLowerCase();
  if (name.includes("reasoning") || name.includes("reasoner") || name.includes("thinking") ||
      name.includes("o1-") || name.includes("o3-")) return "reasoning";
  if (name.includes("coder") || name.includes("code")) return "code";
  if (name.includes("search") || name.includes("sonar")) return "search";
  if (name.includes("vision") || name.includes("vl-") || name.includes("ocr") ||
      name.includes("-v") || name.includes("4v")) return "vision";
  if (name.includes("image") || name.includes("dall-e") || name.includes("midjourney") ||
      name.includes("stable-diffusion")) return "image";
  if (name.includes("tts") || name.includes("audio") || name.includes("speech") ||
      name.includes("whisper")) return "audio";
  return "text";
}

interface OptimizePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onOptimized: (optimizedContent: string) => void;
}

export function OptimizePromptDialog({ open, onOpenChange, content, onOptimized }: OptimizePromptDialogProps) {
  const [intensity, setIntensity] = useState<"light" | "medium" | "deep">("medium");
  const [result, setResult] = useState<any>(null);
  const [selectedApiKey, setSelectedApiKey] = useState<string>("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const { data: apiKeys } = trpc.apiKeys.list.useQuery();

  // 获取所有可用模型
  const availableModels = useMemo(() => {
    if (!apiKeys || apiKeys.length === 0) return [];

    const allModels: Array<{ name: string; type: ModelType; provider: string; apiKeyId: number }> = [];

    apiKeys.forEach(apiKey => {
      if (!apiKey.models || !apiKey.isActive) return;

      try {
        const models = JSON.parse(apiKey.models);
        if (Array.isArray(models)) {
          models.forEach((modelName: string) => {
            allModels.push({
              name: modelName,
              type: inferModelType(modelName),
              provider: apiKey.provider,
              apiKeyId: apiKey.id,
            });
          });
        }
      } catch (e) {
        // 忽略解析错误
      }
    });

    return allModels;
  }, [apiKeys]);

  // 按类型分组模型
  const modelsByType = useMemo(() => {
    const grouped: Record<ModelType, typeof availableModels> = {
      text: [],
      vision: [],
      image: [],
      audio: [],
      reasoning: [],
      code: [],
      search: [],
    };

    availableModels.forEach(model => {
      grouped[model.type].push(model);
    });

    return grouped;
  }, [availableModels]);

  const optimizeMutation = trpc.prompts.optimize.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("优化完成");
    },
    onError: (error) => {
      toast.error("优化失败: " + error.message);
    },
  });

  const handleOptimize = () => {
    if (selectedModels.length === 0) {
      toast.error("请至少选择一个模型");
      return;
    }

    toast.info(`使用 ${selectedModels.length} 个模型优化中...`);

    optimizeMutation.mutate({
      content,
      targetModel: "general", // 保持兼容性，暂时传递 general
      intensity,
      models: selectedModels, // 传递选中的模型列表
    });
  };

  const toggleModel = (modelName: string) => {
    setSelectedModels(prev =>
      prev.includes(modelName)
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
    );
  };

  const toggleAllType = (type: ModelType) => {
    const typeModels = modelsByType[type].map(m => m.name);
    const allSelected = typeModels.every(m => selectedModels.includes(m));

    if (allSelected) {
      // 取消选择该类型的所有模型
      setSelectedModels(prev => prev.filter(m => !typeModels.includes(m)));
    } else {
      // 选择该类型的所有模型
      setSelectedModels(prev => [...new Set([...prev, ...typeModels])]);
    }
  };

  const handleApply = () => {
    if (result?.optimized) {
      onOptimized(result.optimized);
      onOpenChange(false);
      setResult(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2" />
            AI 提示词优化
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 模型选择 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>选择模型 ({selectedModels.length} 个已选)</Label>
              {selectedModels.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedModels([])}
                >
                  清空选择
                </Button>
              )}
            </div>

            {availableModels.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground">
                <p>暂无可用模型</p>
                <p className="text-xs mt-1">请先在"API密钥"页面配置并激活 API 密钥</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-3">
                {Object.entries(modelsByType).map(([type, models]) => {
                  if (models.length === 0) return null;
                  const typeConfig = MODEL_TYPE_LABELS[type as ModelType];
                  const allSelected = models.every(m => selectedModels.includes(m.name));
                  const someSelected = models.some(m => selectedModels.includes(m.name));

                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center gap-2 pb-1 border-b">
                        <Checkbox
                          id={`type-${type}`}
                          checked={allSelected}
                          className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                          onCheckedChange={() => toggleAllType(type as ModelType)}
                        />
                        <Badge
                          variant="outline"
                          className={`text-xs ${typeConfig.color}`}
                        >
                          {typeConfig.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({models.length} 个模型)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 pl-6">
                        {models.map(model => (
                          <div key={model.name} className="flex items-center gap-2 py-1">
                            <Checkbox
                              id={`model-${model.name}`}
                              checked={selectedModels.includes(model.name)}
                              onCheckedChange={() => toggleModel(model.name)}
                            />
                            <label
                              htmlFor={`model-${model.name}`}
                              className="text-sm cursor-pointer flex-1 flex items-center justify-between"
                            >
                              <span className="truncate">{model.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {model.provider}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 优化强度 */}
          <div className="space-y-2">
            <Label>优化强度</Label>
            <Select value={intensity} onValueChange={(v: any) => setIntensity(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">轻度 - 修正语法和格式</SelectItem>
                <SelectItem value="medium">中度 - 添加结构化元素</SelectItem>
                <SelectItem value="deep">深度 - 全面重构</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!result && (
            <div className="bg-muted p-4 rounded-sm border border-border">
              <h4 className="text-sm font-medium mb-2">原始提示词</h4>
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {content}
              </pre>
            </div>
          )}

          {result && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">原始版本</h4>
                <div className="bg-muted p-4 rounded-sm border border-border h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {result.original}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">优化版本</h4>
                <div className="bg-primary/5 p-4 rounded-sm border border-primary h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {result.optimized}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {result?.improvements && result.improvements.length > 0 && (
            <div className="bg-primary/5 p-4 rounded-sm border border-primary">
              <h4 className="text-sm font-medium mb-2">改进点</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {result.improvements.map((improvement: string, index: number) => (
                  <li key={index}>{improvement}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? "取消" : "关闭"}
          </Button>
          {!result ? (
            <Button onClick={handleOptimize} disabled={optimizeMutation.isPending}>
              {optimizeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  优化中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  开始优化
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleApply}>
              应用优化结果
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
