import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Send, ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";

export default function AgentChat() {
  const [, params] = useRoute("/agents/:id/chat");
  const [, setLocation] = useLocation();
  const agentId = params?.id ? parseInt(params.id) : undefined;
  
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<number | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agent } = trpc.agents.get.useQuery(
    { id: agentId! },
    { enabled: !!agentId }
  );

  const { data: conversations } = trpc.agents.conversations.useQuery(
    { agentId: agentId! },
    { enabled: !!agentId }
  );

  const chatMutation = trpc.agents.chat.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessage("");
    },
    onError: (error) => {
      toast.error("发送失败: " + error.message);
    },
  });

  const currentConversation = conversations?.find(c => c.id === conversationId);
  const messages = currentConversation
    ? JSON.parse(currentConversation.messages)
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !agentId) return;

    chatMutation.mutate({
      agentId,
      conversationId,
      message: message.trim(),
    });
  };

  if (!agentId) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">无效的智能体ID</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/agents")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {agent?.name || "加载中..."}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {agent?.description && (
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              )}
              {agent?.model && (
                <span className="text-xs px-2 py-1 bg-muted rounded-md">
                  模型: {agent.model}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>开始对话</p>
                {agent?.systemPrompt && (
                  <p className="text-xs mt-2 max-w-md mx-auto">
                    系统提示: {agent.systemPrompt}
                  </p>
                )}
              </div>
            ) : (
              messages.map((msg: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="text-xs font-medium mb-1 opacity-70">
                      {msg.role === "user" ? "你" : agent?.name || "助手"}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-lg p-3">
                  <div className="text-xs font-medium mb-1 opacity-70">
                    {agent?.name || "助手"}
                  </div>
                  <div className="text-sm">正在思考...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="输入消息..."
                disabled={chatMutation.isPending}
              />
              <Button
                type="submit"
                disabled={!message.trim() || chatMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
