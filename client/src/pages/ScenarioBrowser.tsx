import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect, useRef } from "react";
import { LayoutGrid, List, Plus, Sparkles, ChevronRight, FolderTree, GripVertical, X } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from "sonner";
import { ScenarioCategoryDialog } from "@/components/ScenarioCategoryDialog";
import { SortableScenarioItem } from "@/components/SortableScenarioItem";
import { CategoryAssistantChat } from "@/components/CategoryAssistantChat";
import { ImportCategoryTemplate } from "@/components/ImportCategoryTemplate";
import { Link, useLocation, useSearch } from "wouter";

type ViewMode = "tree" | "card";

export default function ScenarioBrowser() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiGenerateDialogOpen, setAiGenerateDialogOpen] = useState(false);
  const [aiChatDialogOpen, setAiChatDialogOpen] = useState(false);
  const [aiConversationId, setAiConversationId] = useState<number | null>(null);
  const [aiIndustry, setAiIndustry] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedScenarioId, setHighlightedScenarioId] = useState<number | null>(null);
  const [navigationPath, setNavigationPath] = useState<Array<{ id: number; name: string; level: number }>>([]);

  const highlightRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const { data: scenarios, isLoading } = trpc.scenarios.list.useQuery();
  const { data: prompts } = trpc.prompts.list.useQuery();
  const { data: publicPrompts } = trpc.marketplace.listPublicPrompts.useQuery();

  // 根据导航路径获取当前要显示的分类列表
  const currentDisplayItems = useMemo(() => {
    if (!scenarios) return [];

    // 调试：打印所有分类的层级关系
    console.log('📊 数据库场景分类总览:', {
      total: scenarios.length,
      level1: scenarios.filter(s => s.level === 1).map(s => ({ id: s.id, name: s.name })),
      level2: scenarios.filter(s => s.level === 2).map(s => ({ id: s.id, name: s.name, parentId: s.parentId })),
      level3: scenarios.filter(s => s.level === 3).map(s => ({ id: s.id, name: s.name, parentId: s.parentId })),
    });

    console.log('计算 currentDisplayItems:', {
      scenariosCount: scenarios.length,
      navigationPathLength: navigationPath.length,
      navigationPath
    });

    // 如果没有导航路径，显示一级分类
    if (navigationPath.length === 0) {
      let items = scenarios.filter(s => s.level === 1);
      console.log('显示一级分类:', items.length);
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        items = items.filter(s =>
          s.name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
        );
      }
      return items;
    }

    // 如果有一级导航，显示该一级下的二级分类
    if (navigationPath.length === 1) {
      const parentId = navigationPath[0].id;
      let items = scenarios.filter(s => s.level === 2 && s.parentId === parentId);
      console.log('显示二级分类:', { parentId, count: items.length, items: items.map(i => ({ id: i.id, name: i.name })) });
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        items = items.filter(s =>
          s.name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
        );
      }
      return items;
    }

    // 如果有二级导航，显示该二级下的三级分类
    if (navigationPath.length === 2) {
      const parentId = navigationPath[1].id;
      let items = scenarios.filter(s => s.level === 3 && s.parentId === parentId);
      console.log('显示三级分类:', { parentId, count: items.length, items: items.map(i => ({ id: i.id, name: i.name, parentId: i.parentId })) });
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        items = items.filter(s =>
          s.name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
        );
      }
      return items;
    }

    return [];
  }, [scenarios, navigationPath, searchQuery]);

  // 为了兼容树形视图，保留原有的树形结构（仅用于树形视图）
  const scenarioTree = useMemo(() => {
    if (!scenarios) return [];

    const query = searchQuery.trim().toLowerCase();

    // 辅助函数：检查节点或其子节点是否匹配搜索
    const matchesSearch = (item: any): boolean => {
      if (!query) return true;
      return item.name.toLowerCase().includes(query) ||
             item.description?.toLowerCase().includes(query);
    };

    const level1Items = scenarios.filter(s => s.level === 1);

    return level1Items.map(l1 => {
      const level2Items = scenarios.filter(s => s.level === 2 && s.parentId === l1.id);

      const level2WithChildren = level2Items.map(l2 => {
        const level3Items = scenarios.filter(s => s.level === 3 && s.parentId === l2.id);

        // 过滤三级分类
        const filteredLevel3 = query
          ? level3Items.filter(matchesSearch)
          : level3Items;

        return {
          ...l2,
          children: filteredLevel3,
          _hasMatchingChildren: filteredLevel3.length > 0
        };
      });

      // 过滤二级分类：自身匹配 或 有匹配的子分类
      const filteredLevel2 = query
        ? level2WithChildren.filter(l2 =>
            matchesSearch(l2) || l2._hasMatchingChildren
          )
        : level2WithChildren;

      return {
        ...l1,
        children: filteredLevel2,
        _hasMatchingChildren: filteredLevel2.length > 0
      };
    }).filter(l1 => {
      // 过滤一级分类：自身匹配 或 有匹配的子分类
      if (!query) return true;
      return matchesSearch(l1) || l1._hasMatchingChildren;
    });
  }, [scenarios, searchQuery]);

  // 预计算每个分类下的提示词数量（包括所有子分类）- 优化性能，避免重复递归
  const promptCountMap = useMemo(() => {
    if (!prompts || !scenarios) return new Map<number, number>();

    const countMap = new Map<number, number>();

    // 递归函数：计算分类及其所有子分类的提示词总数
    const countRecursive = (scenarioId: number): number => {
      // 如果已经计算过，直接返回
      if (countMap.has(scenarioId)) {
        return countMap.get(scenarioId)!;
      }

      // 当前分类的直接提示词数量
      let count = prompts.filter(p => p.scenarioId === scenarioId).length;

      // 加上所有子分类的提示词数量
      const children = scenarios.filter(s => s.parentId === scenarioId);
      children.forEach(child => {
        count += countRecursive(child.id);
      });

      countMap.set(scenarioId, count);
      return count;
    };

    // 为所有分类计算数量（从叶子节点开始，自底向上）
    scenarios.forEach(s => {
      if (!countMap.has(s.id)) {
        countRecursive(s.id);
      }
    });

    return countMap;
  }, [prompts, scenarios]);

  // 获取提示词数量的辅助函数
  const getPromptCount = (scenarioId: number): number => {
    return promptCountMap.get(scenarioId) || 0;
  };

  // 获取某个场景的推荐模板（官方模板，最多3个）
  const getRecommendedTemplates = (scenarioId: number) => {
    if (!publicPrompts) return [];
    return publicPrompts
      .filter(p => p.scenarioId === scenarioId && p.isTemplate)
      .slice(0, 3);
  };

  // 检查level1场景是否包含高亮的场景
  const containsHighlightedScenario = (level1: any): boolean => {
    if (!highlightedScenarioId) return false;
    if (level1.id === highlightedScenarioId) return true;

    // 检查level2子场景
    if (level1.children) {
      for (const level2 of level1.children) {
        if (level2.id === highlightedScenarioId) return true;
        // 检查level3子场景
        if (level2.children) {
          for (const level3 of level2.children) {
            if (level3.id === highlightedScenarioId) return true;
          }
        }
      }
    }
    return false;
  };

  // 处理URL参数中的highlight,用于高亮显示特定场景
  useEffect(() => {
    const urlParams = new URLSearchParams(search ?? '');
    const highlightParam = urlParams.get('highlight');

    if (highlightParam) {
      const scenarioId = parseInt(highlightParam);
      if (!isNaN(scenarioId)) {
        setHighlightedScenarioId(scenarioId);
        // 延迟滚动以确保DOM已渲染
        setTimeout(() => {
          if (highlightRef.current) {
            highlightRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 300);
      }
    }
  }, [search]);

  const utils = trpc.useUtils();
  
  const createScenarioMutation = trpc.scenarios.create.useMutation({
    onSuccess: () => {
      utils.scenarios.list.invalidate();
    },
  });

  const generateByAIMutation = trpc.scenarios.generateByAI.useMutation();
  
  const createConversationMutation = trpc.categoryAssistant.createConversation.useMutation();
  
  const updateSortOrderMutation = trpc.scenarios.updateSortOrder.useMutation({
    onSuccess: () => {
      utils.scenarios.list.invalidate();
      toast.success("排序已更新");
    },
  });

  const initializePresetsMutation = trpc.scenarios.initializePresets.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.scenarios.list.invalidate();
    },
    onError: (error) => {
      toast.error("操作失败: " + error.message);
    },
  });
  
  const handleDragEnd = (event: DragEndEvent, level: number, parentId?: number) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const items = scenarios?.filter(s => 
      s.level === level && (parentId ? s.parentId === parentId : !s.parentId)
    ) || [];
    
    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const reorderedItems = arrayMove(items, oldIndex, newIndex);
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));
    
    updateSortOrderMutation.mutate({ updates });
  };

  const handleAiGenerate = async () => {
    if (!aiIndustry.trim()) {
      toast.error("请输入行业名称");
      return;
    }
    
    setAiGenerating(true);
    try {
      // 使用AI生成分类结构
      const categories = await generateByAIMutation.mutateAsync({ industry: aiIndustry });
      
      // 创建一级分类
      const level1Result = await createScenarioMutation.mutateAsync({
        name: categories.name,
        level: 1,
      });
      
      // 创建二级分类
      for (const l2 of categories.children || []) {
        const level2Result = await createScenarioMutation.mutateAsync({
          name: l2.name,
          level: 2,
          parentId: level1Result.id,
        });
        
        // 创建三级分类
        for (const l3 of l2.children || []) {
          await createScenarioMutation.mutateAsync({
            name: l3,
            level: 3,
            parentId: level2Result.id,
          });
        }
      }
      
      toast.success("分类生成成功！");
      setAiIndustry("");
      setAiGenerateDialogOpen(false);
    } catch (error: any) {
      toast.error("生成失败: " + error.message);
    } finally {
      setAiGenerating(false);
    }
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">应用场景分类</h1>
              <p className="text-muted-foreground mt-1">浏览和管理提示词应用场景分类体系</p>

              {/* 面包屑导航 */}
              {navigationPath.length > 0 && (
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNavigationPath([])}
                    className="h-7 px-2"
                  >
                    全部分类
                  </Button>
                  {navigationPath.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNavigationPath(prev => prev.slice(0, index + 1))}
                        className="h-7 px-2 font-medium"
                      >
                        {item.name}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          <div className="flex gap-2">
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "tree" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setViewMode("tree");
                  setNavigationPath([]); // 切换到树形视图时清空导航
                }}
                className="rounded-none"
              >
                <List className="h-4 w-4 mr-2" />
                树状视图
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="rounded-none"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                卡片视图
              </Button>
            </div>
            <Link href="/template-marketplace">
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                模板市场
              </Button>
            </Link>
            <ImportCategoryTemplate />
            <Button variant="outline" onClick={async () => {
              const result = await createConversationMutation.mutateAsync();
              setAiConversationId(result.id);
              setAiChatDialogOpen(true);
            }}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI对话分类
            </Button>
            <Button variant="outline" onClick={() => setAiGenerateDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              快速生成
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加分类
            </Button>
          </div>
          </div>
          
          {/* 搜索栏 */}
          <div className="flex gap-3 mt-4">
            <Input
              placeholder="搜索分类名称或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          
          {/* 分类统计 */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>总计: {scenarios?.length || 0} 个分类</span>
            <span>一级: {scenarios?.filter(s => s.level === 1).length || 0}</span>
            <span>二级: {scenarios?.filter(s => s.level === 2).length || 0}</span>
            <span>三级: {scenarios?.filter(s => s.level === 3).length || 0}</span>
          </div>
        </div>

        {/* Tree View */}
        {viewMode === "tree" && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, 1)}
          >
            <SortableContext
              items={scenarioTree.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {scenarioTree.map((level1) => {
                  const isHighlighted = containsHighlightedScenario(level1);
                  return (
                <SortableScenarioItem key={level1.id} id={level1.id}>
                  <Card
                    ref={isHighlighted ? highlightRef : null}
                    className={`p-6 transition-all duration-500 ${
                      isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''
                    }`}
                  >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FolderTree className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{level1.name}</h3>
                    <Badge variant="secondary">{getPromptCount(level1.id)} 个提示词</Badge>
                  </div>
                </div>
                {level1.description && (
                  <p className="text-sm text-muted-foreground mb-4">{level1.description}</p>
                )}
                
                {level1.children && level1.children.length > 0 && (
                  <div className="space-y-3 pl-6 border-l-2 border-border">
                    {level1.children.map((level2) => (
                      <div key={level2.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{level2.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getPromptCount(level2.id)} 个
                          </Badge>
                        </div>
                        
                        {level2.children && level2.children.length > 0 && (
                          <div className="flex flex-wrap gap-2 pl-6">
                            {level2.children.map((level3) => (
                              <Badge key={level3.id} variant="secondary" className="text-xs">
                                {level3.name} ({getPromptCount(level3.id)})
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                 )}                  </Card>
                </SortableScenarioItem>
                  );
                })}
            </div>
          </SortableContext>
        </DndContext>
        )}

        {/* Card View */}
        {viewMode === "card" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentDisplayItems.map((item) => {
              const isHighlighted = highlightedScenarioId === item.id;
              const currentLevel = navigationPath.length + 1;

              return (
              <Card
                key={item.id}
                ref={isHighlighted ? highlightRef : null}
                className={`p-6 hover:border-primary transition-all duration-500 flex flex-col cursor-pointer ${
                  isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
                onClick={() => {
                  console.log('点击分类:', {
                    itemId: item.id,
                    itemName: item.name,
                    itemLevel: item.level,
                    currentLevel,
                    navigationPath
                  });

                  // 根据当前显示的级别判断：三级分类才跳转
                  if (item.level === 3) {
                    console.log('跳转到提示词列表，URL:', `/prompts?scenario=${item.id}`);
                    // 使用 setLocation 实现 SPA 导航，保留查询参数
                    setLocation(`/prompts?scenario=${item.id}`);
                  } else {
                    // 一级或二级分类，进入下一级
                    console.log('进入下一级分类');
                    setNavigationPath(prev => [...prev, { id: item.id, name: item.name, level: item.level }]);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      {currentLevel < 3 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <Badge>{getPromptCount(item.id)} 个</Badge>
                </div>

                {currentLevel < 3 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    点击查看{currentLevel === 1 ? '学科/领域' : '具体分类'}
                  </div>
                )}
              </Card>
              );
            })}
          </div>
        )}

        {viewMode === "card" && currentDisplayItems.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground mb-2">
              {navigationPath.length > 0 ? '该分类下暂无子分类' : '暂无应用场景分类'}
            </p>
            {navigationPath.length > 0 && (
              <div className="space-y-4 mb-4">
                <p className="text-sm text-muted-foreground">
                  你可以添加自定义分类，或者返回上级查看其他分类
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-yellow-900 font-medium mb-2">🔧 数据修复</p>
                  <p className="text-sm text-yellow-800 mb-3">
                    如果预设分类的子分类丢失，可以重置预设数据来修复
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('确定要重置预设分类吗？这将删除所有系统预设分类并重新创建，用户自定义分类不受影响。')) {
                        initializePresetsMutation.mutate({ forceReset: true });
                      }
                    }}
                    disabled={initializePresetsMutation.isPending}
                    className="w-full"
                  >
                    {initializePresetsMutation.isPending ? "重置中..." : "🔄 重置预设分类"}
                  </Button>
                </div>
              </div>
            )}
            {navigationPath.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-xl mx-auto mb-4 mt-4">
                <p className="text-sm text-blue-900 font-medium mb-2">💡 首次使用提示</p>
                <p className="text-sm text-blue-800 mb-4">
                  系统检测到场景分类为空。点击下方按钮即可初始化教育教学、班级管理、教研工作等完整的三级分类体系。
                </p>
                <Button
                  onClick={() => initializePresetsMutation.mutate()}
                  disabled={initializePresetsMutation.isPending}
                  className="w-full"
                >
                  {initializePresetsMutation.isPending ? "初始化中..." : "✨ 一键初始化预设分类"}
                </Button>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              {navigationPath.length > 0 && (
                <Button variant="outline" onClick={() => setNavigationPath(prev => prev.slice(0, -1))}>
                  返回上级
                </Button>
              )}
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {navigationPath.length > 0 ? '添加子分类' : '创建第一个分类'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ScenarioCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* AI生成对话框 */}
      <Dialog open={aiGenerateDialogOpen} onOpenChange={setAiGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI生成场景分类</DialogTitle>
            <DialogDescription>
              输入场景名称，AI将自动生成三级分类结构
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">场景名称</label>
              <Input
                placeholder="例如：电商、教育、医疗等"
                value={aiIndustry}
                onChange={(e) => setAiIndustry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiGenerateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAiGenerate} disabled={aiGenerating}>
              {aiGenerating ? "生成中..." : "生成分类"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI对话分类对话框 - 侧边悬浮气泡 */}
      {aiChatDialogOpen && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={() => setAiChatDialogOpen(false)}
          />
          {/* 侧边滑出面板 */}
          <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-background border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">AI分类助手</h3>
                <p className="text-sm text-muted-foreground">与AI对话，确认分类结构后一键创建</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setAiChatDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              {aiConversationId && (
                <CategoryAssistantChat
                  conversationId={aiConversationId}
                  onComplete={() => {
                    setAiChatDialogOpen(false);
                    utils.scenarios.list.invalidate();
                    toast.success("分类已创建！");
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
