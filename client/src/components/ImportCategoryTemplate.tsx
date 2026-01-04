import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ImportCategoryTemplate() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const utils = trpc.useUtils();
  const importMutation = trpc.scenarios.importTemplate.useMutation({
    onSuccess: (data: { success: boolean; count: number; categories: any[] }) => {
      toast.success(`成功导入 ${data.count} 个分类`);
      utils.scenarios.list.invalidate();
      setOpen(false);
      setFile(null);
      setPreview([]);
    },
    onError: (error: any) => {
      toast.error("导入失败: " + error.message);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileType = selectedFile.name.endsWith(".csv")
      ? "csv"
      : selectedFile.name.endsWith(".json")
      ? "json"
      : null;

    if (!fileType) {
      toast.error("仅支持 CSV 或 JSON 格式");
      return;
    }

    setFile(selectedFile);

    // 读取文件内容并预览
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        let categories;
        if (fileType === "csv") {
          categories = parseCSVPreview(content);
        } else {
          categories = JSON.parse(content);
        }
        setPreview(Array.isArray(categories) ? categories.slice(0, 10) : []);
      } catch (error) {
        toast.error("文件格式错误");
        setFile(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const parseCSVPreview = (content: string) => {
    const lines = content.split("\n").filter((line) => line.trim());
    const categories = [];
    for (let i = 1; i < Math.min(11, lines.length); i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        categories.push({
          name: parts[0],
          description: parts[1],
          parentName: parts[2] || undefined,
          icon: parts[3] || undefined,
          level: parseInt(parts[4]) || 1,
        });
      }
    }
    return categories;
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const fileType = file.name.endsWith(".csv") ? "csv" : "json";

      try {
        await importMutation.mutateAsync({
          fileContent: content,
          fileType,
        });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          导入模板
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入分类模板</DialogTitle>
          <DialogDescription>
            上传 CSV 或 JSON 格式的分类结构文件,批量创建多级分类
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 文件上传区域 */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="hidden"
              id="template-file"
            />
            <label
              htmlFor="template-file"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <FileText className="h-12 w-12 text-gray-400" />
              <div className="text-sm text-gray-600">
                点击选择文件或拖拽到此处
              </div>
              <div className="text-xs text-gray-400">
                支持 CSV 和 JSON 格式
              </div>
            </label>
          </div>

          {/* 已选文件 */}
          {file && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-gray-500 ml-auto">
                {(file.size / 1024).toFixed(2)} KB
              </span>
            </div>
          )}

          {/* 格式说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm space-y-2">
                <div className="font-medium text-blue-900">文件格式要求:</div>
                <div className="text-blue-800">
                  <strong>CSV格式:</strong> name,description,parentName,icon,level
                  <br />
                  示例: 电商运营,电商相关提示词,,🛒,1
                </div>
                <div className="text-blue-800">
                  <strong>JSON格式:</strong> 数组对象,每个对象包含 name,
                  description, parentName, icon, level 字段
                </div>
              </div>
            </div>
          </div>

          {/* 预览 */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="font-medium text-sm">预览 (前10条):</div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">名称</th>
                      <th className="px-3 py-2 text-left">描述</th>
                      <th className="px-3 py-2 text-left">父分类</th>
                      <th className="px-3 py-2 text-left">层级</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">
                          {item.icon} {item.name}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {item.description || "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {item.parentName || "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          Level {item.level}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="gap-2"
          >
            {importing ? "导入中..." : "确认导入"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
