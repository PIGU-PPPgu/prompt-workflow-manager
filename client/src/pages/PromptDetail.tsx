import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Sparkles, Copy, Clock, TrendingUp, Tag, FolderTree, History, ArrowLeft, GitCompare, Share2, Link as LinkIcon, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseTags } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PromptDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const promptId = parseInt(params.id || "0");
  
  const { data: prompt, isLoading } = trpc.prompts.getById.useQuery({ id: promptId });
  const { data: scenarios } = trpc.scenarios.list.useQuery();
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [showUsageHistory, setShowUsageHistory] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [satisfaction, setSatisfaction] = useState(5);
  const [hitExpectation, setHitExpectation] = useState(true);
  const [usable, setUsable] = useState(true);
  const [feedbackComment, setFeedbackComment] = useState("");
  
  const { data: versions } = trpc.prompts.versions.useQuery(
    { promptId },
    { enabled: showVersions || compareMode }
  );
  
  const { data: usageHistory } = trpc.prompts.usageHistory.useQuery(
    { promptId, limit: 10 },
    { enabled: showUsageHistory }
  );

  const utils = trpc.useUtils();
  const feedbackMutation = trpc.prompts.feedback.useMutation({
    onSuccess: () => {
      toast.success("感谢反馈！");
      utils.prompts.feedbackSummary.invalidate({ promptId });
      setFeedbackOpen(false);
      setFeedbackComment("");
      setSatisfaction(5);
      setHitExpectation(true);
      setUsable(true);
    },
    onError: (error) => {
      toast.error("反馈提交失败: " + error.message);
    },
  });
  const { data: feedbackSummary } = trpc.prompts.feedbackSummary.useQuery(
    { promptId },
    { enabled: !!promptId }
  );

  const analyzeMutation = trpc.prompts.analyzeAndSuggest.useMutation({
    onSuccess: (data) => {
      setAiSuggestions(data);
      toast.success("AI分析完成");
    },
    onError: (error) => {
      toast.error("分析失败: " + error.message);
    },
  });

  const adoptSuggestionsMutation = trpc.prompts.update.useMutation({
    onSuccess: () => {
      toast.success("已采纳AI建议");
      utils.prompts.getById.invalidate({ id: promptId });
      setAiSuggestions(null);
    },
    onError: (error) => {
      toast.error("更新失败: " + error.message);
    },
  });
  
  const createShareMutation = trpc.prompts.createShare.useMutation({
    onSuccess: (data) => {
      setShareToken(data.token);
      toast.success("分享链接已生成！");
    },
    onError: (error) => {
      toast.error("生成失败: " + error.message);
    },
  });
  
  const restoreVersionMutation = trpc.prompts.restoreVersion.useMutation({
    onSuccess: () => {
      toast.success("版本恢复成功！");
      utils.prompts.getById.invalidate({ id: promptId });
      utils.prompts.versions.invalidate({ promptId });
    },
    onError: (error) => {
      toast.error("恢复失败: " + error.message);
    },
  });

  const recordUseMutation = trpc.prompts.recordUse.useMutation({
    onSuccess: () => {
      utils.prompts.getById.invalidate({ id: promptId });
    },
  });

  const handleCopy = () => {
    if (prompt?.content) {
      navigator.clipboard.writeText(prompt.content);
      toast.success("✅ 已复制");
      // 记录复制次数
      recordUseMutation.mutate({ id: promptId });
    }
  };
  
  const handleShare = () => {
    setShowShareDialog(true);
    setShareToken(null);
  };
  
  const handleRestoreVersion = (version: number) => {
    if (confirm(`确定要恢复到版本 ${version} 吗？当前内容将被替换。`)) {
      restoreVersionMutation.mutate({ promptId, version });
    }
  };
  
  const handleCreateShare = () => {
    createShareMutation.mutate({
      promptId,
      permission: sharePermission,
      isPublic: true,
    });
  };

  const handleCopyShareLink = () => {
    if (shareToken) {
      const shareUrl = `${window.location.origin}/share/${shareToken}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success("分享链接已复制！");
    }
  };

  const handleSubmitFeedback = () => {
    feedbackMutation.mutate({
      promptId,
      satisfactionScore: satisfaction,
      hitExpectation,
      usable,
      comment: feedbackComment || undefined,
    });
  };

  const handleAnalyze = () => {
    if (prompt) {
      analyzeMutation.mutate({ promptId: prompt.id, content: prompt.content });
    }
  };

  const handleAdoptSuggestions = () => {
    if (aiSuggestions && prompt) {
      adoptSuggestionsMutation.mutate({
        id: prompt.id,
        tags: JSON.stringify(aiSuggestions.suggestedTags),
        scenarioId: aiSuggestions.suggestedScenarioId,
      });
    }
  };

  const getScenarioPath = (scenarioId: number | null) => {
    if (!scenarioId || !scenarios) return "";
    
    const findPath = (id: number): string[] => {
      const scenario = scenarios.find(s => s.id === id);
      if (!scenario) return [];
      if (!scenario.parentId) return [scenario.name];
      return [...findPath(scenario.parentId), scenario.name];
    };
    
    return findPath(scenarioId).join(" / ");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!prompt) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">提示词不存在</p>
        </div>
      </DashboardLayout>
    );
  }

  const tags = parseTags(prompt.tags);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/prompts")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{prompt.title}</h1>
              {prompt.description && (
                <p className="text-muted-foreground mt-1">{prompt.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              复制
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              分享
            </Button>
            <Button variant="outline" onClick={() => setFeedbackOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              提交反馈
            </Button>
            <div className="flex flex-col gap-2">
              <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
                {analyzeMutation.isPending ? (
                  <>分析中...</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI分析
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                使用: Manus 内置 API (GPT-4)
              </p>
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        {aiSuggestions && (
          <Card className="p-6 border-primary">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">AI分析建议</h3>
              </div>
              <Button onClick={handleAdoptSuggestions} disabled={adoptSuggestionsMutation.isPending}>
                {adoptSuggestionsMutation.isPending ? "采纳中..." : "一键采纳"}
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  推荐标签
                </h4>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.suggestedTags?.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>

              {aiSuggestions.suggestedScenarioId && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FolderTree className="h-4 w-4" />
                    推荐分类
                  </h4>
                  <Badge variant="outline">
                    {getScenarioPath(aiSuggestions.suggestedScenarioId)}
                  </Badge>
                </div>
              )}

              {aiSuggestions.reasoning && (
                <div>
                  <h4 className="text-sm font-medium mb-2">分析说明</h4>
                  <p className="text-sm text-muted-foreground">{aiSuggestions.reasoning}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Metadata */}
        <Card className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">应用场景</p>
              <p className="font-medium">
                {prompt.scenarioId ? getScenarioPath(prompt.scenarioId) : "未分类"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">综合评分</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">{prompt.score || 0}/100</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">使用次数</p>
              <span className="font-medium">{prompt.useCount || 0} 次</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">最近使用</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {prompt.lastUsedAt 
                    ? new Date(prompt.lastUsedAt).toLocaleDateString()
                    : "从未使用"}
                </span>
              </div>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">标签</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* 反馈摘要 */}
        {feedbackSummary && (
          <Card className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">使用反馈</div>
              <div className="text-sm text-muted-foreground">
                满意度 {feedbackSummary.avgSatisfaction?.toFixed(1) || 0} / 5 · 命中 {Math.round((feedbackSummary.hitRate || 0) * 100)}% · 可用 {Math.round((feedbackSummary.usableRate || 0) * 100)}%
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
              {feedbackSummary.recent?.map((fb: any) => (
                <div key={fb.id} className="border rounded-md p-3">
                  <div>满意度: {fb.satisfactionScore}/5 · 命中: {fb.hitExpectation ? "是" : "否"} · 可用: {fb.usable ? "是" : "否"}</div>
                  {fb.comment && <div className="mt-1 text-foreground">{fb.comment}</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(fb.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Content */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">提示词内容</h3>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {prompt.content}
            </ReactMarkdown>
          </div>
        </Card>

        {/* Version History */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="h-5 w-5" />
              版本历史
            </h3>
            <div className="flex gap-2">
              {compareMode && selectedVersions.length === 2 && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => {
                    setCompareMode(false);
                    setSelectedVersions([]);
                  }}
                >
                  退出对比
                </Button>
              )}
              {showVersions && !compareMode && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setCompareMode(true);
                    setSelectedVersions([]);
                  }}
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  对比版本
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => {
                setShowVersions(!showVersions);
                setCompareMode(false);
                setSelectedVersions([]);
              }}>
                {showVersions ? "隐藏" : "查看"}
              </Button>
            </div>
          </div>
          
          {showVersions && versions && (
            <div className="space-y-3">
              {compareMode ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    请选择两个版本进行对比 (已选择 {selectedVersions.length}/2)
                  </p>
                  <div className="space-y-2">
                    {versions.map((v: any) => (
                      <div
                        key={v.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedVersions.includes(v.version)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-foreground'
                        }`}
                        onClick={() => {
                          if (selectedVersions.includes(v.version)) {
                            setSelectedVersions(prev => prev.filter(ver => ver !== v.version));
                          } else if (selectedVersions.length < 2) {
                            setSelectedVersions(prev => [...prev, v.version]);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">版本 {v.version}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedVersions.length === 2 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-4">版本对比</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedVersions.sort((a, b) => b - a).map(versionNum => {
                          const version = versions.find((v: any) => v.version === versionNum);
                          if (!version) return null;
                          return (
                            <Card key={versionNum} className="p-4">
                              <div className="mb-3">
                                <h5 className="font-medium">版本 {versionNum}</h5>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(version.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="prose prose-sm max-w-none text-sm">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {version.content}
                                </ReactMarkdown>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((v: any) => (
                    <div
                      key={v.id}
                      className="border border-border rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">版本 {v.version}</span>
                          {v.version === prompt?.version && (
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                              当前
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString()}
                          </span>
                          {v.version !== prompt?.version && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRestoreVersion(v.version)}
                              title="恢复此版本"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {v.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Usage History */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              使用历史
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUsageHistory(!showUsageHistory)}>
              {showUsageHistory ? "隐藏" : "查看"}
            </Button>
          </div>
          
          {showUsageHistory && usageHistory && (
            <div className="space-y-3">
              {usageHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  还没有使用记录
                </p>
              ) : (
                <div className="space-y-2">
                  {usageHistory.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            用户 ID: {record.userId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.usedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
      
      {/* 分享对话框 */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分享提示词</DialogTitle>
            <DialogDescription>
              生成分享链接，设置访问权限
            </DialogDescription>
          </DialogHeader>
          
          {!shareToken ? (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">访问权限</Label>
                <RadioGroup value={sharePermission} onValueChange={(v) => setSharePermission(v as "view" | "edit")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="view" id="view" />
                    <Label htmlFor="view" className="cursor-pointer">仅查看</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="edit" id="edit" />
                    <Label htmlFor="edit" className="cursor-pointer">可编辑</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">分享链接</Label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/share/${shareToken}`}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-muted text-sm"
                  />
                  <Button variant="outline" onClick={handleCopyShareLink}>
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                权限: {sharePermission === "view" ? "仅查看" : "可编辑"}
              </p>
            </div>
          )}
          
          <DialogFooter>
            {!shareToken ? (
              <>
                <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateShare} disabled={createShareMutation.isPending}>
                  {createShareMutation.isPending ? "生成中..." : "生成链接"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowShareDialog(false)}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 反馈对话框 */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交使用反馈</DialogTitle>
            <DialogDescription>帮助我们改进提示词质量</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>满意度 (0-5)</Label>
              <Select
                value={String(satisfaction)}
                onValueChange={(v) => setSatisfaction(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择满意度" />
                </SelectTrigger>
                <SelectContent>
                  {[0,1,2,3,4,5].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>是否命中预期</Label>
              <RadioGroup value={hitExpectation ? "yes" : "no"} onValueChange={(v) => setHitExpectation(v === "yes")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="hit-yes" />
                  <Label htmlFor="hit-yes">是</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="hit-no" />
                  <Label htmlFor="hit-no">否</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>是否可用</Label>
              <RadioGroup value={usable ? "yes" : "no"} onValueChange={(v) => setUsable(v === "yes")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="usable-yes" />
                  <Label htmlFor="usable-yes">是</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="usable-no" />
                  <Label htmlFor="usable-no">否</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>文字反馈</Label>
              <Textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="可选，描述使用体验或问题"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>取消</Button>
            <Button onClick={handleSubmitFeedback} disabled={feedbackMutation.isPending}>
              {feedbackMutation.isPending ? "提交中..." : "提交"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
