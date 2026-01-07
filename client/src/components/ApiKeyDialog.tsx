import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import * as React from "react";
import { toast } from "sonner";
import { Check, Sparkles, Download, Upload, FileJson, AlertCircle, Trash2, Plus, GripVertical, FileText, Eye, EyeOff, Image as ImageIcon, Mic, Brain, Code, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    id: number;
    name: string;
    provider: string;
    apiUrl?: string;
    models?: string;
  } | null;
}

// 模型类型定义
type ModelType = "text" | "vision" | "image" | "audio" | "reasoning" | "code" | "search";

// 模型类型标签配置
const MODEL_CONFIG: Record<ModelType, { label: string; icon: any; color: string; bg: string }> = {
  text: { label: "文本", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
  vision: { label: "视觉", icon: Eye, color: "text-purple-500", bg: "bg-purple-500/10" },
  image: { label: "生图", icon: ImageIcon, color: "text-pink-500", bg: "bg-pink-500/10" },
  audio: { label: "语音", icon: Mic, color: "text-green-500", bg: "bg-green-500/10" },
  reasoning: { label: "推理", icon: Brain, color: "text-amber-500", bg: "bg-amber-500/10" },
  code: { label: "代码", icon: Code, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  search: { label: "搜索", icon: Search, color: "text-indigo-500", bg: "bg-indigo-500/10" },
};

function inferModelType(modelName: string): ModelType {
  const name = modelName.toLowerCase();
  if (name.includes("reason") || name.includes("thinking") || name.includes("o1") || name.includes("o3")) return "reasoning";
  if (name.includes("code") || name.includes("coder")) return "code";
  if (name.includes("search") || name.includes("sonar")) return "search";
  if (name.includes("vision") || name.includes("vl") || name.includes("ocr") || name.includes("4v")) return "vision";
  if (name.includes("image") || name.includes("dall") || name.includes("midjourney") || name.includes("sd")) return "image";
  if (name.includes("audio") || name.includes("tts") || name.includes("whisper")) return "audio";
  return "text";
}

// API 模型模板配置
const API_TEMPLATES = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    provider: "openai",
    apiUrl: "https://api.openai.com/v1",
    models: [
      { name: "gpt-4o", type: "text" as ModelType },
      { name: "gpt-4o-mini", type: "text" as ModelType },
      { name: "gpt-4-turbo", type: "text" as ModelType },
      { name: "o1-preview", type: "reasoning" as ModelType },
      { name: "o1-mini", type: "reasoning" as ModelType },
    ],
    description: "ChatGPT, GPT-4o, o1 系列模型",
    keyPlaceholder: "sk-...",
    popular: true,
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    icon: "🧠",
    provider: "anthropic",
    apiUrl: "https://api.anthropic.com/v1",
    models: [
      { name: "claude-3-5-sonnet-20241022", type: "text" as ModelType },
      { name: "claude-3-5-haiku-20241022", type: "text" as ModelType },
      { name: "claude-3-opus-20240229", type: "text" as ModelType },
    ],
    description: "Claude 3.5 Sonnet, Opus, Haiku",
    keyPlaceholder: "sk-ant-...",
    popular: true,
  },
  // ... 其他模板可以在这里补充
];

const PROVIDERS = [
  { value: "openai", label: "OpenAI", defaultUrl: "https://api.openai.com/v1" },
  { value: "anthropic", label: "Anthropic", defaultUrl: "https://api.anthropic.com/v1" },
  { value: "deepseek", label: "DeepSeek", defaultUrl: "https://api.deepseek.com" },
  { value: "custom", label: "自定义", defaultUrl: "" },
];

export function ApiKeyDialog({ open, onOpenChange, initialData }: ApiKeyDialogProps) {
  const [mode, setMode] = useState<"template" | "import" | "manual">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [customModel, setCustomModel] = useState("");
  const [apiFormat, setApiFormat] = useState("openai");
  const [modelMetadata, setModelMetadata] = useState<Record<string, { types: ModelType[]; apiType: "chat" | "images" }>>({});
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const [importedApis, setImportedApis] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const createMutation = trpc.apiKeys.create.useMutation({
    onSuccess: () => {
      toast.success("API密钥创建成功");
      utils.apiKeys.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const updateMutation = trpc.apiKeys.update.useMutation({
    onSuccess: () => {
      toast.success("API密钥更新成功");
      utils.apiKeys.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("更新失败: " + error.message);
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setMode("manual");
        setName(initialData.name);
        setProvider(initialData.provider);
        setApiUrl(initialData.apiUrl || "");
        setKeyValue("");
        try {
          setSelectedModels(initialData.models ? JSON.parse(initialData.models) : []);
        } catch {
          setSelectedModels([]);
        }
        // Parse modelMetadata
        try {
          const metadata = initialData.modelMetadata ? JSON.parse(initialData.modelMetadata) : {};
          setModelMetadata(metadata);
        } catch {
          setModelMetadata({});
        }
      } else {
        resetForm();
      }
    }
  }, [open, initialData]);

  const resetForm = () => {
    setMode("template");
    setSelectedTemplate(null);
    setName("");
    setProvider("");
    setApiUrl("");
    setKeyValue("");
    setSelectedModels([]);
    setCustomModel("");
    setApiFormat("openai");
    setModelMetadata({});
    setEditingModel(null);
    setShowKey(false);
    setRevealedKey(null);
    setImportedApis([]);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = API_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setName(`我的${template.name}密钥`);
    setProvider(template.provider);
    setApiUrl(template.apiUrl);
    setSelectedModels(template.models.map(m => m.name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const modelsJson = selectedModels.length > 0 ? JSON.stringify(selectedModels) : undefined;
    const metadataJson = Object.keys(modelMetadata).length > 0 ? JSON.stringify(modelMetadata) : undefined;

    if (initialData) {
      if (!name.trim()) {
        toast.error("名称不能为空");
        return;
      }
      updateMutation.mutate({
        id: initialData.id,
        name: name.trim(),
        apiUrl: apiUrl.trim() || undefined,
        keyValue: keyValue.trim() || undefined,
        models: modelsJson,
        modelMetadata: metadataJson,
      });
    } else {
      if (!name.trim() || !provider.trim() || !keyValue.trim()) {
        toast.error("名称、提供商和API密钥不能为空");
        return;
      }
      createMutation.mutate({
        name: name.trim(),
        provider: provider.trim(),
        apiUrl: apiUrl.trim() || undefined,
        keyValue: keyValue.trim(),
        models: modelsJson,
        modelMetadata: metadataJson,
      });
    }
  };

  const isEditing = !!initialData;

  const handleAddModel = () => {
    const model = customModel.trim();
    if (model && !selectedModels.includes(model)) {
      setSelectedModels(prev => [...prev, model]);

      // Auto-generate default metadata based on model name
      const inferredType = inferModelType(model);
      const defaultApiType = inferredType === "image" ? "images" : "chat";
      setModelMetadata(prev => ({
        ...prev,
        [model]: {
          types: [inferredType],
          apiType: defaultApiType,
        }
      }));

      setCustomModel("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑配置" : "添加连接"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "修改现有连接的配置信息和模型列表" : "配置新的 AI 服务提供商凭证"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
          {!isEditing && (
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="template">快速模板</TabsTrigger>
              <TabsTrigger value="import">批量导入</TabsTrigger>
              <TabsTrigger value="manual">手动配置</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="template" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {API_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`
                    relative p-3 border rounded-lg cursor-pointer transition-all hover:border-primary
                    ${selectedTemplate === template.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'}
                  `}
                >
                  <div className="text-2xl mb-1">{template.icon}</div>
                  <div className="font-medium text-sm">{template.name}</div>
                </div>
              ))}
            </div>
            {selectedTemplate && (
              <Button className="w-full" onClick={() => setMode("manual")}>
                继续配置详细信息
              </Button>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>配置名称</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="如: OpenAI 主账号" />
                </div>
                <div className="space-y-2">
                  <Label>提供商标识</Label>
                  <Input value={provider} onChange={e => setProvider(e.target.value)} placeholder="openai" disabled={isEditing} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>API Base URL</Label>
                <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={keyValue}
                      onChange={e => setKeyValue(e.target.value)}
                      placeholder={isEditing ? "留空则保持不变" : "sk-..."}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        if (revealedKey) {
                          setKeyValue(revealedKey);
                          setShowKey(true);
                          toast.success("已填入当前密钥");
                        } else {
                          try {
                            const result = await utils.client.apiKeys.reveal.query({ id: initialData!.id });
                            setRevealedKey(result.keyValue);
                            setKeyValue(result.keyValue);
                            setShowKey(true);
                            toast.success("已获取当前密钥");
                          } catch (e: any) {
                            toast.error("获取密钥失败: " + e.message);
                          }
                        }
                      }}
                    >
                      查看当前密钥
                    </Button>
                  )}
                </div>
                {isEditing && (
                  <p className="text-xs text-muted-foreground">留空则保持原密钥不变，或点击"查看当前密钥"查看并编辑</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>模型管理</Label>
                
                {/* 模型添加输入框 */}
                <div className="flex gap-2">
                  <Input 
                    value={customModel} 
                    onChange={e => setCustomModel(e.target.value)} 
                    placeholder="输入模型ID（如 gpt-4o）"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddModel();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddModel}>
                    <Plus className="h-4 w-4 mr-2" /> 添加
                  </Button>
                </div>
                
                {/* 仿 Cherry Studio 的模型列表 */}
                <div className="border border-border rounded-lg bg-card mt-3 overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground font-medium border-b border-border flex items-center justify-between">
                    <span>已添加模型 ({selectedModels.length})</span>
                    <span>操作</span>
                  </div>
                  
                  {selectedModels.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      暂无模型，请在上方添加
                    </div>
                  ) : (
                    <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                      {selectedModels.map(model => {
                        const metadata = modelMetadata[model];
                        const types = metadata?.types || [inferModelType(model)];
                        const apiType = metadata?.apiType || (types.includes("image") ? "images" : "chat");

                        // Display first type's config
                        const primaryType = types[0];
                        const conf = MODEL_CONFIG[primaryType];
                        const Icon = conf.icon;

                        return (
                          <div key={model} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors group">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* 拖拽手柄 (装饰性) */}
                              <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab shrink-0" />

                              {/* 类型图标 */}
                              <div className={cn("p-1.5 rounded-md shrink-0", conf.bg, conf.color)}>
                                <Icon className="h-4 w-4" />
                              </div>

                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <span className="text-sm font-medium truncate">{model}</span>

                                {/* 类型标签(支持多个) */}
                                <div className="flex flex-wrap gap-1">
                                  {types.map(t => {
                                    const c = MODEL_CONFIG[t];
                                    return (
                                      <span key={t} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                                        {c.label}
                                      </span>
                                    );
                                  })}
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                                    {apiType === "images" ? "Images API" : "Chat API"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              {/* 编辑类别按钮 */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium mb-2">模型类别（可多选）</h4>
                                      <div className="space-y-2">
                                        {(Object.keys(MODEL_CONFIG) as ModelType[]).map(type => {
                                          const isChecked = types.includes(type);
                                          return (
                                            <div key={type} className="flex items-center gap-2">
                                              <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={(checked) => {
                                                  setModelMetadata(prev => {
                                                    const current = prev[model] || { types: [inferModelType(model)], apiType: "chat" };
                                                    const newTypes = checked
                                                      ? [...current.types, type]
                                                      : current.types.filter(t => t !== type);
                                                    return {
                                                      ...prev,
                                                      [model]: {
                                                        ...current,
                                                        types: newTypes.length > 0 ? newTypes : [inferModelType(model)]
                                                      }
                                                    };
                                                  });
                                                }}
                                              />
                                              <Label className="text-sm flex items-center gap-2 cursor-pointer">
                                                {React.createElement(MODEL_CONFIG[type].icon, { className: "h-3 w-3" })}
                                                {MODEL_CONFIG[type].label}
                                              </Label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="font-medium mb-2">调用方式</h4>
                                      <RadioGroup
                                        value={apiType}
                                        onValueChange={(value: "chat" | "images") => {
                                          setModelMetadata(prev => ({
                                            ...prev,
                                            [model]: {
                                              types: prev[model]?.types || [inferModelType(model)],
                                              apiType: value
                                            }
                                          }));
                                        }}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="chat" id={`${model}-chat`} />
                                          <Label htmlFor={`${model}-chat`} className="text-sm">Chat API</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="images" id={`${model}-images`} />
                                          <Label htmlFor={`${model}-images`} className="text-sm">Images API</Label>
                                        </div>
                                      </RadioGroup>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>

                              {/* 删除按钮 */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                onClick={() => {
                                  setSelectedModels(prev => prev.filter(m => m !== model));
                                  setModelMetadata(prev => {
                                    const newMeta = { ...prev };
                                    delete newMeta[model];
                                    return newMeta;
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {isEditing ? (updateMutation.isPending ? "更新配置" : "保存更改") : (createMutation.isPending ? "创建配置" : "立即创建")}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* Import tab logic omitted for brevity */}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}