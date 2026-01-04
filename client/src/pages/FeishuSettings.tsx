import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function FeishuSettings() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [syncOnCreate, setSyncOnCreate] = useState(true);
  const [syncOnUpdate, setSyncOnUpdate] = useState(true);

  const { data: config, isLoading } = trpc.feishu.getConfig.useQuery();
  const utils = trpc.useUtils();

  const updateConfigMutation = trpc.feishu.updateConfig.useMutation({
    onSuccess: () => {
      utils.feishu.getConfig.invalidate();
      toast.success("飞书配置已保存");
    },
    onError: (error) => {
      toast.error("保存失败: " + error.message);
    },
  });

  useEffect(() => {
    if (config) {
      setWebhookUrl(config.webhookUrl);
      setEnabled(config.enabled);
      setSyncOnCreate(config.syncOnCreate);
      setSyncOnUpdate(config.syncOnUpdate);
    }
  }, [config]);

  const handleSave = () => {
    if (!webhookUrl.trim()) {
      toast.error("请输入Webhook URL");
      return;
    }

    updateConfigMutation.mutate({
      webhookUrl,
      enabled,
      syncOnCreate,
      syncOnUpdate,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">飞书集成</h1>
          <p className="text-muted-foreground mt-1">配置飞书Webhook,自动同步提示词到飞书文档</p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              在飞书群聊中添加自定义机器人,复制Webhook地址到此处
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用飞书同步</Label>
              <p className="text-xs text-muted-foreground">开启后自动同步提示词到飞书</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>创建时同步</Label>
              <p className="text-xs text-muted-foreground">创建新提示词时自动同步</p>
            </div>
            <Switch checked={syncOnCreate} onCheckedChange={setSyncOnCreate} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>更新时同步</Label>
              <p className="text-xs text-muted-foreground">更新提示词时自动同步</p>
            </div>
            <Switch checked={syncOnUpdate} onCheckedChange={setSyncOnUpdate} />
          </div>

          <Button onClick={handleSave} disabled={updateConfigMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateConfigMutation.isPending ? "保存中..." : "保存配置"}
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">使用说明</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>在飞书群聊中点击"设置" → "群机器人" → "添加机器人"</li>
            <li>选择"自定义机器人",设置名称和头像</li>
            <li>复制生成的Webhook地址,粘贴到上方输入框</li>
            <li>启用同步选项,保存配置</li>
            <li>创建或更新提示词时,将自动同步到飞书群聊</li>
          </ol>
        </Card>
      </div>
    </DashboardLayout>
  );
}
