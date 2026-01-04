import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import { Search, Star, Download, MessageSquare, TrendingUp, FolderTree, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Marketplace() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const [level1Filter, setLevel1Filter] = useState<string>("all");
  const [level2Filter, setLevel2Filter] = useState<string>("all");
  const [level3Filter, setLevel3Filter] = useState<string>("all");

  const utils = trpc.useUtils();
  const { data: prompts, isLoading } = trpc.marketplace.listPublicPrompts.useQuery();
  const { data: favorites } = trpc.marketplace.myFavorites.useQuery();
  const { data: scenarios } = trpc.scenarios.list.useQuery();

  // 处理URL参数中的scenario过滤
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const scenarioParam = urlParams.get('scenario');

    if (scenarioParam && scenarios) {
      const scenarioId = parseInt(scenarioParam);
      const scenario = scenarios.find(s => s.id === scenarioId);

      if (scenario) {
        // 根据场景层级设置过滤器
        if (scenario.level === 1) {
          setLevel1Filter(scenarioId.toString());
          setLevel2Filter("all");
          setLevel3Filter("all");
        } else if (scenario.level === 2) {
          // 找到父级场景
          const parent1 = scenarios.find(s => s.id === scenario.parentId);
          if (parent1) {
            setLevel1Filter(parent1.id.toString());
            setLevel2Filter(scenarioId.toString());
            setLevel3Filter("all");
          }
        } else if (scenario.level === 3) {
          // 找到父级和祖父级场景
          const parent2 = scenarios.find(s => s.id === scenario.parentId);
          if (parent2) {
            const parent1 = scenarios.find(s => s.id === parent2.parentId);
            if (parent1) {
              setLevel1Filter(parent1.id.toString());
              setLevel2Filter(parent2.id.toString());
              setLevel3Filter(scenarioId.toString());
            }
          }
        }
      }
    }
  }, [location, scenarios]);
  const { data: comments } = trpc.marketplace.getComments.useQuery(
    { promptId: selectedPrompt?.id },
    { enabled: !!selectedPrompt }
  );

  const favoriteMutation = trpc.marketplace.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.marketplace.myFavorites.invalidate();
      utils.marketplace.listPublicPrompts.invalidate();
      toast.success("操作成功");
    },
  });

  const importMutation = trpc.marketplace.importPrompt.useMutation({
    onSuccess: () => {
      toast.success("提示词已导入到您的库中");
      utils.prompts.list.invalidate();
    },
  });

  const commentMutation = trpc.marketplace.addComment.useMutation({
    onSuccess: () => {
      toast.success("评论已发布");
      setCommentDialogOpen(false);
      setCommentContent("");
      setCommentRating(5);
      utils.marketplace.getComments.invalidate();
    },
  });

  // 构建场景层级
  const level1Scenarios = useMemo(() => {
    return scenarios?.filter(s => s.level === 1) || [];
  }, [scenarios]);

  const level2Scenarios = useMemo(() => {
    if (level1Filter === "all") return [];
    const parentId = parseInt(level1Filter);
    return scenarios?.filter(s => s.level === 2 && s.parentId === parentId) || [];
  }, [scenarios, level1Filter]);

  const level3Scenarios = useMemo(() => {
    if (level2Filter === "all") return [];
    const parentId = parseInt(level2Filter);
    return scenarios?.filter(s => s.level === 3 && s.parentId === parentId) || [];
  }, [scenarios, level2Filter]);

  // 获取场景路径
  const getScenarioPath = (scenarioId: number | null | undefined): string => {
    if (!scenarioId || !scenarios) return "";

    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return "";

    const path: string[] = [scenario.name];
    let current = scenario;

    while (current.parentId) {
      const parent = scenarios.find(s => s.id === current.parentId);
      if (!parent) break;
      path.unshift(parent.name);
      current = parent;
    }

    return path.join(" > ");
  };

  // 当level1变化时，重置level2和level3
  const handleLevel1Change = (value: string) => {
    setLevel1Filter(value);
    setLevel2Filter("all");
    setLevel3Filter("all");
  };

  const handleLevel2Change = (value: string) => {
    setLevel2Filter(value);
    setLevel3Filter("all");
  };

  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];

    return prompts.filter((p) => {
      // 搜索过滤
      const matchesSearch = !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 场景过滤
      if (level1Filter === "all") return true;
      if (!p.scenarioId) return false;

      const scenario = scenarios?.find(s => s.id === p.scenarioId);
      if (!scenario) return false;

      // 根据场景层级匹配
      if (scenario.level === 1) {
        return scenario.id.toString() === level1Filter;
      } else if (scenario.level === 2) {
        const matchesLevel2 = level2Filter === "all" || scenario.id.toString() === level2Filter;
        const matchesLevel1 = scenario.parentId?.toString() === level1Filter;
        return matchesLevel1 && matchesLevel2;
      } else if (scenario.level === 3) {
        const matchesLevel3 = level3Filter === "all" || scenario.id.toString() === level3Filter;
        const parent2 = scenarios?.find(s => s.id === scenario.parentId);
        const matchesLevel2 = level2Filter === "all" || parent2?.id.toString() === level2Filter;
        const matchesLevel1 = parent2?.parentId?.toString() === level1Filter;
        return matchesLevel1 && matchesLevel2 && matchesLevel3;
      }

      return false;
    });
  }, [prompts, scenarios, searchQuery, level1Filter, level2Filter, level3Filter]);

  const isFavorited = (promptId: number) => {
    return favorites?.some((f) => f.promptId === promptId);
  };

  const handleToggleFavorite = (promptId: number) => {
    favoriteMutation.mutate({ promptId });
  };

  const handleImport = (promptId: number) => {
    importMutation.mutate({ promptId });
  };

  const handleComment = (prompt: any) => {
    setSelectedPrompt(prompt);
    setCommentDialogOpen(true);
  };

  const handleSubmitComment = () => {
    if (!selectedPrompt) return;
    commentMutation.mutate({
      promptId: selectedPrompt.id,
      content: commentContent,
      rating: commentRating,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">提示词市场</h1>
          <p className="text-muted-foreground">
            浏览和导入社区分享的优质提示词模板
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索提示词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 场景筛选器 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">按场景筛选</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={level1Filter} onValueChange={handleLevel1Change}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="选择大类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部大类</SelectItem>
                {level1Scenarios.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.icon} {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {level1Filter !== "all" && level2Scenarios.length > 0 && (
              <Select value={level2Filter} onValueChange={handleLevel2Change}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="选择学科/领域" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部学科/领域</SelectItem>
                  {level2Scenarios.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.icon} {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {level2Filter !== "all" && level3Scenarios.length > 0 && (
              <Select value={level3Filter} onValueChange={setLevel3Filter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="选择教学环节" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部教学环节</SelectItem>
                  {level3Scenarios.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.icon} {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 当前筛选路径 */}
          {level1Filter !== "all" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>当前筛选：</span>
              <Badge variant="secondary" className="font-normal">
                {getScenarioPath(
                  level3Filter !== "all" ? parseInt(level3Filter) :
                  level2Filter !== "all" ? parseInt(level2Filter) :
                  parseInt(level1Filter)
                )}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLevel1Filter("all");
                  setLevel2Filter("all");
                  setLevel3Filter("all");
                }}
                className="h-6 text-xs"
              >
                清除筛选
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : filteredPrompts && filteredPrompts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="border border-border rounded-lg p-4 hover:border-foreground transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{prompt.title}</h3>
                    {prompt.scenarioId && (
                      <div className="flex items-center gap-1 mb-1">
                        <FolderTree className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {getScenarioPath(prompt.scenarioId)}
                        </span>
                      </div>
                    )}
                    {prompt.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {prompt.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleFavorite(prompt.id)}
                    className={isFavorited(prompt.id) ? "text-yellow-600" : ""}
                  >
                    <Star
                      className="h-4 w-4"
                      fill={isFavorited(prompt.id) ? "currentColor" : "none"}
                    />
                  </Button>
                </div>

                <div className="text-xs font-mono text-muted-foreground line-clamp-3 mb-3 bg-muted p-2 rounded-lg">
                  {prompt.content}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  {prompt.score && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>评分: {prompt.score}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>0 评论</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    <span>0 收藏</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleImport(prompt.id)}
                    className="flex-1"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    导入
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleComment(prompt)}
                    className="flex-1"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    评论
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">
              {searchQuery ? "未找到匹配的提示词" : "暂无公开提示词"}
            </p>
          </div>
        )}
      </div>

      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发表评论</DialogTitle>
            <DialogDescription>
              分享您对"{selectedPrompt?.title}"的使用体验
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>评分</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCommentRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= commentRating
                          ? "text-yellow-600 fill-yellow-600"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">评论内容</Label>
              <Textarea
                id="comment"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="分享您的使用体验..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCommentDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmitComment}
              disabled={!commentContent.trim() || commentMutation.isPending}
            >
              {commentMutation.isPending ? "发布中..." : "发布评论"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
