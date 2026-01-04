import DashboardLayout from "@/components/DashboardLayout";
import { WorkflowDialog } from "@/components/WorkflowDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Edit, Trash2, Play, ExternalLink, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { parseTags } from "@/lib/utils";

export default function Workflows() {
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | undefined>();
  
  const { data: workflows, isLoading } = trpc.workflows.list.useQuery();
  const utils = trpc.useUtils();
  
  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => {
      toast.success("工作流已删除");
      utils.workflows.list.invalidate();
    },
    onError: (error) => {
      toast.error("删除失败: " + error.message);
    },
  });

  const executeMutation = trpc.workflows.execute.useMutation({
    onSuccess: () => {
      toast.success("工作流执行成功");
    },
    onError: (error) => {
      toast.error("执行失败: " + error.message);
    },
  });

  const filteredWorkflows = workflows?.filter(workflow => {
    const matchesSearch = workflow.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === "all" || workflow.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const handleCreate = () => {
    setSelectedWorkflowId(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedWorkflowId(id);
    setDialogOpen(true);
  };

  const handleDelete = (id: number, title: string) => {
    if (confirm(`确定要删除工作流 "${title}" 吗?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleExecute = (id: number) => {
    const input = prompt("请输入工作流输入 (可选):");
    executeMutation.mutate({ workflowId: id, input: input || undefined });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">工作流</h1>
            <p className="text-muted-foreground mt-1">创建和管理自动化工作流程</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新建工作流
          </Button>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索工作流..."
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
        ) : filteredWorkflows && filteredWorkflows.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkflows.map((workflow) => {
              let stepCount = 0;
              try {
                const steps = JSON.parse(workflow.steps);
                stepCount = steps.length;
              } catch {}

              return (
                <div
                  key={workflow.id}
                  className="border border-border rounded-lg p-4 hover:border-foreground transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium">{workflow.title}</h3>
                      <div className="flex gap-1 mt-1">
                        {workflow.isTemplate && (
                          <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-lg inline-block">
                            模板
                          </span>
                        )}
                        {workflow.platform && (
                          <Badge variant="secondary" className="text-xs">
                            {workflow.platform === "gpts" && "GPTs"}
                            {workflow.platform === "coze" && "Coze"}
                            {workflow.platform === "dify" && "Dify"}
                            {workflow.platform === "custom" && "自建"}
                            {workflow.platform === "other" && "其他"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(workflow.id)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(workflow.id, workflow.title)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {workflow.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {workflow.description}
                    </p>
                  )}
                  {workflow.tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {parseTags(workflow.tags).slice(0, 3).map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <span>{stepCount} 个步骤</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(workflow.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2">
                      {workflow.externalUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(workflow.externalUrl!, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          访问
                        </Button>
                      )}
                      {workflow.steps && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExecute(workflow.id)}
                          disabled={executeMutation.isPending}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          运行
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "未找到匹配的工作流" : "暂无工作流"}
            </p>
            <Button variant="outline" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个工作流
            </Button>
          </div>
        )}
      </div>

      <WorkflowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workflowId={selectedWorkflowId}
      />
    </DashboardLayout>
  );
}
