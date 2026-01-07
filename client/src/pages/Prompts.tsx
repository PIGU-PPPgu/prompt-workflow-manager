import DashboardLayout from "@/components/DashboardLayout";
import { PromptDialog } from "@/components/PromptDialog";
import { OptimizePromptDialog } from "@/components/OptimizePromptDialog";
import { UsePromptDialog } from "@/components/UsePromptDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Edit, Trash2, Copy, Sparkles, BarChart3, Play, Filter, Eye, Star, Tag, CheckSquare, Square, Download, AlertCircle, FolderTree, Info } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Prompts() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory1, setSelectedCategory1] = useState<string>("all");
  const [selectedCategory2, setSelectedCategory2] = useState<string>("all");
  const [selectedCategory3, setSelectedCategory3] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<number | undefined>();
  const [defaultScenarioId, setDefaultScenarioId] = useState<number | undefined>();
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
  const [optimizeContent, setOptimizeContent] = useState("");
  const [optimizePromptId, setOptimizePromptId] = useState<number | undefined>();
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [usePromptContent, setUsePromptContent] = useState("");
  const [usePromptVariables, setUsePromptVariables] = useState<any[]>([]);
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [filterMark, setFilterMark] = useState<string>("all");
  const [metaFilters, setMetaFilters] = useState({
    gradeLevel: "",
    subject: "",
    teachingScene: "",
    textbookVersion: "",
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [scoreDetailOpen, setScoreDetailOpen] = useState(false);
  const [selectedScoreDetail, setSelectedScoreDetail] = useState<any>(null);

  const { user } = useAuth();
  const { data: prompts, isLoading } = trpc.prompts.list.useQuery({
    gradeLevel: metaFilters.gradeLevel || undefined,
    subject: metaFilters.subject || undefined,
    teachingScene: metaFilters.teachingScene || undefined,
    textbookVersion: metaFilters.textbookVersion || undefined,
  });
  const { data: subscriptionInfo } = trpc.subscription.info.useQuery();
  const { data: promptLimitInfo } = trpc.subscription.checkLimit.useQuery(
    { feature: 'maxPrompts' },
    { enabled: !!subscriptionInfo }
  );
  const { data: scenarios } = trpc.scenarios.list.useQuery();
  const utils = trpc.useUtils();

  // 处理URL参数中的scenario,用于创建提示词时自动设置场景，并自动筛选
  useEffect(() => {
    const urlParams = new URLSearchParams(search ?? "");
    const scenarioParam = urlParams.get('scenario');

    console.log('📍 Prompts 页面 URL 参数:', { scenarioParam, search });

    // 如果没有 scenario 参数，重置筛选状态
    if (!scenarioParam) {
      setSelectedCategory1("all");
      setSelectedCategory2("all");
      setSelectedCategory3("all");
      setDefaultScenarioId(undefined);
      console.log('🔄 无 scenario 参数，重置筛选');
      return;
    }

    if (scenarios) {
      const scenarioId = parseInt(scenarioParam);
      if (isNaN(scenarioId)) {
        // 参数无效，重置状态
        setSelectedCategory1("all");
        setSelectedCategory2("all");
        setSelectedCategory3("all");
        setDefaultScenarioId(undefined);
        console.log('❌ scenario 参数无效:', scenarioParam);
        return;
      }

      // 找到该场景并设置筛选状态
      const scenario = scenarios.find(s => s.id === scenarioId);
      console.log('🔍 查找场景:', { scenarioId, found: !!scenario, scenario });

      if (!scenario) {
        // 场景不存在，重置状态并提示
        setSelectedCategory1("all");
        setSelectedCategory2("all");
        setSelectedCategory3("all");
        setDefaultScenarioId(undefined);
        toast.error("找不到指定的场景分类");
        return;
      }

      // 场景有效，设置默认值和筛选
      setDefaultScenarioId(scenarioId);

      if (scenario.level === 1) {
        // 一级分类
        console.log('✅ 设置一级分类筛选:', scenario.id);
        setSelectedCategory1(scenario.id.toString());
        setSelectedCategory2("all");
        setSelectedCategory3("all");
      } else if (scenario.level === 2) {
        // 二级分类：需要找到父级（一级）
        if (!scenario.parentId) {
          toast.error("场景分类数据不完整");
          return;
        }
        console.log('✅ 设置二级分类筛选:', { level1: scenario.parentId, level2: scenario.id });
        setSelectedCategory1(scenario.parentId.toString());
        setSelectedCategory2(scenario.id.toString());
        setSelectedCategory3("all");
      } else if (scenario.level === 3) {
        // 三级分类：需要找到父级（二级）和祖父级（一级）
        const parent2 = scenarios.find(s => s.id === scenario.parentId);
        console.log('🔍 查找父级:', { parent2Id: scenario.parentId, found: !!parent2, parent2 });

        if (!parent2 || !parent2.parentId) {
          toast.error("场景分类数据不完整");
          console.log('❌ 三级分类数据不完整:', { parent2, hasParentId: parent2?.parentId });
          return;
        }
        console.log('✅ 设置三级分类筛选:', {
          level1: parent2.parentId,
          level2: parent2.id,
          level3: scenario.id
        });
        setSelectedCategory1(parent2.parentId.toString());
        setSelectedCategory2(parent2.id.toString());
        setSelectedCategory3(scenario.id.toString());
      }
    }
  }, [search, scenarios]);

  // 构建分类层级结构
  const level1Scenarios = useMemo(() => {
    return scenarios?.filter(s => s.level === 1) || [];
  }, [scenarios]);

  const level2Scenarios = useMemo(() => {
    if (selectedCategory1 === "all") return [];
    const parentId = parseInt(selectedCategory1);
    return scenarios?.filter(s => s.level === 2 && s.parentId === parentId) || [];
  }, [scenarios, selectedCategory1]);

  const level3Scenarios = useMemo(() => {
    if (selectedCategory2 === "all") return [];
    const parentId = parseInt(selectedCategory2);
    return scenarios?.filter(s => s.level === 3 && s.parentId === parentId) || [];
  }, [scenarios, selectedCategory2]);
  
  const deleteMutation = trpc.prompts.delete.useMutation({
    onSuccess: () => {
      toast.success("提示词已删除");
      utils.prompts.list.invalidate();
    },
    onError: (error) => {
      toast.error("删除失败: " + error.message);
    },
  });

  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];

    console.log('🔍 筛选提示词:', {
      totalPrompts: prompts.length,
      selectedCategory1,
      selectedCategory2,
      selectedCategory3,
      searchQuery,
      filterFavorite,
      filterMark,
      metaFilters
    });

    const filtered = prompts.filter(prompt => {
      // 搜索过滤
      const matchesSearch = !searchQuery ||
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.description?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 收藏过滤
      if (filterFavorite && !prompt.isFavorite) return false;

      // 标记过滤
      if (filterMark !== "all" && prompt.customMark !== filterMark) return false;

      // 教育元数据过滤
      const matchesMeta = (key: keyof typeof metaFilters) => {
        const filterVal = metaFilters[key];
        // 若过滤值为空或未填写，视为通过
        if (!filterVal) return true;
        const promptVal = (prompt as any)[key];
        if (!promptVal) return false;
        return promptVal === filterVal;
      };
      if (!matchesMeta("gradeLevel")) return false;
      if (!matchesMeta("subject")) return false;
      if (!matchesMeta("teachingScene")) return false;
      if (!matchesMeta("textbookVersion")) return false;

      // 分类过滤
      if (!prompt.scenarioId) {
        const result = selectedCategory1 === "all";
        console.log('  提示词无分类:', { promptId: prompt.id, title: prompt.title, result });
        return result;
      }

      const scenario = scenarios?.find(s => s.id === prompt.scenarioId);
      if (!scenario) {
        const result = selectedCategory1 === "all";
        console.log('  提示词分类不存在:', { promptId: prompt.id, scenarioId: prompt.scenarioId, result });
        return result;
      }

      // 根据分类层级进行匹配
      if (scenario.level === 1) {
        const result = selectedCategory1 === "all" || scenario.id.toString() === selectedCategory1;
        console.log('  一级分类匹配:', {
          promptId: prompt.id,
          title: prompt.title,
          scenarioId: scenario.id,
          selectedCategory1,
          result
        });
        return result;
      } else if (scenario.level === 2) {
        const matchesLevel2 = selectedCategory2 === "all" || scenario.id.toString() === selectedCategory2;
        const matchesLevel1 = selectedCategory1 === "all" || scenario.parentId?.toString() === selectedCategory1;
        const result = matchesLevel1 && matchesLevel2;
        console.log('  二级分类匹配:', {
          promptId: prompt.id,
          title: prompt.title,
          scenarioId: scenario.id,
          parentId: scenario.parentId,
          selectedCategory1,
          selectedCategory2,
          matchesLevel1,
          matchesLevel2,
          result
        });
        return result;
      } else if (scenario.level === 3) {
        const matchesLevel3 = selectedCategory3 === "all" || scenario.id.toString() === selectedCategory3;
        const parent2 = scenarios?.find(s => s.id === scenario.parentId);
        const matchesLevel2 = selectedCategory2 === "all" || parent2?.id.toString() === selectedCategory2;
        const matchesLevel1 = selectedCategory1 === "all" || parent2?.parentId?.toString() === selectedCategory1;
        const result = matchesLevel1 && matchesLevel2 && matchesLevel3;
        console.log('  三级分类匹配:', {
          promptId: prompt.id,
          title: prompt.title,
          scenarioId: scenario.id,
          scenarioParentId: scenario.parentId,
          parent2Id: parent2?.id,
          parent2ParentId: parent2?.parentId,
          selectedCategory1,
          selectedCategory2,
          selectedCategory3,
          matchesLevel1,
          matchesLevel2,
          matchesLevel3,
          result
        });
        return result;
      }

      return false;
    });

    console.log('✅ 筛选完成:', { filteredCount: filtered.length, prompts: filtered.map(p => ({ id: p.id, title: p.title, scenarioId: p.scenarioId })) });
    return filtered;
  }, [prompts, scenarios, searchQuery, selectedCategory1, selectedCategory2, selectedCategory3, filterFavorite, filterMark, metaFilters]);

  const handleCreate = () => {
    setSelectedPromptId(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedPromptId(id);
    setDialogOpen(true);
  };

  const handleDelete = (id: number, title: string) => {
    if (confirm(`确定要删除提示词 "${title}" 吗?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("✅ 已复制");
    } catch (error) {
      toast.error("复制失败");
    }
  };

  const handleOptimize = (id: number, content: string) => {
    setOptimizePromptId(id);
    setOptimizeContent(content);
    setOptimizeDialogOpen(true);
  };

  const handleOptimized = async (optimizedContent: string) => {
    if (optimizePromptId) {
      await updateMutation.mutateAsync({
        id: optimizePromptId,
        content: optimizedContent,
      });
      toast.success("已应用优化结果");
    }
  };

  const scoreMutation = trpc.prompts.score.useMutation({
    onSuccess: (data) => {
      toast.success(`评分完成: ${data.totalScore}分`);
      utils.prompts.list.invalidate();
    },
    onError: (error) => {
      toast.error("评分失败: " + error.message);
    },
  });

  const updateMutation = trpc.prompts.update.useMutation({
    onSuccess: () => {
      utils.prompts.list.invalidate();
    },
  });

  const handleScore = (id: number) => {
    toast.info("AI评分中，预计需要1-3秒...");
    scoreMutation.mutate({ id });
  };

  const handleShowScoreDetail = (prompt: any) => {
    setSelectedScoreDetail(prompt);
    setScoreDetailOpen(true);
  };

  const handleUse = (prompt: any) => {
    setUsePromptContent(prompt.content);
    try {
      setUsePromptVariables(prompt.variables ? JSON.parse(prompt.variables) : []);
    } catch {
      setUsePromptVariables([]);
    }
    setUseDialogOpen(true);
  };

  const toggleFavoriteMutation = trpc.prompts.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.prompts.list.invalidate();
    },
  });

  const setMarkMutation = trpc.prompts.setCustomMark.useMutation({
    onSuccess: () => {
      utils.prompts.list.invalidate();
    },
  });
  const batchActionMutation = trpc.prompts.batchUpdate.useMutation({
    onSuccess: () => {
      toast.success("批量操作成功！");
      utils.prompts.list.invalidate();
      setSelectedIds([]);
      setBatchMode(false);
    },
    onError: (error) => {
      toast.error("批量操作失败: " + error.message);
    },
  });
  
  const exportMarkdownMutation = trpc.prompts.exportAsMarkdown.useMutation();
  const exportJSONMutation = trpc.prompts.exportAsJSON.useMutation();
  const exportCSVMutation = trpc.prompts.exportAsCSV.useMutation();
  
  const handleExport = async (format: string) => {
    if (selectedIds.length === 0) {
      toast.error("请选择至少一个提示词");
      return;
    }
    
    try {
      let result;
      let filename;
      let mimeType;
      
      if (format === "markdown") {
        result = await exportMarkdownMutation.mutateAsync({ ids: selectedIds });
        filename = `prompts_${new Date().toISOString().split('T')[0]}.md`;
        mimeType = "text/markdown";
      } else if (format === "json") {
        result = await exportJSONMutation.mutateAsync({ ids: selectedIds });
        filename = `prompts_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = "application/json";
      } else if (format === "csv") {
        result = await exportCSVMutation.mutateAsync({ ids: selectedIds });
        filename = `prompts_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = "text/csv";
      } else {
        return;
      }
      
      // 创建下载链接
      const blob = new Blob([result.content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("导出成功！");
    } catch (error: any) {
      toast.error("导出失败: " + error.message);
    }
  };

  const handleSetMark = (id: number, mark: string) => {
    setMarkMutation.mutate({ id, mark: mark as any });
  };
  
  const handleToggleFavorite = (id: number) => {
    toggleFavoriteMutation.mutate({ id });
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

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

  // 跳转到场景导航
  const navigateToScenario = (scenarioId: number) => {
    setLocation(`/scenarios?highlight=${scenarioId}`);
  };

  const handleBatchAction = (action: string, options: any) => {
    if (selectedIds.length === 0) {
      toast.error("请选择至少一个提示词");
      return;
    }
    batchActionMutation.mutate({
      ids: selectedIds,
      action: action as any,
      ...options,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">提示词库</h1>
            <p className="text-muted-foreground mt-1">管理和组织您的提示词模板</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={batchMode ? "default" : "outline"}
              onClick={() => {
                setBatchMode(!batchMode);
                setSelectedIds([]);
              }}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {batchMode ? "退出批量" : "批量操作"}
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              新建提示词
            </Button>
          </div>
        </div>

        {/* 订阅限制提示 (管理员不显示) */}
        {user?.role !== 'admin' && promptLimitInfo && !promptLimitInfo.allowed && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                已达到提示词数量限制
              </p>
              <p className="text-sm text-amber-700 mt-1">
                您已创建 {promptLimitInfo.current}/{promptLimitInfo.limit} 个提示词，请升级订阅以解锁更多存储空间。
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setLocation('/subscription')}
              className="shrink-0"
            >
              升级订阅
            </Button>
          </div>
        )}

        {/* 智能推荐卡片 */}
        <QuickAccessSection />

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索提示词..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterFavorite ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterFavorite(!filterFavorite)}
            >
              <Star className={`h-4 w-4 mr-1 ${filterFavorite ? 'fill-current' : ''}`} />
              收藏
            </Button>
            <Select value={filterMark} onValueChange={setFilterMark}>
              <SelectTrigger className="w-[120px]">
                <Tag className="h-4 w-4 mr-2" />
                <SelectValue placeholder="标记" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部标记</SelectItem>
                <SelectItem value="常用">常用</SelectItem>
                <SelectItem value="待优化">待优化</SelectItem>
                <SelectItem value="已验证">已验证</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory1} onValueChange={(v) => { setSelectedCategory1(v); setSelectedCategory2("all"); setSelectedCategory3("all"); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="一级分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {level1Scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory1 !== "all" && level2Scenarios.length > 0 && (
              <Select value={selectedCategory2} onValueChange={(v) => { setSelectedCategory2(v); setSelectedCategory3("all"); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="二级分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {level2Scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedCategory2 !== "all" && level3Scenarios.length > 0 && (
              <Select value={selectedCategory3} onValueChange={setSelectedCategory3}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="三级分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {level3Scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* 教育元数据筛选 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <Input
            placeholder="学段/年级"
            value={metaFilters.gradeLevel}
            onChange={(e) => setMetaFilters(prev => ({ ...prev, gradeLevel: e.target.value }))}
          />
          <Input
            placeholder="学科"
            value={metaFilters.subject}
            onChange={(e) => setMetaFilters(prev => ({ ...prev, subject: e.target.value }))}
          />
          <Input
            placeholder="教学场景(备课/授课/作业/答疑/考试)"
            value={metaFilters.teachingScene}
            onChange={(e) => setMetaFilters(prev => ({ ...prev, teachingScene: e.target.value }))}
          />
          <Input
            placeholder="教材版本"
            value={metaFilters.textbookVersion}
            onChange={(e) => setMetaFilters(prev => ({ ...prev, textbookVersion: e.target.value }))}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : filteredPrompts && filteredPrompts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`border rounded-lg p-4 hover:border-foreground transition-colors group ${
                  selectedIds.includes(prompt.id) ? 'border-foreground bg-muted' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    {batchMode && (
                      <button
                        onClick={() => toggleSelection(prompt.id)}
                        className="flex-shrink-0"
                      >
                        {selectedIds.includes(prompt.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <h3 className="font-medium">{prompt.title}</h3>
                    {prompt.isFavorite && (
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                    )}
                    {prompt.customMark && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border">
                        {prompt.customMark}
                      </span>
                    )}
                  </div>
                  {!batchMode && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleFavorite(prompt.id)}
                        title="收藏"
                      >
                        <Star className={`h-3 w-3 ${prompt.isFavorite ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(prompt.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(prompt.id)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(prompt.id, prompt.title)}
                        title="删除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* 场景路径标签 - 可点击跳转 */}
                {prompt.scenarioId && (
                  <div className="mb-2">
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                      onClick={() => navigateToScenario(prompt.scenarioId!)}
                    >
                      <FolderTree className="h-3 w-3 mr-1" />
                      {getScenarioPath(prompt.scenarioId)}
                    </Badge>
                  </div>
                )}

                {prompt.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {prompt.description}
                  </p>
                )}
                <div className="text-xs font-mono text-muted-foreground line-clamp-3 mb-3 bg-muted p-2 rounded-lg">
                  {prompt.content}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/prompts/${prompt.id}`)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    详情
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUse(prompt)}
                    className="flex-1"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    使用
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOptimize(prompt.id, prompt.content)}
                    className="flex-1"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    优化
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleScore(prompt.id)}
                    disabled={scoreMutation.isPending}
                    className="flex-1"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    {scoreMutation.isPending ? "评分中..." : "评分"}
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>版本 {prompt.version}</span>
                    {prompt.useCount !== null && prompt.useCount > 0 && (
                      <span>使用 {prompt.useCount} 次</span>
                    )}
                    {prompt.lastUsedAt && (
                      <span>最近使用: {new Date(prompt.lastUsedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {prompt.score !== null && prompt.score !== undefined && prompt.score > 0 ? (
                    <button
                      onClick={() => handleShowScoreDetail(prompt)}
                      className="flex items-center gap-1 font-medium hover:text-primary transition-colors cursor-pointer"
                      title="点击查看评分详情"
                    >
                      <BarChart3 className="h-3 w-3" />
                      评分: {prompt.score}
                      <Info className="h-3 w-3 opacity-50" />
                    </button>
                  ) : (
                    <span>{new Date(prompt.updatedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "未找到匹配的提示词" : "暂无提示词"}
            </p>
            <Button variant="outline" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个提示词
            </Button>
          </div>
        )}

        {batchMode && selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-4 flex items-center gap-3">
            <span className="text-sm font-medium">已选择 {selectedIds.length} 个提示词</span>
            <div className="h-4 w-px bg-border" />
            <Select onValueChange={(mark) => {
              selectedIds.forEach(id => handleSetMark(id, mark));
            }}>
              <SelectTrigger className="w-[140px] h-8">
                <Tag className="h-3 w-3 mr-2" />
                <SelectValue placeholder="设置标记" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="常用">常用</SelectItem>
                <SelectItem value="待优化">待优化</SelectItem>
                <SelectItem value="已验证">已验证</SelectItem>
                <SelectItem value="">清除标记</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const input = prompt("输入要添加的标签（多个标签用逗号分隔）");
                if (input) {
                  const tags = input.split(',').map(t => t.trim()).filter(Boolean);
                  handleBatchAction('addTags', { tags });
                }
              }}
            >
              添加标签
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm(`确定要批量优化 ${selectedIds.length} 个提示词吗？`)) {
                  handleBatchAction('optimize', {});
                }
              }}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              批量优化
            </Button>
            <div className="h-4 w-px bg-border" />
            <Select onValueChange={(format) => handleExport(format)}>
              <SelectTrigger className="w-[120px] h-8">
                <Download className="h-3 w-3 mr-2" />
                <SelectValue placeholder="导出" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <PromptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        promptId={selectedPromptId}
        defaultScenarioId={defaultScenarioId}
      />
      
      <OptimizePromptDialog
        open={optimizeDialogOpen}
        onOpenChange={setOptimizeDialogOpen}
        content={optimizeContent}
        onOptimized={handleOptimized}
      />
      
      <UsePromptDialog
        open={useDialogOpen}
        onOpenChange={setUseDialogOpen}
        promptContent={usePromptContent}
        variables={usePromptVariables}
      />

      {/* 评分详情Dialog */}
      <Dialog open={scoreDetailOpen} onOpenChange={setScoreDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>评分详情</DialogTitle>
            <DialogDescription>
              {selectedScoreDetail?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedScoreDetail && (
            <div className="space-y-4">
              <div className="text-center py-4 border-b">
                <div className="text-4xl font-bold text-primary">
                  {selectedScoreDetail.score || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">综合评分</div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-semibold text-blue-600">
                    {selectedScoreDetail.structureScore || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">结构完整性</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-green-600">
                    {selectedScoreDetail.clarityScore || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">清晰度</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-purple-600">
                    {selectedScoreDetail.scenarioScore || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">场景适配度</div>
                </div>
              </div>

              {selectedScoreDetail.scoreReason && (() => {
                try {
                  const reasons = JSON.parse(selectedScoreDetail.scoreReason);
                  return (
                    <div className="space-y-3">
                      <div className="text-sm font-medium border-b pb-2">详细评价</div>
                      {reasons.structureReason && (
                        <div className="text-sm">
                          <div className="font-medium text-blue-600 mb-1">结构完整性</div>
                          <div className="text-muted-foreground">{reasons.structureReason}</div>
                        </div>
                      )}
                      {reasons.clarityReason && (
                        <div className="text-sm">
                          <div className="font-medium text-green-600 mb-1">清晰度</div>
                          <div className="text-muted-foreground">{reasons.clarityReason}</div>
                        </div>
                      )}
                      {reasons.scenarioReason && (
                        <div className="text-sm">
                          <div className="font-medium text-purple-600 mb-1">场景适配度</div>
                          <div className="text-muted-foreground">{reasons.scenarioReason}</div>
                        </div>
                      )}
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// 快速访问推荐组件
function QuickAccessSection() {
  const { data: topUsed } = trpc.prompts.topUsed.useQuery({ limit: 5 });
  const { data: recentlyUsed } = trpc.prompts.recentlyUsed.useQuery({ limit: 5 });
  const { data: recommendByMeta } = trpc.prompts.recommendByMeta.useQuery({
    subject: "",
    teachingScene: "",
    gradeLevel: "",
    textbookVersion: "",
    limit: 5,
  });
  const { data: essential } = trpc.prompts.essential.useQuery({ limit: 5 });
  const [, setLocation] = useLocation();

  if ((!topUsed || topUsed.length === 0) && (!recentlyUsed || recentlyUsed.length === 0)) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 最常用 */}
      {topUsed && topUsed.length > 0 && (
        <Card className="p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <h3 className="font-medium text-xs">最常用</h3>
          </div>
          <div className="space-y-1">
            {topUsed.slice(0, 3).map((prompt: any) => (
              <div
                key={prompt.id}
                onClick={() => setLocation(`/prompts/${prompt.id}`)}
                className="flex items-center justify-between p-1.5 rounded hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{prompt.title}</p>
                </div>
                <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">
                  {prompt.useCount || 0} 次
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 最近使用 */}
      {recentlyUsed && recentlyUsed.length > 0 && (
        <Card className="p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
            <h3 className="font-medium text-xs">最近使用</h3>
          </div>
          <div className="space-y-1">
            {recentlyUsed.slice(0, 3).map((prompt: any) => (
              <div
                key={prompt.id}
                onClick={() => setLocation(`/prompts/${prompt.id}`)}
                className="flex items-center justify-between p-1.5 rounded hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{prompt.title}</p>
                </div>
                <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">
                  {prompt.lastUsedAt ? new Date(prompt.lastUsedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 按元数据推荐 */}
      {recommendByMeta && recommendByMeta.length > 0 && (
        <Card className="p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <FolderTree className="h-3.5 w-3.5 text-green-500" />
            <h3 className="font-medium text-xs">按学科推荐</h3>
          </div>
          <div className="space-y-1">
            {recommendByMeta.slice(0, 3).map((prompt: any) => (
              <div
                key={prompt.id}
                onClick={() => setLocation(`/prompts/${prompt.id}`)}
                className="flex items-center justify-between p-1.5 rounded hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{prompt.title}</p>
                </div>
                <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">
                  {prompt.useCount || 0} 次
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 新人必备 */}
      {essential && essential.length > 0 && (
        <Card className="p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="h-3.5 w-3.5 text-purple-500" />
            <h3 className="font-medium text-xs">新人必备</h3>
          </div>
          <div className="space-y-1">
            {essential.slice(0, 3).map((prompt: any) => (
              <div
                key={prompt.id}
                onClick={() => setLocation(`/prompts/${prompt.id}`)}
                className="flex items-center justify-between p-1.5 rounded hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{prompt.title}</p>
                </div>
                <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">
                  {prompt.useCount || 0} 次
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
