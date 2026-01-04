import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { Send, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface CategoryAssistantChatProps {
  conversationId: number;
  onComplete: () => void;
}

export function CategoryAssistantChat({ conversationId, onComplete }: CategoryAssistantChatProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasGeneratedCategories, setHasGeneratedCategories] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: conversation } = trpc.categoryAssistant.getConversation.useQuery(
    { id: conversationId },
    {
      refetchInterval: 1000,
    }
  );
  
  useEffect(() => {
    if (conversation) {
      const parsedMessages = JSON.parse(conversation.messages || "[]");
      setMessages(parsedMessages);
      setHasGeneratedCategories(!!conversation.generatedCategories);
    }
  }, [conversation]);
  
  const chatMutation = trpc.categoryAssistant.chat.useMutation({
    onSuccess: () => {
      setMessage("");
    },
    onError: (error) => {
      toast.error("发送失败: " + error.message);
    },
  });
  
  const confirmMutation = trpc.categoryAssistant.confirmAndCreate.useMutation({
    onSuccess: () => {
      toast.success("分类已创建!");
      onComplete();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSend = async () => {
    if (!message.trim()) return;
    
    chatMutation.mutate({
      conversationId,
      message: message.trim(),
    });
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      
      chatMutation.mutate({
        conversationId,
        message: `我上传了一个文件: ${file.name}`,
        fileContent: content,
      });
    };
    reader.readAsText(file);
  };
  
  const handleConfirm = () => {
    confirmMutation.mutate({ conversationId });
  };
  
  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              您好!我是AI分类助手。请告诉我您想创建什么样的分类结构,或者上传一个文件让我分析。
            </p>
          </Card>
        )}
        
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`max-w-[80%] p-4 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <Streamdown>{msg.content}</Streamdown>
              <p className="text-xs opacity-70 mt-2">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </Card>
          </div>
        ))}
        
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-muted">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI正在思考...</span>
              </div>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Action Buttons */}
      {hasGeneratedCategories && (
        <div className="p-4 border-t border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">AI已生成分类结构</span>
            <Button
              className="ml-auto"
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? "创建中..." : "确认并创建"}
            </Button>
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={chatMutation.isPending}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Input
            placeholder="输入消息..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={chatMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={chatMutation.isPending || !message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          支持上传 .txt, .md, .csv 文件让AI分析
        </p>
      </div>
    </div>
  );
}
