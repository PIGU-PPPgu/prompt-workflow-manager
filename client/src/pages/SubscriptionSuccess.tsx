import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/subscription/success");
  
  useEffect(() => {
    // 可以在这里记录支付成功事件或发送通知
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (sessionId) {
      console.log('Payment successful, session ID:', sessionId);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">订阅成功!</CardTitle>
          <CardDescription>
            感谢您的订阅,您的账户已升级
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg text-sm">
            <p className="mb-2">✅ 订阅已激活</p>
            <p className="mb-2">✅ 所有高级功能已解锁</p>
            <p>✅ 您将收到确认邮件</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setLocation('/subscription')}
              variant="outline"
              className="flex-1"
            >
              查看订阅详情
            </Button>
            <Button
              onClick={() => setLocation('/prompts')}
              className="flex-1"
            >
              开始使用
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
