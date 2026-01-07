import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  Sparkles,
  Download,
  RefreshCw,
  Trash2,
  Image as ImageIcon,
  Maximize2,
  Clock,
  Filter,
  Wand2,
  Loader2,
  User,
  Mountain,
  Palette,
  Camera,
  Zap
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// 预设风格模板
const STYLE_PRESETS = [
  { id: "portrait", name: "肖像", Icon: User, prompt: "high quality portrait, professional lighting, detailed features" },
  { id: "landscape", name: "风景", Icon: Mountain, prompt: "beautiful landscape, scenic view, vibrant colors, high resolution" },
  { id: "abstract", name: "抽象", Icon: Palette, prompt: "abstract art, creative composition, bold colors, artistic" },
  { id: "anime", name: "动漫", Icon: Sparkles, prompt: "anime style, detailed illustration, vibrant, high quality" },
  { id: "realistic", name: "写实", Icon: Camera, prompt: "photorealistic, detailed, natural lighting, high quality" },
  { id: "fantasy", name: "奇幻", Icon: Wand2, prompt: "fantasy art, magical, imaginative, detailed, epic" },
];

// 尺寸选项
const SIZE_OPTIONS = [
  { value: "1024x1024", label: "正方形 (1:1)", aspect: "1024×1024" },
  { value: "1024x1792", label: "竖屏 (9:16)", aspect: "1024×1792" },
  { value: "1792x1024", label: "横屏 (16:9)", aspect: "1792×1024" },
];

const MAX_PROMPT_LENGTH = 2000;

export default function ImageGeneration() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quantity, setQuantity] = useState(1);
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [style, setStyle] = useState<"vivid" | "natural">("vivid");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // API 查询
  const apiKeysQuery = trpc.apiKeys.list.useQuery();
  const historyQuery = trpc.imageGeneration.getHistory.useQuery({ limit: 20 });
  const generateMutation = trpc.imageGeneration.generate.useMutation();
  const deleteMutation = trpc.imageGeneration.delete.useMutation();

  // 获取可用的生图模型
  const imageModels = apiKeysQuery.data
    ?.flatMap((key) => {
      try {
        const models = key.models ? JSON.parse(key.models) : [];
        return models
          .filter((m: any) => {
            const modelName = m.name || m;
            // 类型检查：确保 modelName 是字符串
            if (typeof modelName !== 'string') {
              console.warn('Invalid model name type:', modelName);
              return false;
            }

            // 排除阿里云的图片编辑模型（不支持 compatible-mode）
            if (modelName.toLowerCase().includes('qwen-image')) {
              console.warn('Qwen image models not supported in compatible-mode:', modelName);
              return false;
            }

            // 排除火山引擎的视频生成模型
            if (modelName.toLowerCase().includes('seedance')) {
              console.warn('SeeDANCE is video generation model, not supported:', modelName);
              return false;
            }

            // 只保留图片生成模型
            return modelName.toLowerCase().includes('seedream') ||  // 火山引擎图片生成
                   modelName.toLowerCase().includes('dall-e') ||    // OpenAI DALL-E
                   modelName.toLowerCase().includes('stable-diffusion'); // Stable Diffusion
          })
          .map((m: any) => ({
            name: m.name || m,
            provider: key.provider,
            apiKeyId: key.id,
          }));
      } catch {
        return [];
      }
    })
    .filter(Boolean) || [];

  // 应用预设风格
  const applyPreset = (preset: typeof STYLE_PRESETS[0]) => {
    if (prompt) {
      setPrompt(`${prompt}, ${preset.prompt}`);
    } else {
      setPrompt(preset.prompt);
    }
    toast.success(`已应用「${preset.name}」风格`);
  };

  // 生成图片
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("请输入图片描述");
      return;
    }
    if (!model) {
      toast.error("请选择生成模型");
      return;
    }

    setIsGenerating(true);
    try {
      const selectedModel = imageModels.find(m => m.name === model);
      const result = await generateMutation.mutateAsync({
        prompt,
        model,
        apiKeyId: selectedModel?.apiKeyId,
        parameters: { size, n: quantity, quality, style },
      });

      toast.success(`成功生成 ${result.images.length} 张图片！`);
      historyQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  // 下载图片
  const downloadImage = (url: string, filename: string) => {
    // URL 安全检查：只允许 http/https 协议
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        toast.error("不安全的URL协议");
        return;
      }
    } catch (e) {
      toast.error("无效的URL");
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    toast.success("开始下载图片");
  };

  // 删除记录
  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("删除成功");
      historyQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "删除失败");
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              AI 图片生成
            </h1>
          </div>
          <p className="text-slate-600">
            用文字描述你的想象，让 AI 为你创造精美的图片
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：生成表单 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 提示词输入区 */}
            <Card className="p-6 border-2 border-pink-100 hover:border-pink-200 transition-all duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-pink-600" />
                    图片描述
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${prompt.length > MAX_PROMPT_LENGTH * 0.9 ? 'text-orange-600' : 'text-slate-500'}`}>
                      {prompt.length}/{MAX_PROMPT_LENGTH}
                    </span>
                    <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-200">
                      支持中英文
                    </Badge>
                  </div>
                </div>

                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
                  maxLength={MAX_PROMPT_LENGTH}
                  placeholder="描述主体、场景、光线和氛围，例如：晨光中，穿着和服的少女站在樱花树下，柔和的光影洒落，电影感质感。"
                  className="min-h-[120px] text-base resize-none focus:ring-2 focus:ring-pink-500 transition-all duration-200"
                />

                {/* 预设风格快捷按钮 */}
                <div>
                  <Label className="text-sm text-slate-600 mb-2 block">快速风格</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {STYLE_PRESETS.map((preset) => {
                      const Icon = preset.Icon;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset)}
                          className="group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-slate-200 bg-white/80 backdrop-blur-sm hover:border-pink-300 hover:bg-pink-50/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                          type="button"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5 text-pink-600" />
                          </div>
                          <span className="text-xs font-medium text-slate-700">{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* 参数配置区 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-600" />
                生成参数
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* 模型选择 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">模型<span className="text-red-500">*</span></Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="border-slate-300 focus:ring-pink-500 cursor-pointer">
                      <SelectValue placeholder="选择生成模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {imageModels.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-2">暂无可用的生图模型</p>
                          <p className="text-xs text-muted-foreground">
                            请先在「API 密钥」页面配置生图模型
                          </p>
                        </div>
                      ) : (
                        imageModels.map((m) => (
                          <SelectItem key={m.name} value={m.name}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {m.provider}
                              </Badge>
                              {m.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">不同模型生成效果不同</p>
                </div>

                {/* 尺寸 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">尺寸</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className="border-slate-300 focus:ring-pink-500 cursor-pointer">
                      <SelectValue placeholder="选择尺寸" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label} <span className="text-slate-500 text-xs ml-2">{opt.aspect}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">选择输出图片的宽高比</p>
                </div>

                {/* 数量 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">数量</Label>
                  <Select value={quantity.toString()} onValueChange={(v) => setQuantity(Number(v))}>
                    <SelectTrigger className="border-slate-300 focus:ring-pink-500 cursor-pointer">
                      <SelectValue placeholder="选择数量" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} 张
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">一次生成多张图片</p>
                </div>

                {/* 质量 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">质量</Label>
                  <Select value={quality} onValueChange={(v: any) => setQuality(v)}>
                    <SelectTrigger className="border-slate-300 focus:ring-pink-500 cursor-pointer">
                      <SelectValue placeholder="选择质量" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">标准</SelectItem>
                      <SelectItem value="hd">高清 (HD)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">高清质量消耗更多时间</p>
                </div>
              </div>

              {/* 艺术风格 - 全宽 */}
              <div className="mt-4 space-y-2">
                <Label className="text-sm font-medium">艺术风格</Label>
                <Select value={style} onValueChange={(v: any) => setStyle(v)}>
                  <SelectTrigger className="border-slate-300 focus:ring-pink-500 cursor-pointer">
                    <SelectValue placeholder="选择艺术风格" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vivid">鲜艳生动 (Vivid)</SelectItem>
                    <SelectItem value="natural">自然真实 (Natural)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Vivid 更有创意，Natural 更写实</p>
              </div>

              {/* 生成按钮 */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt || !model}
                className="w-full mt-6 h-14 text-lg font-semibold bg-gradient-to-r from-pink-600 via-pink-500 to-purple-600 hover:from-pink-700 hover:via-pink-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    {quantity > 1 ? `正在生成 ${quantity} 张图片...` : "生成中..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-6 w-6" />
                    {quantity > 1 ? `生成 ${quantity} 张图片` : "开始生成"}
                  </>
                )}
              </Button>
            </Card>
          </div>

          {/* 右侧：历史记录侧边栏 */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  生成历史
                </h3>
                <Badge variant="secondary">{historyQuery.data?.length || 0}</Badge>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                {historyQuery.data?.map((record) => (
                  <Card
                    key={record.id}
                    className="p-3 hover:shadow-lg transition-all duration-200 border-2 border-slate-200 hover:border-pink-200 cursor-pointer"
                  >
                    {record.imageUrls.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="relative aspect-square rounded-lg overflow-hidden mb-3 group cursor-pointer">
                            <img
                              src={record.imageUrls[0]}
                              alt="Generated"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
                            </div>
                            {record.imageUrls.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                {record.imageUrls.length} 张
                              </div>
                            )}
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <img
                            src={record.imageUrls[0]}
                            alt="Full size"
                            className="w-full h-auto rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>
                    )}

                    <p className="text-sm text-slate-700 line-clamp-2 mb-2 leading-relaxed">
                      {record.prompt}
                    </p>

                    {/* 状态和错误信息 */}
                    <div className="mb-2">
                      {record.status === 'pending' && (
                        <Badge variant="secondary" className="text-xs">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          生成中...
                        </Badge>
                      )}
                      {record.status === 'failed' && (
                        <Badge variant="destructive" className="text-xs">
                          失败：{record.errorMessage || '未知错误'}
                        </Badge>
                      )}
                      {record.status === 'success' && record.imageUrls.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                          成功生成 {record.imageUrls.length} 张
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <Badge variant="outline" className="text-xs bg-slate-50">
                        {record.model}
                      </Badge>
                      <div className="flex gap-1">
                        {record.imageUrls.map((url, idx) => (
                          <Button
                            key={idx}
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadImage(url, `image-${record.id}-${idx}.png`)}
                            className="h-8 w-8 p-0 hover:bg-pink-100 cursor-pointer"
                            title="下载图片"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100 cursor-pointer"
                          title="删除记录"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
