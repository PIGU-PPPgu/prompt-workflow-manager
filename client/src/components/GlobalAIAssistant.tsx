import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Bot, X, Send, Loader2, Upload, Sparkles, MessageSquare, FolderTree, Tags, Lightbulb, EyeOff } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { motion, useDragControls } from "framer-motion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "global-ai-assistant-messages";
const CONVERSATION_ID_KEY = "global-ai-assistant-conversation-id";

const QUICK_COMMANDS = [
  { icon: Sparkles, label: "优化提示词", prompt: "请帮我优化这个提示词,使其更清晰、结构化:" },
  { icon: FolderTree, label: "创建分类", prompt: "请帮我生成一个完整的三级分类结构,行业是:" },
  { icon: Tags, label: "生成标签", prompt: "请为这个提示词生成相关的标签:" },
  { icon: Lightbulb, label: "使用建议", prompt: "请给我一些使用这个提示词的最佳实践建议:" },
];

export default function GlobalAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createConversationMutation = trpc.categoryAssistant.createConversation.useMutation();
  const chatMutation = trpc.categoryAssistant.chat.useMutation();
  const notifyOwnerMutation = trpc.system.notifyOwner.useMutation();

  // 加载保存的对话历史
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    const savedConversationId = localStorage.getItem(CONVERSATION_ID_KEY);
    
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to parse saved messages", e);
      }
    }
    
    if (savedConversationId) {
      setConversationId(parseInt(savedConversationId));
    }
  }, []);

  // 保存对话历史
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (conversationId) {
      localStorage.setItem(CONVERSATION_ID_KEY, conversationId.toString());
    }
  }, [conversationId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleOpen = async () => {
    setIsOpen(true);
    if (!conversationId) {
      try {
        const result = await createConversationMutation.mutateAsync();
        setConversationId(result.id);
        
        // 如果没有历史消息,显示欢迎消息
        if (messages.length === 0) {
          setMessages([
            {
              role: "assistant",
              content:
                "你好!我是AI助手,可以帮你:\n\n1. **生成分类结构** - 告诉我你的行业或需求\n2. **优化提示词** - 发送你的提示词内容\n3. **生成标签** - 为提示词推荐相关标签\n4. **回答问题** - 关于提示词、工作流、智能体的任何问题\n\n你也可以使用下方的快捷指令,或上传文件(.txt/.md/.csv/.json)。",
            },
          ]);
        }
      } catch (error: any) {
        toast.error("创建会话失败: " + error.message);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowFeedback(false);
  };

  const handleClearHistory = () => {
    if (confirm("确定要清空对话历史吗?")) {
      setMessages([]);
      setConversationId(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CONVERSATION_ID_KEY);
      toast.success("对话历史已清空");
      handleOpen(); // 重新创建会话
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["text/plain", "text/markdown", "text/csv", "application/json"];
      const allowedExtensions = [".txt", ".md", ".csv", ".json"];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        toast.error("只支持 .txt, .md, .csv, .json 文件");
        return;
      }

      setUploadedFile(file);
      toast.success("文件已上传: " + file.name);
    }
  };

  const handleQuickCommand = (prompt: string) => {
    setMessage(prompt);
  };

  const handleSend = async () => {
    if (!message.trim() && !uploadedFile) {
      toast.error("请输入消息或上传文件");
      return;
    }

    if (!conversationId) {
      toast.error("会话未创建");
      return;
    }

    const userMessage = message.trim();
    const file = uploadedFile;

    // 添加用户消息到界面
    const newMessages = [...messages, { role: "user" as const, content: userMessage || `[上传文件: ${file?.name}]` }];
    setMessages(newMessages);
    setMessage("");
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      let fileContent = "";
      if (file) {
        fileContent = await file.text();
      }

      const result = await chatMutation.mutateAsync({
        conversationId,
        message: userMessage,
        fileContent: fileContent || undefined,
      });

      // 添加AI回复到界面
      setMessages([...newMessages, { role: "assistant", content: result.reply }]);
    } catch (error: any) {
      toast.error("发送失败: " + error.message);
      // 移除用户消息
      setMessages(messages);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error("请输入反馈内容");
      return;
    }

    try {
      await notifyOwnerMutation.mutateAsync({
        title: "全局AI助手用户反馈",
        content: `用户反馈:\n\n${feedbackText}\n\n---\n对话历史:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n\n")}`,
      });
      toast.success("反馈已提交,感谢您的建议!");
      setFeedbackText("");
      setShowFeedback(false);
    } catch (error: any) {
      toast.error("提交失败: " + error.message);
    }
  };

  const dragControls = useDragControls();
  const [isHidden, setIsHidden] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleShowEvent = () => {
      setIsHidden(false);
      setIsOpen(true);
    };

    window.addEventListener("SHOW_GLOBAL_AI_ASSISTANT", handleShowEvent);
    return () => {
      window.removeEventListener("SHOW_GLOBAL_AI_ASSISTANT", handleShowEvent);
    };
  }, []);

  if (isHidden) return null;

  return (
    <>
      {/* 悬浮按钮 */}
      {!isOpen && (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <motion.div
              drag
              dragMomentum={false}
              className="fixed bottom-6 right-6 z-50 touch-none"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onDragStart={() => {
                isDraggingRef.current = true;
              }}
              onDragEnd={() => {
                setTimeout(() => {
                  isDraggingRef.current = false;
                }, 100);
              }}
            >
              <Button
                onClick={(e) => {
                  if (isDraggingRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  handleOpen();
                }}
                className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-gray-900 to-black text-white hover:from-gray-800 hover:to-gray-900 transition-all duration-300"
                size="icon"
              >
                <Bot className="h-7 w-7" />
              </Button>
            </motion.div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => setIsHidden(true)}>
              <EyeOff className="mr-2 h-4 w-4" />
              隐藏悬浮球
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}

      {/* 悬浮对话框 */}
      {isOpen && (
        <>
          {/* 对话框 */}
          <motion.div 
            drag
            dragListener={false}
            dragControls={dragControls}
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-6 right-6 w-[450px] h-[650px] shadow-2xl z-50 flex flex-col border-2 border-gray-200 rounded-2xl overflow-hidden bg-white"
          >
            {/* 头部 */}
            <div 
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100 cursor-move"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center shadow-lg">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">AI助手</h3>
                  <p className="text-xs text-muted-foreground">DeepSeek-V3 · 支持上下文记忆</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearHistory}
                  title="清空对话历史"
                  className="h-8 w-8"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 快捷指令 */}
            {!showFeedback && (
              <div className="p-3 bg-gray-50 border-b flex gap-2 overflow-x-auto">
                {QUICK_COMMANDS.map((cmd, index) => {
                  const Icon = cmd.icon;
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickCommand(cmd.prompt)}
                      className="flex items-center gap-1 whitespace-nowrap bg-white hover:bg-gray-100 border-gray-300"
                    >
                      <Icon className="h-3 w-3" />
                      <span className="text-xs">{cmd.label}</span>
                    </Button>
                  );
                })}
              </div>
            )}

            {/* 消息列表或反馈表单 */}
            {showFeedback ? (
              <div className="flex-1 p-6 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">提交反馈</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    遇到问题或有改进建议?告诉我们,我们会及时处理!
                  </p>
                  <textarea
                    className="w-full h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="请描述您遇到的问题或建议..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSubmitFeedback} disabled={notifyOwnerMutation.isPending} className="flex-1">
                    {notifyOwnerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "提交反馈"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowFeedback(false)} className="flex-1">
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white to-gray-50">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-gray-900 to-black text-white"
                          : "bg-white border border-gray-200 text-black"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <Streamdown>{msg.content}</Streamdown>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* 输入区域 */}
            {!showFeedback && (
              <div className="p-4 border-t-2 border-gray-100 bg-white space-y-3">
                {uploadedFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-100 p-2 rounded-lg">
                    <Upload className="h-3 w-3" />
                    <span className="flex-1 truncate">{uploadedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => {
                        setUploadedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.md,.csv,.json"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={chatMutation.isPending}
                    className="shrink-0"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="输入消息... (Shift+Enter换行)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={chatMutation.isPending}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={chatMutation.isPending || (!message.trim() && !uploadedFile)}
                    className="shrink-0 bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-gray-900"
                  >
                    {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFeedback(true)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    💬 提交反馈
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </>
  );
}
