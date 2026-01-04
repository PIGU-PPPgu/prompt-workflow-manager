import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Download, Upload, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

export default function BatchOperations() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: prompts } = trpc.prompts.list.useQuery();
  const { data: workflows } = trpc.workflows.list.useQuery();
  const { data: agents } = trpc.agents.list.useQuery();

  const importMutation = trpc.batch.import.useMutation({
    onSuccess: (result) => {
      toast.success(`成功导入 ${result.count} 条数据`);
      utils.prompts.list.invalidate();
      utils.workflows.list.invalidate();
      utils.agents.list.invalidate();
    },
    onError: (error) => {
      toast.error(`导入失败: ${error.message}`);
    },
  });

  const handleExportJSON = (type: "prompts" | "workflows" | "agents") => {
    let data: any[] = [];
    let filename = "";

    switch (type) {
      case "prompts":
        data = prompts || [];
        filename = "prompts.json";
        break;
      case "workflows":
        data = workflows || [];
        filename = "workflows.json";
        break;
      case "agents":
        data = agents || [];
        filename = "agents.json";
        break;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("导出成功");
  };

  const handleExportCSV = (type: "prompts" | "workflows" | "agents") => {
    let data: any[] = [];
    let filename = "";
    let headers: string[] = [];

    switch (type) {
      case "prompts":
        data = prompts || [];
        filename = "prompts.csv";
        headers = ["ID", "标题", "描述", "内容", "评分", "版本"];
        break;
      case "workflows":
        data = workflows || [];
        filename = "workflows.json";
        headers = ["ID", "标题", "描述", "平台"];
        break;
      case "agents":
        data = agents || [];
        filename = "agents.csv";
        headers = ["ID", "名称", "描述", "模型"];
        break;
    }

    const csvRows = [headers.join(",")];

    data.forEach((item) => {
      const row: string[] = [];
      switch (type) {
        case "prompts":
          row.push(
            item.id,
            `"${item.title}"`,
            `"${item.description || ""}"`,
            `"${item.content.replace(/"/g, '""')}"`,
            item.score || "",
            item.version || ""
          );
          break;
        case "workflows":
          row.push(
            item.id,
            `"${item.title}"`,
            `"${item.description || ""}"`,
            item.platform || ""
          );
          break;
        case "agents":
          row.push(
            item.id,
            `"${item.name}"`,
            `"${item.description || ""}"`,
            item.model || ""
          );
          break;
      }
      csvRows.push(row.join(","));
    });

    const csv = csvRows.join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("导出成功");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        importMutation.mutate({ data, type: "prompts" });
      } catch (error) {
        toast.error("文件格式错误");
      }
    };
    reader.readAsText(file);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">批量操作</h1>
          <p className="text-muted-foreground">
            导入和导出提示词、工作流、智能体数据
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 提示词 */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">提示词库</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExportJSON("prompts")}
              >
                <FileJson className="h-4 w-4 mr-2" />
                导出为 JSON
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExportCSV("prompts")}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                导出为 CSV
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                导入 JSON
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              当前共有 {prompts?.length || 0} 个提示词
            </p>
          </div>

          {/* 工作流 */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">工作流</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExportJSON("workflows")}
              >
                <FileJson className="h-4 w-4 mr-2" />
                导出为 JSON
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExportCSV("workflows")}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                导出为 CSV
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              当前共有 {workflows?.length || 0} 个工作流
            </p>
          </div>

          {/* 智能体 */}
          <div className="border border-border rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">智能体</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExportJSON("agents")}
              >
                <FileJson className="h-4 w-4 mr-2" />
                导出为 JSON
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExportCSV("agents")}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                导出为 CSV
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              当前共有 {agents?.length || 0} 个智能体
            </p>
          </div>
        </div>

        <div className="border border-dashed border-border rounded-lg p-6">
          <h3 className="font-medium mb-2">导入说明</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>支持导入 JSON 格式的数据文件</li>
            <li>导入的数据将自动关联到当前用户</li>
            <li>重复的数据将被跳过</li>
            <li>建议先导出现有数据作为模板参考</li>
          </ul>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
    </DashboardLayout>
  );
}
