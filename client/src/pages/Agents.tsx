import DashboardLayout from "@/components/DashboardLayout";
import { AgentDialog } from "@/components/AgentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Plus, Search, MessageSquare, Edit, Trash2, Tag, FolderTree, ExternalLink, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { parseTags } from "@/lib/utils";

export default function Agents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number | undefined>();
  const [, setLocation] = useLocation();
  
  const { data: agents, isLoading } = trpc.agents.list.useQuery();
  const utils = trpc.useUtils();
  
  const deleteMutation = trpc.agents.delete.useMutation({
    onSuccess: () => {
      toast.success("智能体已删除");
      utils.agents.list.invalidate();
    },
    onError: (error) => {
      toast.error("删除失败: " + error.message);
    },
  });

  const filteredAgents = agents?.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === "all" || agent.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const handleCreate = () => {
    setSelectedAgentId(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedAgentId(id);
    setDialogOpen(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`确定要删除智能体 "${name}" 吗?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleChat = (id: number) => {
    setLocation(`/agents/${id}/chat`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">智能体</h1>
            <p className="text-muted-foreground mt-1">配置和部署AI智能体</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新建智能体
          </Button>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索智能体..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              size="sm"
              variant={platformFilter === "all" ? "default" : "outline"}
              onClick={() => setPlatformFilter("all")}
            >
              全部
            </Button>
            <Button
              size="sm"
              variant={platformFilter === "gpts" ? "default" : "outline"}
              onClick={() => setPlatformFilter("gpts")}
            >
              GPTs
            </Button>
            <Button
              size="sm"
              variant={platformFilter === "coze" ? "default" : "outline"}
              onClick={() => setPlatformFilter("coze")}
            >
              Coze
            </Button>
            <Button
              size="sm"
              variant={platformFilter === "dify" ? "default" : "outline"}
              onClick={() => setPlatformFilter("dify")}
            >
              Dify
            </Button>
            <Button
              size="sm"
              variant={platformFilter === "custom" ? "default" : "outline"}
              onClick={() => setPlatformFilter("custom")}
            >
              自建
            </Button>
            <Button
              size="sm"
              variant={platformFilter === "other" ? "default" : "outline"}
              onClick={() => setPlatformFilter("other")}
            >
              其他
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : filteredAgents && filteredAgents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="border border-border rounded-lg p-4 hover:border-foreground transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium">{agent.name}</h3>
                    {agent.platform && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {agent.platform === "gpts" && "GPTs"}
                        {agent.platform === "coze" && "Coze"}
                        {agent.platform === "dify" && "Dify"}
                        {agent.platform === "custom" && "自建"}
                        {agent.platform === "other" && "其他"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(agent.id)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(agent.id, agent.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {agent.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {agent.description}
                  </p>
                )}
                <div className="text-xs font-mono text-muted-foreground line-clamp-2 mb-3 bg-muted p-2 rounded-lg">
                  {agent.systemPrompt}
                </div>
                {agent.tags && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {parseTags(agent.tags).slice(0, 3).map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {agent.model && <span className="mr-2">{agent.model}</span>}
                    {agent.temperature && <span>温度: {agent.temperature}</span>}
                  </div>
                  <div className="flex gap-2">
                    {agent.externalUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(agent.externalUrl!, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        访问
                      </Button>
                    )}
                    {agent.systemPrompt && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChat(agent.id)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        对话
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "未找到匹配的智能体" : "暂无智能体"}
            </p>
            <Button variant="outline" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个智能体
            </Button>
          </div>
        )}
      </div>

      <AgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agentId={selectedAgentId}
      />
    </DashboardLayout>
  );
}
