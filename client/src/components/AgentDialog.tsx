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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";

interface AgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId?: number;
}

export function AgentDialog({ open, onOpenChange, agentId }: AgentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("2000");
  const [tags, setTags] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedPromptIds, setSelectedPromptIds] = useState<number[]>([]);

  const utils = trpc.useUtils();
  const { data: agent } = trpc.agents.get.useQuery(
    { id: agentId! },
    { enabled: !!agentId }
  );
  const { data: prompts } = trpc.prompts.list.useQuery();
  const { data: scenarios } = trpc.scenarios.list.useQuery();

  const createMutation = trpc.agents.create.useMutation({
    onSuccess: () => {
      toast.success("智能体创建成功");
      utils.agents.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const updateMutation = trpc.agents.update.useMutation({
    onSuccess: () => {
      toast.success("智能体更新成功");
      utils.agents.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("更新失败: " + error.message);
    },
  });

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description || "");
      setExternalUrl(agent.externalUrl || "");
      setPlatform(agent.platform || "");
      setSystemPrompt(agent.systemPrompt || "");
      setModel(agent.model || "");
      setTemperature(agent.temperature || "0.7");
      setMaxTokens(agent.maxTokens?.toString() || "2000");
      setTags(agent.tags || "");
      setCategoryId(agent.categoryId || undefined);
      try {
        setSelectedPromptIds(agent.linkedPromptIds ? JSON.parse(agent.linkedPromptIds) : []);
      } catch {
        setSelectedPromptIds([]);
      }
    }
  }, [agent]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setExternalUrl("");
    setPlatform("");
    setSystemPrompt("");
    setModel("");
    setTemperature("0.7");
    setMaxTokens("2000");
    setSelectedPromptIds([]);
    setTags("");
    setCategoryId(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("名称不能为空");
      return;
    }

    if (!externalUrl.trim() && !systemPrompt.trim()) {
      toast.error("请至少填写外部链接或系统提示词");
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      externalUrl: externalUrl.trim() || undefined,
      platform: platform.trim() || undefined,
      categoryId: categoryId && categoryId !== 0 ? categoryId : undefined,
      systemPrompt: systemPrompt.trim() || undefined,
      model: model.trim() || undefined,
      temperature: temperature.trim(),
      maxTokens: parseInt(maxTokens) || 2000,
      tags: tags.trim() || undefined,
      linkedPromptIds: selectedPromptIds.length > 0 ? JSON.stringify(selectedPromptIds) : undefined,
    };

    if (agentId) {
      updateMutation.mutate({ id: agentId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agentId ? "编辑智能体" : "新建智能体"}</DialogTitle>
          <DialogDescription>
            {agentId ? "修改智能体的配置和参数" : "创建一个新的AI智能体"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入智能体名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简短描述此智能体的功能"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalUrl" className="flex items-center gap-2">
                外部链接
                <span className="text-xs text-muted-foreground font-normal">
                  (保存其他网站创建的智能体链接，如GPTs、Coze、Dify等)
                </span>
              </Label>
              <Input
                id="externalUrl"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://chat.openai.com/g/..."
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform">平台来源</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="选择平台来源" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpts">GPTs (OpenAI)</SelectItem>
                  <SelectItem value="coze">Coze (扁舟)</SelectItem>
                  <SelectItem value="dify">Dify</SelectItem>
                  <SelectItem value="custom">自建</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">
                系统提示词
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  (可选，用于内置对话功能)
                </span>
              </Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="定义智能体的角色和行为..."
                className="min-h-[150px] font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label>关联提示词</Label>
              <p className="text-xs text-muted-foreground mb-2">
                选择提示词库中的提示词作为智能体的系统提示,多个提示词将按顺序组合
              </p>
              <div className="border border-border rounded-sm p-3 space-y-2 max-h-48 overflow-y-auto">
                {prompts && prompts.length > 0 ? (
                  prompts.map((prompt) => (
                    <label
                      key={prompt.id}
                      className="flex items-start gap-2 cursor-pointer hover:bg-muted p-2 rounded-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPromptIds.includes(prompt.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPromptIds([...selectedPromptIds, prompt.id]);
                          } else {
                            setSelectedPromptIds(selectedPromptIds.filter(id => id !== prompt.id));
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          <span className="text-sm font-medium">{prompt.title}</span>
                        </div>
                        {prompt.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {prompt.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    暂无提示词,请先创建提示词
                  </p>
                )}
              </div>
              {selectedPromptIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  已选择 {selectedPromptIds.length} 个提示词
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">模型</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="如: gpt-4, claude-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">温度</Label>
                <Input
                  id="temperature"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="0.0 - 2.0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTokens">最大令牌数</Label>
              <Input
                id="maxTokens"
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder="2000"
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
                : agentId
                ? "更新"
                : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
