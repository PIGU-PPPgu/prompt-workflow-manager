import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles, Zap, Mail, History } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const PLANS = [
  {
    id: 'free',
    name: '免费版',
    price: '¥0',
    period: '/永久',
    icon: Sparkles,
    popular: false,
    features: [
      '50个提示词',
      '10次AI优化/月',
      '基础分类管理',
      '社区支持',
    ],
  },
  {
    id: 'basic',
    name: '基础版',
    price: '¥9.9',
    period: '/月',
    icon: Zap,
    popular: true,
    features: [
      '200个提示词',
      '100次AI优化/月',
      '版本管理',
      '高级分类',
      '批量操作',
      '优先支持',
    ],
  },
  {
    id: 'pro',
    name: '专业版',
    price: '¥19.9',
    period: '/月',
    icon: Crown,
    popular: false,
    features: [
      '无限提示词',
      '500次AI优化/月',
      '多模型对比',
      '数据导出',
      '团队协作',
      '专属客服',
    ],
  },
];

export default function Subscription() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { data: subscriptionInfo, isLoading: subLoading } = trpc.subscription.info.useQuery();
  
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [validatedCoupon, setValidatedCoupon] = useState<any>(null);
  
  const validateCouponQuery = trpc.coupons.validate.useQuery(
    { code: couponCode, tier: selectedPlan || undefined },
    { enabled: false }
  );
  
  const handleValidateCoupon = async () => {
    if (!couponCode) return;
    
    try {
      const result = await validateCouponQuery.refetch();
      if (result.data?.valid) {
        setValidatedCoupon(result.data.coupon);
        toast.success('优惠券验证成功！');
      } else {
        setValidatedCoupon(null);
        toast.error(result.data?.error || '优惠券无效');
      }
    } catch (error: any) {
      setValidatedCoupon(null);
      toast.error(error.message || '验证失败');
    }
  };
  
  const calculateDiscountedPrice = () => {
    if (!validatedCoupon || !selectedPlan) return '¥0';
    
    const plan = PLANS.find(p => p.id === selectedPlan);
    if (!plan) return '¥0';
    
    const originalPrice = parseFloat(plan.price.replace('¥', ''));
    let discountedPrice = originalPrice;
    
    if (validatedCoupon.discountType === 'percentage') {
      discountedPrice = originalPrice * (1 - validatedCoupon.discountValue / 100);
    } else {
      discountedPrice = originalPrice - (validatedCoupon.discountValue / 100);
    }
    
    return `¥${Math.max(0, discountedPrice).toFixed(1)}`;
  };

  const handleSubscribe = (tier: 'basic' | 'pro') => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      window.location.href = getLoginUrl();
      return;
    }

    setSelectedPlan(tier);
    setShowPaymentDialog(true);
  };

  const currentTier = subscriptionInfo?.subscriptionTier || 'free';
  const subscriptionStatus = subscriptionInfo?.subscriptionStatus;
  const subscriptionEndDate = subscriptionInfo?.subscriptionEndDate;

  const isLoading = authLoading || subLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">订阅管理</h1>
            <p className="text-muted-foreground mt-1">
              选择适合您的订阅计划，解锁更多功能
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/subscription/history'}
          >
            <History className="mr-2 h-4 w-4" />
            查看历史
          </Button>
        </div>

        {/* Current Subscription Status */}
        {isAuthenticated && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle>当前订阅状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">订阅计划:</span>
                <Badge variant={currentTier === 'free' ? 'secondary' : 'default'}>
                  {PLANS.find(p => p.id === currentTier)?.name}
                </Badge>
              </div>
              {subscriptionStatus && subscriptionStatus !== 'active' && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">状态:</span>
                  <Badge variant="outline">
                    {subscriptionStatus === 'canceled' && '已取消'}
                    {subscriptionStatus === 'past_due' && '逾期'}
                    {subscriptionStatus === 'trialing' && '试用中'}
                  </Badge>
                </div>
              )}
              {subscriptionEndDate && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">到期时间:</span>
                  <span>{new Date(subscriptionEndDate).toLocaleDateString('zh-CN')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto px-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentTier === plan.id;
            const canUpgrade = 
              (currentTier === 'free' && plan.id !== 'free') ||
              (currentTier === 'basic' && plan.id === 'pro');

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular ? 'border-primary shadow-lg md:scale-105' : ''
                } ${isCurrentPlan ? 'border-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">最受欢迎</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <Badge className="bg-green-500">当前计划</Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-6 w-6" />
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {plan.id === 'free' ? (
                    <Button variant="outline" disabled className="w-full h-11 md:h-10">
                      免费使用
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button
                      onClick={() => handleSubscribe(plan.id as 'basic' | 'pro')}
                      disabled={!isAuthenticated}
                      variant="outline"
                      className="w-full h-11 md:h-10 text-base md:text-sm"
                    >
                      续费
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      onClick={() => handleSubscribe(plan.id as 'basic' | 'pro')}
                      disabled={!isAuthenticated}
                      className="w-full h-11 md:h-10 text-base md:text-sm"
                    >
                      {!isAuthenticated ? '登录后订阅' : '立即订阅'}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full h-11 md:h-10">
                      不可降级
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <Card className="max-w-4xl mx-auto mt-12 md:mt-16 px-4">
          <CardHeader>
            <CardTitle>常见问题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">如何订阅?</h4>
              <p className="text-sm text-muted-foreground">
                点击"立即订阅"按钮,使用支付宝或微信扫码支付,支付完成后联系客服开通。
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">可以随时取消吗?</h4>
              <p className="text-sm text-muted-foreground">
                可以,联系客服即可取消订阅,到期后自动降级为免费版。
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">支持哪些支付方式?</h4>
              <p className="text-sm text-muted-foreground">
                支持支付宝和微信支付。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              订阅 {PLANS.find(p => p.id === selectedPlan)?.name}
            </DialogTitle>
            <DialogDescription>
              请使用支付宝或微信扫码支付
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 优惠券输入 */}
            <div className="flex gap-2">
              <Input
                placeholder="输入优惠券码(可选)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />
              <Button
                variant="outline"
                onClick={handleValidateCoupon}
                disabled={!couponCode || validateCouponQuery.isFetching}
              >
                {validateCouponQuery.isFetching ? '验证中...' : '验证'}
              </Button>
            </div>
            
            {validatedCoupon && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✅ 优惠券有效！
                  {validatedCoupon.discountType === 'percentage' 
                    ? `享受 ${validatedCoupon.discountValue}% 折扣` 
                    : `减免 ¥${(validatedCoupon.discountValue / 100).toFixed(2)}`}
                </p>
              </div>
            )}
            
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {validatedCoupon ? (
                  <>
                    <span className="line-through text-muted-foreground text-xl mr-2">
                      {PLANS.find(p => p.id === selectedPlan)?.price}
                    </span>
                    {calculateDiscountedPrice()}
                  </>
                ) : (
                  PLANS.find(p => p.id === selectedPlan)?.price
                )}
                <span className="text-base font-normal text-muted-foreground">/月</span>
              </div>
            </div>

            {/* 支付宝收款码 */}
            <div className="bg-muted rounded-lg p-8 text-center">
              <img 
                src="/alipay-qrcode.jpg"
                alt="支付宝收款码"
                className="w-64 h-64 mx-auto rounded-lg shadow-lg"
              />
              <p className="text-sm text-muted-foreground mt-4">
                使用支付宝扫码支付
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <span className="font-medium text-foreground">1.</span>
                使用支付宝或微信扫描上方二维码
              </p>
              <p className="flex items-start gap-2">
                <span className="font-medium text-foreground">2.</span>
                完成支付后,请记录支付订单号
              </p>
              <p className="flex items-start gap-2">
                <span className="font-medium text-foreground">3.</span>
                联系客服提供订单号,我们将在24小时内为您开通
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  客服邮箱: p.harrywu@gmail.com
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">
                  客服电话: 8613138112934
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              className="w-full"
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
