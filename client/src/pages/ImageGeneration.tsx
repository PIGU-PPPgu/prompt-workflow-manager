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
            return modelName.toLowerCase().includes('image') ||
                   modelName.toLowerCase().includes('seedance') ||
                   modelName.toLowerCase().includes('seedream');
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
            <Card className="p-6 border-2 border-pink-100 hover:border-pink-200 transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-pink-600" />
                    图片描述
                  </Label>
                  <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-200">
                    支持中英文
                  </Badge>
                </div>

                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要生成的图片，例如：一只可爱的橘猫坐在窗台上，温暖的阳光洒在它身上，背景是城市天际线..."
                  className="min-h-[120px] text-base resize-none focus:ring-2 focus:ring-pink-500"
                />

                {/* 预设风格快捷按钮 */}
                <div>
                  <Label className="text-sm text-slate-600 mb-2 block">快速风格</Label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_PRESETS.map((preset) => {
                      const Icon = preset.Icon;
                      return (
                        <Button
                          key={preset.id}
                          variant="outline"
                          size="sm"
                          onClick={() => applyPreset(preset)}
                          className="hover:bg-pink-50 hover:border-pink-300 transition-colors"
                        >
                          <Icon className="w-3.5 h-3.5 mr-1.5" />
                          {preset.name}
                        </Button>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 模型选择 */}
                <div className="space-y-2">
                  <Label>选择模型</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择生成模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {imageModels.length === 0 ? (
                        <SelectItem value="none" disabled>
                          请先配置 API Key
                        </SelectItem>
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
                </div>

                {/* 尺寸 */}
                <div className="space-y-2">
                  <Label>图片尺寸</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label} <span className="text-slate-500 text-xs ml-2">{opt.aspect}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 数量 */}
                <div className="space-y-2">
                  <Label>生成数量</Label>
                  <Select value={quantity.toString()} onValueChange={(v) => setQuantity(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} 张
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 质量 */}
                <div className="space-y-2">
                  <Label>图片质量</Label>
                  <Select value={quality} onValueChange={(v: any) => setQuality(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">标准</SelectItem>
                      <SelectItem value="hd">高清 (HD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 风格 */}
                <div className="space-y-2 md:col-span-2">
                  <Label>艺术风格</Label>
                  <Select value={style} onValueChange={(v: any) => setStyle(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vivid">鲜艳生动 (Vivid)</SelectItem>
                      <SelectItem value="natural">自然真实 (Natural)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 生成按钮 */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt || !model}
                className="w-full mt-6 h-12 text-base bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 transition-all duration-300"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    开始生成
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
                    className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {record.imageUrls.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="relative aspect-square rounded-lg overflow-hidden mb-2 group">
                            <img
                              src={record.imageUrls[0]}
                              alt="Generated"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
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

                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                      {record.prompt}
                    </p>

                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {record.model}
                      </Badge>
                      <div className="flex gap-1">
                        {record.imageUrls.map((url, idx) => (
                          <Button
                            key={idx}
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadImage(url, `image-${record.id}-${idx}.png`)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
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
