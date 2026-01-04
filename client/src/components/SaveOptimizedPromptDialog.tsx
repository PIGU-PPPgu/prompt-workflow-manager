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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Sparkles, FolderTree, Tag, Loader2, CheckCircle2, Info, RefreshCw, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SaveOptimizedPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  originalPrompt?: string;
}

export function SaveOptimizedPromptDialog({
  open,
  onOpenChange,
  content,
  originalPrompt
}: SaveOptimizedPromptDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scenarioId, setScenarioId] = useState<number | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isAutoClassifying, setIsAutoClassifying] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [showAiSuggestion, setShowAiSuggestion] = useState(true);
  const [classifyError, setClassifyError] = useState<string | null>(null);

  // 模板转换功能
  const [enableTemplate, setEnableTemplate] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);
  const [finalContent, setFinalContent] = useState(content);

  // 防止竞态条件
  const classifyRequestId = useRef(0);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const utils = trpc.useUtils();
  const { data: scenarios } = trpc.scenarios.list.useQuery();

  const suggestMutation = trpc.prompts.suggestCategoryAndTags.useMutation();

  const convertMutation = trpc.prompts.convertToTemplate.useMutation({
    onSuccess: (data) => {
      if (!openRef.current) return;
      setTemplateData(data);
      setIsConverting(false);
      if (data?.hasVariables) {
        setFinalContent(data.templateContent);
        toast.success("✨ 已转换为模板，可查看变量列表");
      } else {
        toast.info("提示词已经较通用，无需模板化");
        setEnableTemplate(false);
      }
    },
    onError: (error: any) => {
      if (!openRef.current) return;
      console.error("模板转换失败:", error);
      setIsConverting(false);
      toast.error("模板转换失败，请重试");
    },
  });

  const createMutation = trpc.prompts.create.useMutation({
    onSuccess: () => {
      toast.success("✨ 提示词已保存到库中");
      utils.prompts.list.invalidate(); // 刷新提示词列表缓存
      utils.scenarios.list.invalidate(); // 刷新场景列表（可能有新创建的分类）
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("保存失败: " + error.message);
    },
  });

  // 按层级组织场景
  const scenariosByLevel = useMemo(() => {
    if (!scenarios) return { level1: [], level2: [], level3: [] };
    return {
      level1: scenarios.filter(s => s.level === 1),
      level2: scenarios.filter(s => s.level === 2),
      level3: scenarios.filter(s => s.level === 3),
    };
  }, [scenarios]);

  // 根据选择显示对应的子场景
  const [selectedLevel1, setSelectedLevel1] = useState<number | undefined>();
  const [selectedLevel2, setSelectedLevel2] = useState<number | undefined>();

  const availableLevel2 = useMemo(() => {
    if (!selectedLevel1) return [];
    return scenariosByLevel.level2.filter(s => s.parentId === selectedLevel1);
  }, [selectedLevel1, scenariosByLevel.level2]);

  const availableLevel3 = useMemo(() => {
    if (!selectedLevel2) return [];
    return scenariosByLevel.level3.filter(s => s.parentId === selectedLevel2);
  }, [selectedLevel2, scenariosByLevel.level3]);

  // 触发 AI 自动分类
  const triggerAutoClassify = () => {
    if (!content) return;

    const requestId = ++classifyRequestId.current;
    const autoTitle = content.split('\n')[0].substring(0, 50) || "AI优化提示词";

    setIsAutoClassifying(true);
    setShowAiSuggestion(true);
    setClassifyError(null);

    suggestMutation.mutate(
      { content, title: autoTitle },
      {
        onSuccess: (data) => {
          // 检查对话框是否仍然打开且请求未过期
          if (!openRef.current || requestId !== classifyRequestId.current) return;

          setAiSuggestion(data);
          setIsAutoClassifying(false);
          if (data) {
            toast.success("🤖 AI 已为您推荐分类和标签");
          }
        },
        onError: (error: any) => {
          // 检查对话框是否仍然打开且请求未过期
          if (!openRef.current || requestId !== classifyRequestId.current) return;

          console.error("AI分类失败:", error);
          setIsAutoClassifying(false);
          setClassifyError(error.message || "分类失败");
          toast.error("自动分类失败，请手动选择");
        },
      }
    );
  };

  useEffect(() => {
    if (open && content) {
      // 自动生成标题
      const autoTitle = content.split('\n')[0].substring(0, 50) || "AI优化提示词";
      setTitle(autoTitle);
      setDescription(originalPrompt ? `基于原始提示词优化而来：${originalPrompt.substring(0, 100)}` : "AI优化生成");
      setFinalContent(content); // 初始化最终内容

      // 自动调用 AI 分类
      triggerAutoClassify();
    } else if (!open) {
      // 对话框关闭时重置表单状态
      resetForm();
    }
  }, [open, content, originalPrompt]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setScenarioId(undefined);
    setTags([]);
    setTagInput("");
    setSelectedLevel1(undefined);
    setSelectedLevel2(undefined);
    setAiSuggestion(null);
    setIsAutoClassifying(false);
    setShowAiSuggestion(true);
    setClassifyError(null);
    setEnableTemplate(false);
    setIsConverting(false);
    setTemplateData(null);
    setFinalContent(content);
  };

  // 处理模板转换开关
  const handleTemplateToggle = (checked: boolean) => {
    setEnableTemplate(checked);

    if (checked && !templateData) {
      // 开启模板化，调用 AI 转换
      setIsConverting(true);
      const autoTitle = content.split('\n')[0].substring(0, 50) || "AI优化提示词";
      convertMutation.mutate({
        content,
        title: autoTitle,
      });
    } else if (!checked) {
      // 关闭模板化，恢复原始内容
      setFinalContent(content);
      setTemplateData(null);
    } else if (checked && templateData) {
      // 重新应用已有的模板数据
      setFinalContent(templateData.templateContent);
    }
  };

  // 应用 AI 推荐
  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;

    let applied = false;

    // 设置推荐的场景分类（只有当有有效 scenarioId 时）
    if (aiSuggestion.scenarioId && scenarios) {
      const scenario = scenarios.find(s => s.id === aiSuggestion.scenarioId);
      if (scenario) {
        setScenarioId(scenario.id);

        // 查找父级分类以正确设置层级选择
        if (scenario.level === 3 && scenario.parentId) {
          const parent = scenarios.find(s => s.id === scenario.parentId);
          if (parent && parent.level === 2 && parent.parentId) {
            setSelectedLevel1(parent.parentId);
            setSelectedLevel2(parent.id);
          }
        } else if (scenario.level === 2 && scenario.parentId) {
          setSelectedLevel1(scenario.parentId);
          setSelectedLevel2(scenario.id);
        } else if (scenario.level === 1) {
          setSelectedLevel1(scenario.id);
        }
        applied = true;
      }
    }

    // 合并推荐的标签（保留用户已输入的标签）
    if (aiSuggestion.suggestedTags && Array.isArray(aiSuggestion.suggestedTags)) {
      const mergedTags = [...new Set([...tags, ...aiSuggestion.suggestedTags])];
      setTags(mergedTags);
      applied = true;
    }

    setShowAiSuggestion(false);

    if (applied) {
      if (aiSuggestion.scenarioId) {
        toast.success("✅ 已应用 AI 推荐的分类和标签");
      } else {
        toast.success("✅ 已应用 AI 推荐的标签，请手动选择分类");
      }
    } else {
      toast.info("没有可应用的推荐内容");
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("请输入标题");
      return;
    }

    try {
      // 准备保存的内容和变量
      const contentToSave = enableTemplate && templateData?.hasVariables ? finalContent : content;

      // 将对象格式的变量转换为数组格式，与 PromptDialog 保持一致
      let variablesToSave = undefined;
      if (enableTemplate && templateData?.hasVariables && templateData.variables) {
        variablesToSave = Object.entries(templateData.variables).map(([key, value]: [string, any]) => ({
          name: key,
          label: value.label,
          type: value.type,
          defaultValue: value.defaultValue,
          description: value.description,
          options: value.options || undefined,
        }));
      }

      await createMutation.mutateAsync({
        title: title.trim(),
        content: contentToSave,
        description: description.trim() || undefined,
        scenarioId,
        tags: tags.length > 0 ? JSON.stringify(tags) : undefined,
        variables: variablesToSave ? JSON.stringify(variablesToSave) : undefined,
      });
    } catch (error) {
      // onError 已处理 toast，这里捕获避免未处理的 Promise rejection
      console.error("保存提示词失败:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            保存优化后的提示词
          </DialogTitle>
          <DialogDescription>
            填写基本信息，将优化后的提示词保存到提示词库中
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* AI 推荐提示 */}
          {isAutoClassifying && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                🤖 AI 正在分析提示词内容，为您推荐最合适的分类和标签...
              </AlertDescription>
            </Alert>
          )}

          {!isAutoClassifying && aiSuggestion && showAiSuggestion && (
            <Alert className={aiSuggestion.scenarioId ? "border-blue-200 bg-blue-50/50" : "border-yellow-200 bg-yellow-50/50"}>
              <Info className={aiSuggestion.scenarioId ? "h-4 w-4 text-blue-600" : "h-4 w-4 text-yellow-600"} />
              <AlertDescription className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className={aiSuggestion.scenarioId ? "font-medium text-blue-900" : "font-medium text-yellow-900"}>
                    {aiSuggestion.scenarioId ? "🤖 AI 推荐" : "⚠️ AI 推荐（需手动确认）"}
                  </div>
                  <div className={aiSuggestion.scenarioId ? "text-sm text-blue-800 space-y-1" : "text-sm text-yellow-800 space-y-1"}>
                    <div>
                      <span className="font-medium">分类：</span>
                      {aiSuggestion.scenarioName || aiSuggestion.suggestedCategory || "未找到匹配分类"}
                      {!aiSuggestion.scenarioId && (
                        <span className="ml-2 text-xs text-yellow-600">（请手动选择分类）</span>
                      )}
                    </div>
                    {aiSuggestion.suggestedTags && aiSuggestion.suggestedTags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-medium">标签：</span>
                        {aiSuggestion.suggestedTags.map((tag: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {aiSuggestion.reason && (
                      <div className="text-xs text-blue-600 italic">
                        理由：{aiSuggestion.reason}
                      </div>
                    )}
                    {aiSuggestion.confidence && (
                      <div className="text-xs text-blue-600">
                        置信度：{(aiSuggestion.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyAiSuggestion}
                    className="whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    应用推荐
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAiSuggestion(false)}
                    className="whitespace-nowrap text-xs"
                  >
                    手动选择
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* AI 分类失败提示 */}
          {!isAutoClassifying && classifyError && (
            <Alert className="border-red-200 bg-red-50/50">
              <Info className="h-4 w-4 text-red-600" />
              <AlertDescription className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium text-red-900">
                    ⚠️ AI 自动分类失败
                  </div>
                  <div className="text-sm text-red-800 mt-1">
                    {classifyError}，请手动选择分类或点击重试
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={triggerAutoClassify}
                  disabled={isAutoClassifying}
                  className="whitespace-nowrap"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  重试
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">标题 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给提示词起个名字"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单描述这个提示词的用途（可选）"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              应用场景分类
            </Label>
            <div className="grid gap-2">
              {/* 一级分类 */}
              <Select value={selectedLevel1?.toString()} onValueChange={(v) => {
                setSelectedLevel1(parseInt(v));
                setSelectedLevel2(undefined);
                setScenarioId(parseInt(v));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="选择一级分类" />
                </SelectTrigger>
                <SelectContent>
                  {scenariosByLevel.level1.map((scenario) => (
                    <SelectItem key={scenario.id} value={scenario.id.toString()}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 二级分类 */}
              {selectedLevel1 && availableLevel2.length > 0 && (
                <Select value={selectedLevel2?.toString()} onValueChange={(v) => {
                  setSelectedLevel2(parseInt(v));
                  setScenarioId(parseInt(v));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择二级分类（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLevel2.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id.toString()}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* 三级分类 */}
              {selectedLevel2 && availableLevel3.length > 0 && (
                <Select value={scenarioId?.toString()} onValueChange={(v) => setScenarioId(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择三级分类（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLevel3.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id.toString()}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              选择合适的场景分类，方便日后查找和管理
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              标签
            </Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="添加标签"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                添加
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                      aria-label={`移除标签 ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 模板转换功能 */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-purple-500" />
                <Label htmlFor="template-mode" className="cursor-pointer">
                  转换为可复用模板
                </Label>
              </div>
              <Switch
                id="template-mode"
                checked={enableTemplate}
                onCheckedChange={handleTemplateToggle}
                disabled={isConverting}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              开启后，AI 会自动识别提示词中的具体内容（如学科、年级、主题等），将其转换为变量，提高复用性
            </p>

            {isConverting && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  🤖 AI 正在分析提示词，提取可复用的变量...
                </AlertDescription>
              </Alert>
            )}

            {enableTemplate && templateData?.hasVariables && (
              <Alert className="border-purple-200 bg-purple-50/50">
                <CheckCircle2 className="h-4 w-4 text-purple-600" />
                <AlertDescription>
                  <div className="text-sm text-purple-900 space-y-2">
                    <div className="font-medium">
                      ✨ 已识别 {Object.keys(templateData.variables).length} 个变量
                    </div>
                    <div className="space-y-1">
                      {Object.entries(templateData.variables).map(([key, variable]: [string, any]) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <code className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {`{{${key}}}`}
                          </code>
                          <span className="text-purple-700">
                            {variable.label} = {variable.defaultValue}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              {enableTemplate && templateData?.hasVariables ? "模板内容预览" : "提示词内容预览"}
            </Label>
            <div className="p-3 bg-muted rounded-md text-sm max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans">{finalContent}</pre>
            </div>
            {enableTemplate && templateData?.hasVariables && (
              <p className="text-xs text-muted-foreground">
                💡 保存后，使用时可以为每个变量填入不同的值
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "保存中..." : "保存到提示词库"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
