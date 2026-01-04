import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, User, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Settings() {
  const { user, refresh } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Initialize state when user data is available
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      // @ts-ignore - phoneNumber might not be in the type definition yet if types aren't regenerated
      setPhoneNumber(user.phoneNumber || "");
    }
  }, [user]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("个人信息已保存");
      refresh(); // Refresh user context
    },
    onError: (error) => {
      toast.error("保存失败: " + error.message);
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate({
      name,
      email,
      phoneNumber,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">个人设置</h1>
          <p className="text-muted-foreground mt-1">管理您的个人资料和联系方式</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
               <User className="h-5 w-5 text-primary" />
               <h2 className="text-lg font-medium">基本信息</h2>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">用户名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入用户名"
              />
              <p className="text-xs text-muted-foreground">
                这将是您在系统中的显示名称
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
              />
              <p className="text-xs text-muted-foreground">
                用于接收系统通知
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">手机号</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="请输入手机号"
              />
              <p className="text-xs text-muted-foreground">
                用于短信通知（可选）
              </p>
            </div>

            <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateProfileMutation.isPending ? "保存中..." : "保存更改"}
            </Button>
          </Card>
          
          <Card className="p-6 space-y-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
               <ShieldCheck className="h-5 w-5 text-primary" />
               <h2 className="text-lg font-medium">账号安全</h2>
            </div>
            
             <div className="space-y-2">
              <Label>登录方式</Label>
              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                <span className="font-medium capitalize">{user?.loginMethod || "未知"}</span>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">已连接</span>
              </div>
               <p className="text-xs text-muted-foreground mt-2">
                当前登录方式由第三方服务提供商（如 Supabase）管理。如需修改密码或绑定其他账号，请联系管理员。
              </p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
