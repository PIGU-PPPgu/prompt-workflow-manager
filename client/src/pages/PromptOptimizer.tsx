import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SaveOptimizedPromptDialog } from "@/components/SaveOptimizedPromptDialog";
import { trpc } from "@/lib/trpc";
import { Send, Sparkles, Save, RefreshCw, Copy, Check, ChevronDown, Settings2, SlidersHorizontal, ChevronUp, Cpu, Clock, BarChart2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

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

// 供应商颜色配置
const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-green-500/10 text-green-600 border-green-200",
  anthropic: "bg-orange-500/10 text-orange-600 border-orange-200",
  google: "bg-blue-500/10 text-blue-600 border-blue-200",
  gemini: "bg-blue-500/10 text-blue-600 border-blue-200",
  mistral: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  groq: "bg-red-500/10 text-red-600 border-red-200",
  perplexity: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  alibaba: "bg-orange-500/10 text-orange-600 border-orange-200",
  volcano: "bg-red-500/10 text-red-600 border-red-200",
  mjdjourney: "bg-pink-500/10 text-pink-600 border-pink-200",
  siliconflow: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  deepseek: "bg-purple-500/10 text-purple-600 border-purple-200",
};

// 获取供应商颜色
const getProviderColor = (provider: string): string => {
  const key = provider.toLowerCase();
  return PROVIDER_COLORS[key] || "bg-slate-500/10 text-slate-600 border-slate-200";
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

type Model = "gpt" | "claude" | "general";
type Intensity = "light" | "medium" | "deep";
type Framework = "none" | "crispe" | "broke" | "ape" | "rise" | "trace";

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
  modelDisplay?: string;
}

export default function PromptOptimizer() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [framework, setFramework] = useState<Framework>("none");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [selectedActualModels, setSelectedActualModels] = useState<string[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ModelType | "all">("all");
  const [groupBy, setGroupBy] = useState<"type" | "provider">("provider");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [contentToSave, setContentToSave] = useState("");
  const [originalPromptForSave, setOriginalPromptForSave] = useState("");

  // 新增：设置面板折叠状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  const optimizeMutation = trpc.prompts.optimize.useMutation();
  const { data: apiKeys } = trpc.apiKeys.list.useQuery();
  const { data: historyList, refetch: refetchHistory } = trpc.optimizationHistory.list.useQuery();
  const createHistoryMutation = trpc.optimizationHistory.create.useMutation();
  const updateHistoryMutation = trpc.optimizationHistory.update.useMutation();
  const deleteHistoryMutation = trpc.optimizationHistory.delete.useMutation();

  // 获取所有可用模型 (保持不变)
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
      } catch (e) {}
    });
    return allModels;
  }, [apiKeys]);

  // 分组和过滤逻辑 (保持不变)
  const filteredModels = useMemo(() => {
    let filtered = availableModels;
    if (filterType !== "all") {
      filtered = filtered.filter(m => m.type === filterType);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [availableModels, filterType, searchQuery]);

  const filteredModelsByType = useMemo(() => {
    const grouped: Record<ModelType, typeof availableModels> = {
      text: [], vision: [], image: [], audio: [], reasoning: [], code: [], search: [],
    };
    filteredModels.forEach(model => grouped[model.type].push(model));
    return grouped;
  }, [filteredModels]);

  const filteredModelsByProvider = useMemo(() => {
    const grouped: Record<string, typeof availableModels> = {};
    filteredModels.forEach(model => {
      if (!grouped[model.provider]) grouped[model.provider] = [];
      grouped[model.provider].push(model);
    });
    return grouped;
  }, [filteredModels]);

  const handleOptimize = async () => {
    if (!prompt.trim()) {
      toast.error("请输入要优化的提示词");
      return;
    }
    if (selectedActualModels.length === 0) {
      toast.error("请至少选择一个模型");
      return;
    }
    // 自动折叠设置面板，腾出空间展示结果
    setIsSettingsOpen(false);

    const modelsToUse = compareMode ? selectedActualModels : [selectedActualModels[0]];
    setIsOptimizing(true);
    const userMessage: Message = { role: "user", content: prompt };
    setMessages(prev => [...prev, userMessage]);

    try {
      let finalPrompt = prompt;
      if (framework !== "none") {
        finalPrompt = applyFramework(prompt, framework);
      }
      toast.info(`使用 ${modelsToUse.length} 个模型优化中...`);

      const results = await Promise.allSettled(
        modelsToUse.map(modelName =>
          optimizeMutation.mutateAsync({
            content: finalPrompt,
            targetModel: "general",
            intensity,
          })
        )
      );

      const assistantMessages: Message[] = [];
      let successCount = 0;
      let failCount = 0;

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          assistantMessages.push({
            role: "assistant",
            content: result.value.optimized,
            model: modelsToUse[index],
            modelDisplay: modelsToUse[index],
          });
          successCount++;
        } else {
          console.error(`模型 ${modelsToUse[index]} 优化失败:`, result.reason);
          failCount++;
        }
      });

      if (assistantMessages.length > 0) {
        setMessages(prev => {
          const newMessages = [...prev, ...assistantMessages];

          // 保存或更新历史记录
          const conversationData = JSON.stringify(newMessages);
          const settings = JSON.stringify({
            intensity,
            framework,
            compareMode,
            models: modelsToUse,
          });

          if (currentHistoryId) {
            // 更新现有历史
            updateHistoryMutation.mutate({
              id: currentHistoryId,
              conversationData,
              settings,
              lastMessageAt: new Date(),
            });
          } else {
            // 创建新历史
            createHistoryMutation.mutate({
              title: finalPrompt.substring(0, 50) + (finalPrompt.length > 50 ? '...' : ''),
              conversationData,
              settings,
            }, {
              onSuccess: (data) => {
                setCurrentHistoryId(data.id);
                refetchHistory();
              }
            });
          }

          return newMessages;
        });
        setPrompt("");

        if (failCount > 0) {
          toast.warning(`${successCount} 个模型成功，${failCount} 个模型失败`);
        } else {
          toast.success("优化完成！");
        }
      } else {
        toast.error("所有模型都优化失败");
      }
    } catch (error: any) {
      toast.error("优化失败: " + error.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSave = (content: string, userPrompt?: string) => {
    setContentToSave(content);
    setOriginalPromptForSave(userPrompt || "");
    setSaveDialogOpen(true);
  };

  const handleCopy = async (content: string, roundIndex: number, assistantIndex: number) => {
    try {
      await navigator.clipboard.writeText(content);
      const uniqueId = `${roundIndex}-${assistantIndex}`;
      setCopiedIndex(uniqueId);
      toast.success("已复制");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error("复制失败");
    }
  };

  const handleReset = () => {
    setMessages([]);
    setPrompt("");
    setIsSettingsOpen(true); // 重置时展开设置
    toast.success("已清空对话");
  };

  // ... 辅助函数 getModelLabel, getModelColor, applyFramework 保持不变 ...
  const applyFramework = (content: string, fw: Framework): string => {
    // ... 保持原有逻辑
    const frameworks: Record<Framework, string> = {
      crispe: `# CRISPE框架\n\n**Capacity and Role:** 你是一个...\n**Insight:** 背景信息和上下文\n**Statement:** 你希望AI帮你做什么\n**Personality:** 你希望AI以什么风格回答\n**Experiment:** 请求响应\n\n---\n\n原始提示词:\n${content}`,
      broke: `# BROKE框架\n\n**Background:** 提供背景信息\n**Role:** 定义AI的角色\n**Objectives:** 明确任务目标\n**Key Results:** 期望的输出结果\n**Evolve:** 改进建议\n\n---\n\n原始提示词:\n${content}`,
      ape: `# APE框架\n\n**Action:** 定义需要完成的任务\n**Purpose:** 说明任务的目标\n**Expectation:** 描述期望的结果\n\n---\n\n原始提示词:\n${content}`,
      rise: `# RISE框架\n\n**Role:** 你是...\n**Input:** 输入信息和数据\n**Steps:** 具体执行步骤\n**Expectation:** 输出格式和要求\n\n---\n\n原始提示词:\n${content}`,
      trace: `# TRACE框架\n\n**Task:** 具体任务描述\n**Request:** 具体请求和需求\n**Action:** 需要执行的操作\n**Context:** 相关背景信息\n**Example:** 提供示例输入输出\n\n---\n\n原始提示词:\n${content}`,
      none: content,
    };
    return frameworks[fw];
  };

  const getModelColor = (model?: string) => {
    if (!model) return "bg-slate-500/10 border-slate-500/20 text-slate-700";
    const type = inferModelType(model);
    const typeConfig = MODEL_TYPE_LABELS[type];
    return `${typeConfig.color}`;
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          
          {/* 顶部标题栏 */}
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-amber-500" />
                提示词优化助手
              </h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                历史记录
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} disabled={messages.length === 0}>
                <RefreshCw className="h-4 w-4 mr-2" />
                重置
              </Button>
            </div>
          </div>

          {/* 可折叠的配置面板 */}
          <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen} className="mb-4">
            <Card>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Settings2 className="h-4 w-4 text-primary" />
                    优化配置
                    <div className="h-4 w-px bg-border mx-2" />
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="font-normal">
                        {compareMode ? "多模型对比" : "单模型优化"}
                      </Badge>
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        {intensity === "light" ? "轻度" : intensity === "medium" ? "中度" : "深度"}
                      </Badge>
                      {selectedActualModels.length > 0 && (
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                          已选 {selectedActualModels.length} 个模型
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isSettingsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="p-4 pt-0 border-t">
                  <div className="grid gap-6 pt-4">
                    {/* 第一行：基础设置 */}
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch id="compare-mode" checked={compareMode} onCheckedChange={(c) => {
                          setCompareMode(c);
                          if (!c && selectedActualModels.length > 1) setSelectedActualModels([selectedActualModels[0]]);
                        }} />
                        <Label htmlFor="compare-mode" className="cursor-pointer">开启对比模式</Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">强度:</Label>
                        <Select value={intensity} onValueChange={(v) => setIntensity(v as Intensity)}>
                          <SelectTrigger className="h-8 w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">轻度</SelectItem>
                            <SelectItem value="medium">中度</SelectItem>
                            <SelectItem value="deep">深度</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">框架:</Label>
                        <Select value={framework} onValueChange={(v) => setFramework(v as Framework)}>
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">无框架</SelectItem>
                            <SelectItem value="crispe">CRISPE</SelectItem>
                            <SelectItem value="broke">BROKE</SelectItem>
                            <SelectItem value="ape">APE</SelectItem>
                            <SelectItem value="rise">RISE</SelectItem>
                            <SelectItem value="trace">TRACE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 第二行：模型选择器 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          选择模型
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder="搜索模型..."
                            className="h-7 w-[150px] text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          <div className="flex bg-muted rounded-md p-0.5">
                            <button
                              className={`px-2 py-0.5 text-xs rounded-sm transition-colors ${groupBy === 'provider' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                              onClick={() => { setGroupBy('provider'); setFilterType('all'); }}
                            >
                              按厂商
                            </button>
                            <button
                              className={`px-2 py-0.5 text-xs rounded-sm transition-colors ${groupBy === 'type' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                              onClick={() => { setGroupBy('type'); setFilterType('all'); }}
                            >
                              按类型
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md max-h-[200px] overflow-y-auto bg-muted/20">
                        {availableModels.length === 0 ? (
                          <div className="p-8 text-center text-xs text-muted-foreground">
                            请先在 API 密钥页面配置可用模型
                          </div>
                        ) : (
                          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(groupBy === 'type' ? Object.entries(filteredModelsByType) : Object.entries(filteredModelsByProvider)).map(([group, models]) => {
                              if (models.length === 0) return null;
                              return (
                                <div key={group} className="col-span-full">
                                  <div className="text-xs font-semibold text-muted-foreground mb-2 mt-2 px-1 uppercase tracking-wider flex items-center gap-2">
                                    {group}
                                    <div className="h-px flex-1 bg-border" />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {models.map(model => (
                                      <div
                                        key={model.name}
                                        className={`
                                          flex items-center gap-2 p-2 rounded border cursor-pointer text-xs transition-all
                                          ${selectedActualModels.includes(model.name) 
                                            ? 'bg-primary/10 border-primary text-primary font-medium'
                                            : 'bg-card border-border hover:border-primary/50'
                                          }
                                        `}
                                        onClick={() => {
                                          if (compareMode) {
                                            setSelectedActualModels(prev => 
                                              prev.includes(model.name) ? prev.filter(m => m !== model.name) : [...prev, model.name]
                                            );
                                          } else {
                                            setSelectedActualModels([model.name]);
                                          }
                                        }}
                                      >
                                        <Checkbox 
                                          checked={selectedActualModels.includes(model.name)}
                                          className="h-3.5 w-3.5" 
                                        />
                                        <span className="truncate flex-1">{model.name}</span>
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-0 bg-background/50">
                                          {MODEL_TYPE_LABELS[model.type].label}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 消息区域 */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-6 min-h-0">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground/50">
                <div className="text-center space-y-2">
                  <Sparkles className="h-12 w-12 mx-auto opacity-20" />
                  <p>输入提示词开始优化</p>
                </div>
              </div>
            ) : (
              // ... 渲染消息列表，保持之前的逻辑 ...
              (() => {
                const rounds: Array<{ user: Message; assistants: Message[] }> = [];
                let currentRound: { user: Message | null; assistants: Message[] } = { user: null, assistants: [] };
                messages.forEach(msg => {
                  if (msg.role === "user") {
                    if (currentRound.user) rounds.push(currentRound as any);
                    currentRound = { user: msg, assistants: [] };
                  } else {
                    currentRound.assistants.push(msg);
                  }
                });
                if (currentRound.user) rounds.push(currentRound as any);

                return rounds.map((round, roundIndex) => (
                  <div key={roundIndex} className="space-y-4">
                    <div className="flex justify-center">
                      <div className="bg-muted/50 px-4 py-2 rounded-2xl max-w-2xl text-sm">
                        {round.user.content}
                      </div>
                    </div>
                    {round.assistants.length > 0 && (
                      <div className={`grid gap-6 ${round.assistants.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
                        {round.assistants.map((assistant, i) => (
                          <div
                            key={i}
                            className={cn(
                              "group relative w-full overflow-hidden rounded-2xl",
                              "border border-white/60 bg-white/70 backdrop-blur-xl",
                              "shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
                              "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]"
                            )}
                          >
                            {/* 装饰性背景：更微妙的渐变光晕 */}
                            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-purple-100/50 to-blue-100/50 blur-3xl transition-opacity duration-500 opacity-60 group-hover:opacity-100" />

                            {/* 1. Header: 模型信息与状态 */}
                            <div className="relative flex items-center justify-between border-b border-slate-100 px-6 py-4">
                              <div className="flex items-center gap-3">
                                {/* 模型徽章 */}
                                <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-100">
                                  <Cpu className="h-3.5 w-3.5" />
                                  {assistant.modelDisplay || assistant.model || "AI"}
                                </div>
                                {/* 生成时间 */}
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  <span>刚刚</span>
                                </div>
                              </div>

                              {/* 状态标签 */}
                              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                                <Sparkles className="h-3.5 w-3.5 fill-emerald-100" />
                                已优化
                              </div>
                            </div>

                            {/* 2. Body: 内容展示区 */}
                            <div className="relative px-6 py-5">
                              {/* 内容容器：模拟纸张感，提升文字可读性 */}
                              <div className="prose prose-slate prose-sm max-w-none rounded-xl bg-slate-50/50 p-4 leading-relaxed text-slate-700 ring-1 ring-black/5 transition-colors hover:bg-slate-50">
                                <Streamdown>{assistant.content}</Streamdown>
                              </div>

                              {/* 教育特性标签组 */}
                              <div className="mt-4 flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200">
                                  🎯 目标明确
                                </span>
                                <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200">
                                  📚 教育优化
                                </span>
                                <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200">
                                  💡 结构清晰
                                </span>
                              </div>
                            </div>

                            {/* 3. Footer: 统计与操作 */}
                            <div className="flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-white/80 px-6 py-3">
                              {/* 左侧：统计数据 */}
                              <div className="flex gap-4 text-xs font-medium text-slate-400">
                                <span className="flex items-center gap-1 transition-colors hover:text-slate-600">
                                  <BarChart2 className="h-3 w-3" /> {assistant.content.length} 字符
                                </span>
                                <span className="transition-colors hover:text-slate-600">
                                  {assistant.content.split('\n\n').length} 段落
                                </span>
                              </div>

                              {/* 右侧：主要操作按钮 */}
                              <div className="flex gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleSave(assistant.content, round.user.content)}
                                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-200/50 hover:text-slate-900 active:scale-95"
                                    >
                                      <Save className="h-3.5 w-3.5" />
                                      保存
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>保存到提示词库</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleCopy(assistant.content, roundIndex, i)}
                                      className={cn(
                                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                                        copiedIndex === `${roundIndex}-${i}`
                                          ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                                          : "bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 hover:shadow-md"
                                      )}
                                    >
                                      {copiedIndex === `${roundIndex}-${i}` ? (
                                        <>
                                          <Check className="h-3.5 w-3.5" />
                                          已复制
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3.5 w-3.5" />
                                          复制
                                        </>
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>{copiedIndex === `${roundIndex}-${i}` ? '已复制!' : '复制到剪贴板'}</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ));
              })()
            )}
          </div>

          {/* 底部输入框 */}
          <Card className="p-3">
             <div className="flex gap-2">
               <Textarea 
                 value={prompt}
                 onChange={e => setPrompt(e.target.value)}
                 placeholder="输入提示词..."
                 className="min-h-[50px] resize-none"
                 onKeyDown={e => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleOptimize();
                   }
                 }}
               />
               <Button onClick={handleOptimize} disabled={isOptimizing} className="h-auto">
                 {isOptimizing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
               </Button>
             </div>
          </Card>

        </div>
        
        {/* 历史记录保持不变，但可以考虑做成 Drawer 或 Sheet */}
        {showHistory && (
           <div className="w-80 border-l pl-4 hidden md:block">
             <h3 className="font-medium mb-3">历史记录</h3>
             <div className="space-y-2">
                {historyList?.map(h => (
                  <Card key={h.id} className="p-2 cursor-pointer hover:bg-accent" onClick={() => {
                    try {
                      // 恢复对话历史
                      const conversationData = JSON.parse(h.conversationData);
                      setMessages(conversationData);
                      setCurrentHistoryId(h.id);

                      // 恢复设置
                      if (h.settings) {
                        const settings = JSON.parse(h.settings);
                        if (settings.intensity) setIntensity(settings.intensity);
                        if (settings.framework) setFramework(settings.framework);
                        if (typeof settings.compareMode === 'boolean') setCompareMode(settings.compareMode);
                        if (settings.models && Array.isArray(settings.models)) setSelectedActualModels(settings.models);
                      }

                      setIsSettingsOpen(false);
                      toast.success("已恢复历史记录");
                    } catch (e) {
                      console.error("恢复历史记录失败:", e);
                      toast.error("恢复历史记录失败");
                    }
                  }}>
                    <div className="text-xs font-medium truncate">{h.title}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(h.lastMessageAt).toLocaleString()}</div>
                  </Card>
                ))}
             </div>
           </div>
        )}
      </div>

      {/* 保存对话框 */}
      <SaveOptimizedPromptDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        content={contentToSave}
        originalPrompt={originalPromptForSave}
      />
    </DashboardLayout>
  );
}