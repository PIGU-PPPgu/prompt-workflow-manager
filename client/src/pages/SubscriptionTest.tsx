import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

/**
 * 订阅测试页面(仅管理员可见)
 * 用于测试订阅到期提醒功能
 */
export default function SubscriptionTest() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const checkExpiryMutation = trpc.subscription.checkExpiry.useMutation({
    onSuccess: (data) => {
      toast.success(`到期检查完成`, {
        description: `发送了${data.remindersCount}条提醒,处理了${data.expiredCount}个过期订阅`,
      });
      utils.notifications.list.invalidate();
    },
    onError: (error) => {
      toast.error("检查失败", {
        description: error.message,
      });
    },
  });

  // 非管理员重定向
  if (user && user.role !== 'admin') {
    setLocation('/');
    return null;
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">订阅系统测试</h1>
        <p className="text-muted-foreground mt-2">
          管理员专用测试页面,用于测试订阅到期提醒功能
        </p>
      </div>

      <div className="grid gap-6">
        {/* 到期检查测试 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">订阅到期检查</h2>
          <p className="text-sm text-muted-foreground mb-4">
            手动触发订阅到期检查,系统会:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 mb-6 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              检查即将到期的订阅(提前3天),发送提醒通知
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              检查已过期的订阅,自动降级为免费版并发送通知
            </li>
          </ul>
          <Button
            onClick={() => checkExpiryMutation.mutate()}
            disabled={checkExpiryMutation.isPending}
          >
            {checkExpiryMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            手动触发到期检查
          </Button>
        </Card>

        {/* 自动任务说明 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">自动定时任务</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">定时任务已启动</p>
                <p className="text-sm text-muted-foreground mt-1">
                  系统会在每天凌晨1点自动执行订阅到期检查
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">提醒规则</p>
                <p className="text-sm text-muted-foreground mt-1">
                  用户订阅到期前3天会收到提醒通知,到期后自动降级为免费版
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* 测试流程说明 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">完整测试流程</h2>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="font-semibold text-primary shrink-0">1.</span>
              <span>
                在<strong>用户管理</strong>页面为测试用户开通订阅,设置较短的到期时间(如3天后)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-primary shrink-0">2.</span>
              <span>
                点击上方<strong>"手动触发到期检查"</strong>按钮,测试提醒通知是否正常发送
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-primary shrink-0">3.</span>
              <span>
                查看<strong>通知中心</strong>,确认收到"订阅即将到期"的通知
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-primary shrink-0">4.</span>
              <span>
                将测试用户的到期时间改为已过期,再次触发检查,验证自动降级功能
              </span>
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
