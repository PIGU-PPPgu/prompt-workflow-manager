import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check } from "lucide-react";
import { PromptVariable } from "./PromptVariablesDialog";

interface UsePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptContent: string;
  variables: PromptVariable[];
}

export function UsePromptDialog({ open, onOpenChange, promptContent, variables }: UsePromptDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const generateFinalPrompt = () => {
    let result = promptContent;
    variables.forEach(variable => {
      const value = values[variable.name] || variable.defaultValue || "";
      result = result.replace(new RegExp(`{{${variable.name}}}`, "g"), value);
    });
    return result;
  };

  const handleCopy = () => {
    const finalPrompt = generateFinalPrompt();
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>使用提示词</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {variables.length > 0 ? (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-medium">填写变量值</h4>
                {variables.map((variable) => (
                  <div key={variable.name} className="space-y-2">
                    <Label>{variable.label}</Label>
                    {variable.type === "text" && (
                      <Input
                        placeholder={variable.placeholder}
                        value={values[variable.name] || ""}
                        onChange={(e) => setValues({ ...values, [variable.name]: e.target.value })}
                      />
                    )}
                    {variable.type === "number" && (
                      <Input
                        type="number"
                        placeholder={variable.placeholder}
                        value={values[variable.name] || ""}
                        onChange={(e) => setValues({ ...values, [variable.name]: e.target.value })}
                      />
                    )}
                    {variable.type === "textarea" && (
                      <Textarea
                        placeholder={variable.placeholder}
                        value={values[variable.name] || ""}
                        onChange={(e) => setValues({ ...values, [variable.name]: e.target.value })}
                        rows={3}
                      />
                    )}
                    {variable.type === "select" && variable.options && (
                      <Select
                        value={values[variable.name] || ""}
                        onValueChange={(value) => setValues({ ...values, [variable.name]: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={variable.placeholder || "请选择"} />
                        </SelectTrigger>
                        <SelectContent>
                          {variable.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">生成的提示词</h4>
                <div className="bg-muted p-4 rounded-sm border border-border">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {generateFinalPrompt()}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-muted p-4 rounded-sm border border-border">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {promptContent}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                复制提示词
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
