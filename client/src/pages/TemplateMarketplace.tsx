import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Download, Star, TrendingUp, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function TemplateMarketplace() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const { data: templates, isLoading } = trpc.templateMarketplace.list.useQuery();
  const utils = trpc.useUtils();
  
  const importMutation = trpc.templateMarketplace.import.useMutation({
    onSuccess: (data) => {
      toast.success(`成功导入 ${data.count} 个分类`);
      utils.scenarios.list.invalidate();
      setPreviewOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast.error("导入失败: " + error.message);
    },
  });

  const handlePreview = (template: any) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleImport = async () => {
    if (!selectedTemplate) return;
    await importMutation.mutateAsync({ templateId: selectedTemplate.id });
  };

  // 获取行业列表
  const industries = templates
    ? Array.from(new Set(templates.map(t => t.industry)))
    : [];

  // 筛选模板
  const filteredTemplates = selectedIndustry
    ? templates?.filter(t => t.industry === selectedIndustry)
    : templates;

  // 行业图标映射
  const industryIcons: Record<string, string> = {
    "教育": "📚",
    "电商": "🛒",
    "医疗": "🏥",
    "内容创作": "📝",
    "企业管理": "💼",
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center text-muted-foreground">加载中...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">分类模板市场</h1>
          <p className="text-muted-foreground">
            浏览并导入各行业预设的分类结构,快速搭建您的提示词分类体系
          </p>
        </div>

        {/* 行业筛选 */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedIndustry === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedIndustry(null)}
          >
            全部行业
          </Button>
          {industries.map((industry) => (
            <Button
              key={industry}
              variant={selectedIndustry === industry ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedIndustry(industry)}
              className="gap-2"
            >
              <span>{industryIcons[industry] || "📦"}</span>
              {industry}
            </Button>
          ))}
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{templates?.length || 0}</div>
                <div className="text-sm text-muted-foreground">模板总数</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{industries.length}</div>
                <div className="text-sm text-muted-foreground">覆盖行业</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {templates?.reduce((sum, t) => sum + t.downloadCount, 0) || 0}
                </div>
                <div className="text-sm text-muted-foreground">总下载量</div>
              </div>
            </div>
          </Card>
        </div>

        {/* 模板列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates?.map((template) => (
            <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* 模板头部 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{template.icon || industryIcons[template.industry] || "📦"}</div>
                    <div>
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {template.industry}
                      </Badge>
                    </div>
                  </div>
                  {template.isOfficial && (
                    <Badge variant="default" className="gap-1">
                      <Star className="h-3 w-3" />
                      官方
                    </Badge>
                  )}
                </div>

                {/* 模板描述 */}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>

                {/* 模板统计 */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <Package className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">分类数量</p>
                      <p className="font-medium">{template.categoryCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <Download className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">使用次数</p>
                      <p className="font-medium">{template.downloadCount}</p>
                    </div>
                  </div>
                </div>

                {/* 创建者信息 */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>官方模板</span>
                  <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>

                {/* 分类层级统计 */}
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">一级: {template.level1Count}</Badge>
                  <Badge variant="outline">二级: {template.level2Count}</Badge>
                  <Badge variant="outline">三级: {template.level3Count}</Badge>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreview(template)}
                  >
                    预览详情
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setSelectedTemplate(template);
                      handleImport();
                    }}
                    disabled={importMutation.isPending}
                  >
                    <Download className="h-4 w-4" />
                    一键导入
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 空状态 */}
        {filteredTemplates?.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无该行业的模板</p>
          </div>
        )}
      </div>

      {/* 预览对话框 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-3xl">{selectedTemplate?.icon || "📦"}</span>
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              {/* 模板信息 */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">行业分类</div>
                  <div className="font-medium">{selectedTemplate.industry}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">分类总数</div>
                  <div className="font-medium">{selectedTemplate.categoryCount} 个</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">下载次数</div>
                  <div className="font-medium">{selectedTemplate.downloadCount} 次</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">模板类型</div>
                  <div className="font-medium">
                    {selectedTemplate.isOfficial ? "官方模板" : "社区模板"}
                  </div>
                </div>
              </div>

              {/* 分类结构预览 */}
              <div className="space-y-2">
                <h4 className="font-semibold">分类结构预览</h4>
                <div className="border rounded-lg p-4 bg-muted/50 max-h-96 overflow-y-auto">
                  <CategoryTreePreview
                    categories={JSON.parse(selectedTemplate.templateData)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {importMutation.isPending ? "导入中..." : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// 分类树预览组件
function CategoryTreePreview({ categories }: { categories: any[] }) {
  const level1 = categories.filter(c => c.level === 1);

  return (
    <div className="space-y-2 font-mono text-sm">
      {level1.map((l1, idx) => {
        const level2 = categories.filter(c => c.level === 2 && c.parentName === l1.name);
        return (
          <div key={idx}>
            <div className="font-semibold">
              {l1.icon} {l1.name}
            </div>
            {level2.map((l2, idx2) => {
              const level3 = categories.filter(c => c.level === 3 && c.parentName === l2.name);
              return (
                <div key={idx2} className="ml-4">
                  <div className="text-muted-foreground">
                    ├── {l2.icon} {l2.name}
                  </div>
                  {level3.map((l3, idx3) => (
                    <div key={idx3} className="ml-8 text-muted-foreground">
                      └── {l3.icon} {l3.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
