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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Link2, FileJson } from "lucide-react";

interface WorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId?: number;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: string;
}

export function WorkflowDialog({ open, onOpenChange, workflowId }: WorkflowDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [tags, setTags] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [platform, setPlatform] = useState<"dify" | "coze" | "n8n" | "custom">("custom");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalJson, setExternalJson] = useState("");

  const utils = trpc.useUtils();
  const { data: workflow } = trpc.workflows.get.useQuery(
    { id: workflowId! },
    { enabled: !!workflowId }
  );
  const { data: scenarios } = trpc.scenarios.list.useQuery();

  const createMutation = trpc.workflows.create.useMutation({
    onSuccess: () => {
      toast.success("工作流创建成功");
      utils.workflows.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const updateMutation = trpc.workflows.update.useMutation({
    onSuccess: () => {
      toast.success("工作流更新成功");
      utils.workflows.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("更新失败: " + error.message);
    },
  });

  useEffect(() => {
    if (workflow) {
      setTitle(workflow.title);
      setDescription(workflow.description || "");
      setTags(workflow.tags || "");
      setCategoryId(workflow.categoryId || undefined);
      setPlatform((workflow.platform as any) || "custom");
      setExternalUrl(workflow.externalUrl || "");
      setExternalJson(workflow.externalJson || "");
      try {
        const parsedSteps = JSON.parse(workflow.steps);
        setSteps(parsedSteps);
      } catch {
        setSteps([]);
      }
    }
  }, [workflow]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSteps([]);
    setTags("");
    setCategoryId(undefined);
    setPlatform("custom");
    setExternalUrl("");
    setExternalJson("");
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: Date.now().toString(),
        name: "",
        type: "prompt",
        config: "",
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, field: keyof WorkflowStep, value: string) => {
    setSteps(
      steps.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("标题不能为空");
      return;
    }

    // 如果是自定义工作流,需要步骤
    if (platform === "custom" && steps.length === 0) {
      toast.error("至少需要添加一个步骤");
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId: categoryId && categoryId !== 0 ? categoryId : undefined,
      steps: JSON.stringify(steps),
      tags: tags.trim() || undefined,
      platform,
      externalUrl: externalUrl.trim() || undefined,
      externalJson: externalJson.trim() || undefined,
    };

    if (workflowId) {
      updateMutation.mutate({ id: workflowId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workflowId ? "编辑工作流" : "新建工作流"}</DialogTitle>
          <DialogDescription>
            {workflowId ? "修改工作流的配置和步骤" : "创建一个新的自动化工作流"}
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
                placeholder="输入工作流标题"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简短描述此工作流的用途"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">应用场景</Label>
              <Select value={categoryId?.toString()} onValueChange={(v) => setCategoryId(v ? parseInt(v) : undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择应用场景" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">无</SelectItem>
                  {scenarios?.map((scenario) => (
                    <SelectItem key={scenario.id} value={scenario.id.toString()}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">标签</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="用逗号分隔多个标签"
              />
            </div>

            <div className="space-y-2">
              <Label>工作流来源</Label>
              <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">自定义工作流</SelectItem>
                  <SelectItem value="dify">Dify</SelectItem>
                  <SelectItem value="coze">Coze</SelectItem>
                  <SelectItem value="n8n">n8n</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {platform !== "custom" && (
              <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">
                    <Link2 className="h-4 w-4 mr-2" />
                    分享链接
                  </TabsTrigger>
                  <TabsTrigger value="json">
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON配置
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="space-y-2">
                  <Label htmlFor="externalUrl">{platform} 工作流链接</Label>
                  <Input
                    id="externalUrl"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="粘贴工作流分享链接..."
                  />
                  <p className="text-xs text-muted-foreground">
                    从 {platform} 复制工作流分享链接并粘贴到此处
                  </p>
                </TabsContent>
                <TabsContent value="json" className="space-y-2">
                  <Label htmlFor="externalJson">{platform} 工作流JSON</Label>
                  <Textarea
                    id="externalJson"
                    value={externalJson}
                    onChange={(e) => setExternalJson(e.target.value)}
                    placeholder="粘贴工作流JSON配置..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    从 {platform} 导出JSON配置并粘贴到此处
                  </p>
                </TabsContent>
              </Tabs>
            )}

            {platform === "custom" && (
              <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>工作流步骤</Label>
                <Button type="button" size="sm" variant="outline" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" />
                  添加步骤
                </Button>
              </div>
              {steps.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-sm">
                  <p className="text-sm text-muted-foreground mb-2">暂无步骤</p>
                  <Button type="button" size="sm" variant="outline" onClick={addStep}>
                    添加第一个步骤
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div key={step.id} className="border border-border rounded-sm p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">步骤 {index + 1}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeStep(step.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder="步骤名称"
                          value={step.name}
                          onChange={(e) =>
                            updateStep(step.id, "name", e.target.value)
                          }
                        />
                        <Input
                          placeholder="步骤类型 (如: prompt, api_call, transform)"
                          value={step.type}
                          onChange={(e) =>
                            updateStep(step.id, "type", e.target.value)
                          }
                        />
                        <Textarea
                          placeholder="配置 (JSON格式)"
                          value={step.config}
                          onChange={(e) =>
                            updateStep(step.id, "config", e.target.value)
                          }
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}
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
                : workflowId
                ? "更新"
                : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
