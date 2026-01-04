import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Plus, ChevronRight, Folder, FolderOpen, Edit2, Trash2, Eye } from "lucide-react";
import { ScenarioCategoryDialog } from "@/components/ScenarioCategoryDialog";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Categories() {
  const { data: scenarios, isLoading } = trpc.scenarios.list.useQuery();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const utils = trpc.useUtils();
  const deleteMutation = trpc.scenarios.delete.useMutation({
    onSuccess: () => {
      utils.scenarios.list.invalidate();
      toast.success("删除成功");
    },
    onError: (error: any) => {
      toast.error("删除失败: " + error.message);
    },
  });

  // 构建树形结构
  const categoryTree = useMemo(() => {
    if (!scenarios) return [];
    
    const level1 = scenarios.filter(s => s.level === 1);
    
    return level1.map(l1 => ({
      ...l1,
      children: scenarios
        .filter(s => s.level === 2 && s.parentId === l1.id)
        .map(l2 => ({
          ...l2,
          children: scenarios.filter(s => s.level === 3 && s.parentId === l2.id),
        })),
    }));
  }, [scenarios]);

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // 统计每个分类下的提示词数量（递归统计，包括所有子分类）
  const { data: prompts } = trpc.prompts.list.useQuery();
  const promptCountByScenario = useMemo(() => {
    if (!prompts || !scenarios) return {};
    const counts: Record<number, number> = {};

    // 递归函数：计算分类及其所有子分类的提示词总数
    const countRecursive = (scenarioId: number): number => {
      // 当前分类的直接提示词数量
      let count = prompts.filter(p => p.scenarioId === scenarioId).length;

      // 加上所有子分类的提示词数量
      const children = scenarios.filter(s => s.parentId === scenarioId);
      children.forEach(child => {
        count += countRecursive(child.id);
      });

      counts[scenarioId] = count;
      return count;
    };

    // 为所有分类计算数量
    scenarios.forEach(s => {
      if (!counts[s.id]) {
        countRecursive(s.id);
      }
    });

    return counts;
  }, [prompts, scenarios]);

  const renderCategory = (category: any, level: number = 1) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const count = promptCountByScenario[category.id] || 0;
    
    return (
      <div key={category.id}>
        <div
          className={`flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors group cursor-pointer ${
            level === 1 ? "bg-muted/30" : level === 2 ? "ml-6" : "ml-12"
          }`}
          onClick={() => hasChildren && toggleExpand(category.id)}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
            ) : (
              <div className="w-4" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="flex-1">
              <div className="font-medium text-sm">{category.name}</div>
              {category.description && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {category.description}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {count > 0 && (
              <span className="text-xs bg-muted px-2 py-1 rounded">
                {count} 个提示词
              </span>
            )}
            {category.isCustom && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                自定义
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/prompts?scenarioId=${category.id}`;
              }}
              title="查看提示词"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {category.isCustom && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory(category);
                    setDialogOpen(true);
                  }}
                  title="编辑"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`确认删除分类“${category.name}”？`)) {
                      deleteMutation.mutate({ id: category.id });
                    }
                  }}
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {category.children.map((child: any) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">应用场景分类</h1>
            <p className="text-muted-foreground mt-1">
              三级分类体系,帮助您更好地组织提示词
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加自定义分类
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : categoryTree.length > 0 ? (
          <div className="space-y-2">
            {categoryTree.map((category) => renderCategory(category))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            暂无分类数据
          </div>
        )}

        <div className="border border-dashed border-border rounded-lg p-6 mt-6">
          <h3 className="font-medium mb-2">分类说明</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>一级分类:营销推广、技术开发、内容创作、设计创意等主要领域</li>
            <li>二级分类:如营销推广下的社交媒体营销、广告文案、品牌策划等</li>
            <li>三级分类:如社交媒体营销下的小红书文案、朋友圈广告等具体场景</li>
            <li>点击分类可展开或折叠子分类,右侧显示该分类下的提示词数量</li>
            <li>系统预设分类覆盖常见场景,您也可以添加自定义分类</li>
          </ul>
        </div>
      </div>
      
      <ScenarioCategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}
