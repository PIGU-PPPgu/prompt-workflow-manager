import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Eye, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function InvitationCodes() {
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [description, setDescription] = useState("");
  const [maxUses, setMaxUses] = useState<number | undefined>();
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>();
  const [grantTier, setGrantTier] = useState<"free" | "basic" | "pro">("free");
  const [grantDays, setGrantDays] = useState<number>(0);

  const utils = trpc.useUtils();
  const { data: codes = [], isLoading } = trpc.invitationCodes.list.useQuery();
  const generateMutation = trpc.invitationCodes.generate.useMutation({
    onSuccess: () => {
      toast.success("邀请码生成成功");
      utils.invitationCodes.list.invalidate();
      setIsGenerateOpen(false);
      // Reset form
      setCustomCode("");
      setDescription("");
      setMaxUses(undefined);
      setExpiresInDays(undefined);
      setGrantTier("free");
      setGrantDays(0);
    },
    onError: (error) => {
      toast.error(error.message || "生成失败");
    },
  });

  const toggleMutation = trpc.invitationCodes.toggle.useMutation({
    onSuccess: () => {
      toast.success("状态更新成功");
      utils.invitationCodes.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const deleteMutation = trpc.invitationCodes.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      utils.invitationCodes.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const handleGenerate = async () => {
    await generateMutation.mutateAsync({
      code: customCode || undefined,
      description: description || undefined,
      maxUses: maxUses,
      expiresAt: expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      grantTier,
      grantDays,
    });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("已复制到剪贴板");
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("zh-CN");
  };

  if (isLoading) {
    return <div className="p-8">加载中...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">邀请码管理</h1>
          <p className="text-sm text-neutral-500 mt-1">
            生成和管理用户注册邀请码
          </p>
        </div>

        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              生成邀请码
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>生成新邀请码</DialogTitle>
              <DialogDescription>
                留空自动生成随机邀请码，或输入自定义邀请码
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700">
                  邀请码（可选）
                </label>
                <Input
                  placeholder="留空自动生成"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700">
                  描述
                </label>
                <Input
                  placeholder="如：内测用户、VIP专属等"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700">
                    最大使用次数
                  </label>
                  <Input
                    type="number"
                    placeholder="不限制"
                    min={1}
                    value={maxUses || ""}
                    onChange={(e) =>
                      setMaxUses(e.target.value ? Number(e.target.value) : undefined)
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700">
                    有效天数
                  </label>
                  <Input
                    type="number"
                    placeholder="永久有效"
                    min={1}
                    value={expiresInDays || ""}
                    onChange={(e) =>
                      setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700">
                    赠送等级
                  </label>
                  <select
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                    value={grantTier}
                    onChange={(e) =>
                      setGrantTier(e.target.value as "free" | "basic" | "pro")
                    }
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700">
                    赠送天数
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    value={grantDays}
                    onChange={(e) =>
                      setGrantDays(e.target.value ? Number(e.target.value) : 0)
                    }
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? "生成中..." : "生成"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {codes.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          暂无邀请码，点击右上角按钮生成
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邀请码</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>使用情况</TableHead>
                <TableHead>赠送等级</TableHead>
                <TableHead>过期时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-semibold">
                    <div className="flex items-center gap-2">
                      {code.code}
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="text-neutral-400 hover:text-neutral-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-600">
                    {code.description || "-"}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {code.usedCount} / {code.maxUses || "∞"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{code.grantTier}</Badge>
                    {code.grantDays > 0 && (
                      <span className="text-xs text-neutral-500 ml-1">
                        +{code.grantDays}天
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-600">
                    {formatDate(code.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={code.isActive ? "default" : "secondary"}>
                      {code.isActive ? "启用" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            codeId: code.id,
                            isActive: !code.isActive,
                          })
                        }
                        className="text-neutral-400 hover:text-neutral-600"
                        title={code.isActive ? "禁用" : "启用"}
                      >
                        {code.isActive ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("确定要删除这个邀请码吗？")) {
                            deleteMutation.mutate({ codeId: code.id });
                          }
                        }}
                        className="text-neutral-400 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
