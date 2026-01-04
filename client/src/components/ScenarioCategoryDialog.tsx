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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface ScenarioCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScenarioCategoryDialog({ open, onOpenChange }: ScenarioCategoryDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [parentId, setParentId] = useState<number | undefined>();
  const [industry, setIndustry] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [icon, setIcon] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const utils = trpc.useUtils();
  const { data: scenarios } = trpc.scenarios.list.useQuery();

  const createMutation = trpc.scenarios.create.useMutation({
    onSuccess: () => {
      toast.success("分类创建成功");
      utils.scenarios.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setLevel(1);
    setParentId(undefined);
    setIndustry("");
    setIcon("");
  };

  const handleAIGenerate = async () => {
    if (!industry.trim()) {
      toast.error("请先输入行业名称");
      return;
    }

    setIsGenerating(true);
    try {
      // TODO: 调用AI生成分类建议
      toast.info("AI辅助生成功能开发中,敬请期待");
    } catch (error) {
      toast.error("生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("分类名称不能为空");
      return;
    }

    if (level > 1 && !parentId) {
      toast.error("请选择父分类");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      level,
      parentId: level > 1 ? parentId : undefined,
      icon: icon || undefined,
    });
  };

  const level1Categories = scenarios?.filter(s => s.level === 1) || [];
  const level2Categories = scenarios?.filter(s => s.level === 2 && (!parentId || s.parentId === parentId)) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>添加自定义分类</DialogTitle>
          <DialogDescription>创建新的应用场景分类或使用AI辅助生成</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label>AI辅助生成分类</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isGenerating ? "生成中..." : "AI生成"}
                </Button>
              </div>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="输入行业名称,如:电商、教育、医疗等"
              />
              <p className="text-xs text-muted-foreground">
                AI将根据行业特点自动生成三级分类结构
              </p>
            </div>

            <div className="space-y-2">
              <Label>分类级别</Label>
              <Select value={level.toString()} onValueChange={(v) => setLevel(Number(v) as 1 | 2 | 3)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">一级分类</SelectItem>
                  <SelectItem value="2">二级分类</SelectItem>
                  <SelectItem value="3">三级分类</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {level >= 2 && (
              <div className="space-y-2">
                <Label>父分类(一级)</Label>
                <Select value={parentId?.toString() || ""} onValueChange={(v) => setParentId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择一级分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {level1Categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {level === 3 && parentId && (
              <div className="space-y-2">
                <Label>父分类(二级)</Label>
                <Select value={parentId?.toString() || ""} onValueChange={(v) => setParentId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择二级分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {level2Categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="icon">图标 (Emoji)</Label>
              <div className="flex gap-2">
                <Input
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="输入Emoji或点击选择"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  {icon || "📚"}
                </Button>
              </div>
              {showEmojiPicker && (
                <div className="grid grid-cols-8 gap-2 p-3 border border-border rounded-lg">
                  {["📚", "💼", "🎨", "💻", "🔬", "🏭", "🏛️", "🏥",
                    "🎓", "📊", "📦", "👥", "📱", "🌐", "⚙️", "💡",
                    "🎯", "📢", "📝", "📈", "🔑", "🎉", "❤️", "⭐"].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className="text-2xl hover:bg-muted rounded p-2 transition-colors"
                      onClick={() => {
                        setIcon(emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">分类名称</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入分类名称"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简短描述此分类的用途"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
