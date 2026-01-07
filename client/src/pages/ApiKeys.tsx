import DashboardLayout from "@/components/DashboardLayout";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Power, Key, ShieldCheck, MoreHorizontal, FileText, Eye, Image as ImageIcon, Mic, Brain, Code, Search, Box, Edit2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// --- 类型定义 ---
type ModelType = "text" | "vision" | "image" | "audio" | "reasoning" | "code" | "search";

// 定义类型优先级顺序
const TYPE_ORDER: ModelType[] = ["reasoning", "code", "text", "vision", "image", "audio", "search"];

const MODEL_CONFIG: Record<ModelType, { label: string; icon: any; color: string; bg: string }> = {
  text: { label: "文本对话", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
  vision: { label: "视觉识别", icon: Eye, color: "text-purple-500", bg: "bg-purple-500/10" },
  image: { label: "图像生成", icon: ImageIcon, color: "text-pink-500", bg: "bg-pink-500/10" },
  audio: { label: "语音能力", icon: Mic, color: "text-green-500", bg: "bg-green-500/10" },
  reasoning: { label: "深度推理", icon: Brain, color: "text-amber-500", bg: "bg-amber-500/10" },
  code: { label: "代码编程", icon: Code, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  search: { label: "联网搜索", icon: Search, color: "text-indigo-500", bg: "bg-indigo-500/10" },
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

// --- 组件 ---

function ProviderLogo({ name }: { name: string }) {
  const n = name.toLowerCase();
  let initials = name.substring(0, 2).toUpperCase();
  let bgClass = "bg-gradient-to-br from-slate-700 to-slate-800";
  
  if (n.includes("openai")) { initials = "OA"; bgClass = "bg-gradient-to-br from-green-600 to-emerald-800"; }
  else if (n.includes("anthropic")) { initials = "AN"; bgClass = "bg-gradient-to-br from-orange-500 to-red-700"; }
  else if (n.includes("google") || n.includes("gemini")) { initials = "GO"; bgClass = "bg-gradient-to-br from-blue-500 to-indigo-700"; }
  else if (n.includes("mistral")) { initials = "MI"; bgClass = "bg-gradient-to-br from-yellow-500 to-orange-600"; }
  else if (n.includes("groq")) { initials = "GQ"; bgClass = "bg-gradient-to-br from-red-600 to-orange-700"; }

  return (
    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white/10", bgClass)}>
      {initials}
    </div>
  );
}

export default function ApiKeys() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<any>(null); // 新增：用于存储当前正在编辑的 Key
  const { data: apiKeys, isLoading } = trpc.apiKeys.list.useQuery();
  const utils = trpc.useUtils();
  
  const deleteMutation = trpc.apiKeys.delete.useMutation({
    onSuccess: () => {
      toast.success("API密钥已删除");
      utils.apiKeys.list.invalidate();
    },
  });

  const updateMutation = trpc.apiKeys.update.useMutation({
    onSuccess: () => {
      utils.apiKeys.list.invalidate();
    },
  });

  const testMutation = trpc.apiKeys.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error("测试失败: " + error.message);
    },
  });

  const handleToggle = (id: number, current: boolean) => {
    updateMutation.mutate({ id, isActive: !current });
    toast.info(current ? "已禁用密钥" : "已激活密钥");
  };

  const handleTest = (id: number) => {
    testMutation.mutate({ id });
  };

  const handleEdit = (key: any) => {
    setEditingKey(key);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingKey(null);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Key className="w-8 h-8 text-primary" />
              API 服务连接
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              管理 AI 服务提供商凭证。所有凭证均使用 AES-256 标准加密存储。
            </p>
          </div>
          <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-full px-6 h-10">
            <Plus className="h-4 w-4 mr-2" />
            连接新服务
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 rounded-2xl bg-muted/30 animate-pulse border border-border/50" />
            ))}
          </div>
        ) : apiKeys && apiKeys.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {apiKeys.map((key) => {
              let models: string[] = [];
              if (key.models) {
                try { models = JSON.parse(key.models); } catch {}
              }

              // Parse modelMetadata if available
              let metadata: Record<string, { types: ModelType[]; apiType?: string }> = {};
              if (key.modelMetadata) {
                try { metadata = JSON.parse(key.modelMetadata); } catch {}
              }

              // Group models by type (support multiple types per model)
              const groupedModels: Partial<Record<ModelType, string[]>> = {};
              models.forEach(modelName => {
                // Prefer metadata types, fallback to inference
                const types = metadata[modelName]?.types || [inferModelType(modelName)];
                types.forEach(type => {
                  if (!groupedModels[type]) groupedModels[type] = [];
                  if (!groupedModels[type]!.includes(modelName)) {
                    groupedModels[type]!.push(modelName);
                  }
                });
              });

              const hasModels = models.length > 0;

              return (
                <div 
                  key={key.id}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border bg-card transition-all duration-300 overflow-hidden",
                    key.isActive 
                      ? "border-border shadow-sm hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1" 
                      : "border-border/50 opacity-60 grayscale-[0.8]"
                  )}
                >
                  {/* Active Status Dot */}
                  <div className="absolute top-4 right-4 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => handleEdit(key)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle(key.id, key.isActive)}>
                          <Power className="mr-2 h-4 w-4" />
                          {key.isActive ? "禁用" : "激活"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => deleteMutation.mutate({ id: key.id })}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="p-6 flex flex-col h-full gap-6">
                    {/* Header: Logo & Name */}
                    <div className="flex items-center gap-4">
                      <ProviderLogo name={key.provider} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-foreground truncate">{key.name}</h3>
                          {key.isActive && (
                            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">
                          {key.provider}
                        </p>
                      </div>
                    </div>

                    {/* Capabilities Rows (One row per type) */}
                    <div className="flex-1 space-y-3">
                      {hasModels ? (
                        TYPE_ORDER.map(type => {
                          const typeModels = groupedModels[type];
                          if (!typeModels || typeModels.length === 0) return null;
                          const conf = MODEL_CONFIG[type];
                          const Icon = conf.icon;

                          return (
                            <div key={type} className="flex items-start gap-3">
                              {/* Type Icon */}
                              <div className={cn("mt-0.5 p-1.5 rounded-md shrink-0", conf.bg, conf.color)}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              
                              {/* Models List */}
                              <div className="flex flex-wrap gap-2">
                                {typeModels.sort().map(modelName => (
                                  <div 
                                    key={modelName}
                                    className="px-2 py-1 rounded text-[11px] font-medium border border-border/60 bg-muted/20 text-foreground/80 truncate max-w-[140px]"
                                    title={modelName}
                                  >
                                    {modelName}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm italic px-2 py-2 bg-muted/30 rounded-md">
                          <Box className="w-4 h-4" />
                          <span>未配置模型</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Date & Encryption & Test */}
                    <div className="pt-4 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wide">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-emerald-600/80 font-medium">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Encrypted</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px] normal-case"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTest(key.id);
                          }}
                          disabled={!key.isActive || testMutation.isPending}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          {testMutation.isPending ? "测试中" : "测试连接"}
                        </Button>
                      </div>
                      <div className="font-mono">
                        {new Date(key.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-3xl bg-muted/10">
            <div className="w-20 h-20 bg-muted/50 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
              <Key className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground">暂无 API 密钥</h3>
            <p className="text-muted-foreground mt-2 mb-8 max-w-md text-center text-sm leading-relaxed">
              请添加您的第一个 API 密钥。我们支持 OpenAI, Anthropic, Google Gemini 等主流 AI 服务商。
            </p>
            <Button onClick={handleCreate} size="lg" className="rounded-full px-8">
              <Plus className="h-5 w-5 mr-2" />
              立即添加
            </Button>
          </div>
        )}
      </div>

      <ApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} initialData={editingKey} />
    </DashboardLayout>
  );
}