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
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PromptVariablesDialog, PromptVariable } from "./PromptVariablesDialog";
import { MarkdownEditor } from "./MarkdownEditor";
import { CascadeScenarioSelector } from "./CascadeScenarioSelector";
import { Settings, Sparkles, Wand2, Loader2, CheckCircle2 } from "lucide-react";

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId?: number;
  defaultScenarioId?: number;
}

export function PromptDialog({ open, onOpenChange, promptId, defaultScenarioId }: PromptDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [scenarioId, setScenarioId] = useState<number | undefined>();
  const [gradeLevel, setGradeLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [teachingScene, setTeachingScene] = useState("");
  const [textbookVersion, setTextbookVersion] = useState("");
  const [tags, setTags] = useState("");
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [showVariablesDialog, setShowVariablesDialog] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // 防止对话框关闭后更新状态
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const utils = trpc.useUtils();
  const optimizeMutation = trpc.prompts.optimize.useMutation();
  const suggestMutation = trpc.prompts.suggestCategoryAndTags.useMutation();
  const convertMutation = trpc.prompts.convertToTemplate.useMutation();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { data: prompt } = trpc.prompts.get.useQuery(
    { id: promptId! },
    { enabled: !!promptId }
  );
  const { data: scenarios } = trpc.scenarios.list.useQuery();

  const createMutation = trpc.prompts.create.useMutation({
    onSuccess: () => {
      toast.success("提示词创建成功");
      utils.prompts.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const handleOptimize = async () => {
    if (!content.trim()) {
      toast.error("请先输入提示词内容");
      return;
    }
    setIsOptimizing(true);
    try {
      const result = await optimizeMutation.mutateAsync({ content });
      setContent(result.optimized);
      toast.success("优化完成");
    } catch (error: any) {
      toast.error("优化失败: " + error.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAutoSuggest = async () => {
    if (!content.trim()) {
      toast.error("请先输入提示词内容");
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await suggestMutation.mutateAsync({ content, title });
      if (result) {
        // 使用后端返回的scenarioId（如果找不到匹配的会自动创建）
        if (result.scenarioId) {
          setScenarioId(result.scenarioId);
        }
        // 设置标签
        setTags(result.suggestedTags.join(", "));

        // 提示信息
        const wasCreated = result.scenarioName && !scenarios?.find(s => s.id === result.scenarioId);
        const message = wasCreated
          ? `AI分析完成！已自动创建新分类"${result.scenarioName}"\n置信度: ${(result.confidence * 100).toFixed(0)}%\n${result.reason}`
          : `AI分析完成！分类: ${result.scenarioName || result.suggestedCategory}\n置信度: ${(result.confidence * 100).toFixed(0)}%\n${result.reason}`;

        toast.success(message);

        // 如果创建了新分类，刷新分类列表
        if (wasCreated) {
          utils.scenarios.list.invalidate();
        }
      }
    } catch (error: any) {
      toast.error("分析失败: " + error.message);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleConvertToTemplate = async () => {
    if (!content.trim()) {
      toast.error("请先输入提示词内容");
      return;
    }
    setIsConverting(true);
    try {
      const result = await convertMutation.mutateAsync({ content, title });

      // 检查对话框是否仍然打开
      if (!openRef.current) return;

      if (result && result.hasVariables) {
        // 更新内容为模板内容
        setContent(result.templateContent);
        // 转换变量格式并合并
        const newVariables = Object.entries(result.variables).map(([key, value]: [string, any]) => ({
          name: key,
          label: value.label,
          type: value.type,
          defaultValue: value.defaultValue,
          description: value.description,
          options: value.options || undefined,
        }));
        setVariables(newVariables);
        toast.success(`✨ 已转换为模板，识别了 ${newVariables.length} 个变量`);
      } else {
        toast.info("提示词已经较通用，无需模板化");
      }
    } catch (error: any) {
      if (!openRef.current) return;
      toast.error("模板转换失败: " + error.message);
    } finally {
      if (openRef.current) {
        setIsConverting(false);
      }
    }
  };

  const updateMutation = trpc.prompts.update.useMutation({
    onSuccess: () => {
      toast.success("提示词更新成功");
      utils.prompts.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("更新失败: " + error.message);
    },
  });

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setContent(prompt.content);
      setDescription(prompt.description || "");
      setScenarioId(prompt.scenarioId || undefined);
      setGradeLevel(prompt.gradeLevel || "");
      setSubject(prompt.subject || "");
      setTeachingScene(prompt.teachingScene || "");
      setTextbookVersion(prompt.textbookVersion || "");
      setTags(prompt.tags || "");
      try {
        setVariables(prompt.variables ? JSON.parse(prompt.variables) : []);
      } catch {
        setVariables([]);
      }
    }
  }, [prompt]);

  // 当创建新提示词时,使用默认场景ID
  useEffect(() => {
    if (open && !promptId && defaultScenarioId) {
      setScenarioId(defaultScenarioId);
    }
  }, [open, promptId, defaultScenarioId]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setDescription("");
    setScenarioId(undefined);
    setGradeLevel("");
    setSubject("");
    setTeachingScene("");
    setTextbookVersion("");
    setTags("");
    setVariables([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast.error("标题和内容不能为空");
      return;
    }

    const data = {
      title: title.trim(),
      content: content.trim(),
      description: description.trim() || undefined,
      scenarioId: scenarioId || undefined,
      tags: tags.trim() || undefined,
      variables: variables.length > 0 ? JSON.stringify(variables) : undefined,
      gradeLevel: gradeLevel.trim() || undefined,
      subject: subject.trim() || undefined,
      teachingScene: teachingScene.trim() || undefined,
      textbookVersion: textbookVersion.trim() || undefined,
    };

    if (promptId) {
      updateMutation.mutate({ id: promptId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{promptId ? "编辑提示词" : "新建提示词"}</DialogTitle>
            <DialogDescription>
              {promptId ? "修改提示词的内容和配置" : "创建一个新的提示词模板"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入提示词标题"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简短描述此提示词的用途"
                />
              </div>
              
              <CascadeScenarioSelector
                value={scenarioId}
                onChange={setScenarioId}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>学段/年级</Label>
                  <Input
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="如：小学/初中/高中/大学"
                  />
                </div>
                <div className="space-y-2">
                  <Label>学科</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="如：语文/数学/英语"
                  />
                </div>
                <div className="space-y-2">
                  <Label>教学场景</Label>
                  <Input
                    value={teachingScene}
                    onChange={(e) => setTeachingScene(e.target.value)}
                    placeholder="备课/授课/作业/答疑/考试"
                  />
                </div>
                <div className="space-y-2">
                  <Label>教材版本</Label>
                  <Input
                    value={textbookVersion}
                    onChange={(e) => setTextbookVersion(e.target.value)}
                    placeholder="教材版本或出版社"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">内容</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOptimize}
                    disabled={isOptimizing || !content.trim()}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isOptimizing ? "优化中..." : "AI优化"}
                  </Button>
                </div>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="输入提示词内容... 支持 Markdown 格式，使用 {{变量名}} 定义变量"
                  minHeight="200px"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>变量配置</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleConvertToTemplate}
                      disabled={isConverting || !content.trim()}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      {isConverting ? "转换中..." : "转换为模板"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVariablesDialog(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      配置变量 ({variables.length})
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  在提示词中使用 {`{{变量名}}`} 语法,然后配置变量定义
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tags">标签</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoSuggest}
                    disabled={isSuggesting || !content.trim()}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isSuggesting ? "分析中..." : "AI自动分类"}
                  </Button>
                </div>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="用逗号分隔多个标签"
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
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "保存中..."
                  : promptId
                  ? "更新"
                  : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PromptVariablesDialog
        open={showVariablesDialog}
        onOpenChange={setShowVariablesDialog}
        variables={variables}
        onSave={setVariables}
      />
    </>
  );
}
