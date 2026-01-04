import { useState } from "react";
import CodeEditor from "@uiw/react-textarea-code-editor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
// Highlight.js styles are loaded via CDN in index.html
import { Button } from "@/components/ui/button";
import { Eye, Code } from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function MarkdownEditor({ value, onChange, placeholder, minHeight = "200px" }: MarkdownEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-muted/30">
        <div className="text-xs text-muted-foreground">
          支持 Markdown 格式
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "edit" ? "default" : "ghost"}
            onClick={() => setMode("edit")}
            className="h-7 px-2"
          >
            <Code className="h-3 w-3 mr-1" />
            编辑
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "preview" ? "default" : "ghost"}
            onClick={() => setMode("preview")}
            className="h-7 px-2"
          >
            <Eye className="h-3 w-3 mr-1" />
            预览
          </Button>
        </div>
      </div>
      <div style={{ minHeight }}>
        {mode === "edit" ? (
          <CodeEditor
            value={value}
            language="markdown"
            placeholder={placeholder || "输入提示词内容..."}
            onChange={(e) => onChange(e.target.value)}
            padding={15}
            style={{
              fontSize: 14,
              backgroundColor: "transparent",
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              minHeight,
            }}
          />
        ) : (
          <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {value || "*暂无内容*"}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
