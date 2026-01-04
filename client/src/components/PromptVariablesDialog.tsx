import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export interface PromptVariable {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "select";
  options?: string[];
  defaultValue?: string;
  placeholder?: string;
}

interface PromptVariablesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variables: PromptVariable[];
  onSave: (variables: PromptVariable[]) => void;
}

export function PromptVariablesDialog({ open, onOpenChange, variables, onSave }: PromptVariablesDialogProps) {
  const [localVariables, setLocalVariables] = useState<PromptVariable[]>(variables);

  // 同步外部变量更新（修复 AI 转换后变量不显示的问题）
  useEffect(() => {
    if (open) {
      setLocalVariables(variables);
    }
  }, [open, variables]);

  const addVariable = () => {
    setLocalVariables([
      ...localVariables,
      { name: "", label: "", type: "text", placeholder: "" }
    ]);
  };

  const removeVariable = (index: number) => {
    setLocalVariables(localVariables.filter((_, i) => i !== index));
  };

  const updateVariable = (index: number, field: keyof PromptVariable, value: any) => {
    const updated = [...localVariables];
    updated[index] = { ...updated[index], [field]: value };
    setLocalVariables(updated);
  };

  const handleSave = () => {
    onSave(localVariables.filter(v => v.name && v.label));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>配置提示词变量</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            在提示词中使用 <code className="bg-muted px-1 rounded">{`{{变量名}}`}</code> 语法来定义变量占位符
          </p>

          {localVariables.map((variable, index) => (
            <div key={index} className="border border-border rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">变量 {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVariable(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>变量名</Label>
                  <Input
                    placeholder="例如: product_name"
                    value={variable.name}
                    onChange={(e) => updateVariable(index, "name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>显示标签</Label>
                  <Input
                    placeholder="例如: 产品名称"
                    value={variable.label}
                    onChange={(e) => updateVariable(index, "label", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select
                    value={variable.type}
                    onValueChange={(value: any) => updateVariable(index, "type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">文本</SelectItem>
                      <SelectItem value="number">数字</SelectItem>
                      <SelectItem value="textarea">多行文本</SelectItem>
                      <SelectItem value="select">下拉选择</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>占位符</Label>
                  <Input
                    placeholder="提示文字"
                    value={variable.placeholder || ""}
                    onChange={(e) => updateVariable(index, "placeholder", e.target.value)}
                  />
                </div>

                {variable.type === "select" && (
                  <div className="col-span-2 space-y-2">
                    <Label>选项 (逗号分隔)</Label>
                    <Input
                      placeholder="选项1, 选项2, 选项3"
                      value={variable.options?.join(", ") || ""}
                      onChange={(e) => updateVariable(index, "options", e.target.value.split(",").map(s => s.trim()))}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addVariable}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加变量
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
