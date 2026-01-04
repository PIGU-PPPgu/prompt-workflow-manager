import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Ban, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel, exportToCSV } from "@/lib/exportUtils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_CONFIG = {
  upgrade: {
    label: '升级',
    icon: ArrowUpRight,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  downgrade: {
    label: '降级',
    icon: ArrowDownRight,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  renew: {
    label: '续费',
    icon: RefreshCw,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  cancel: {
    label: '取消',
    icon: Ban,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  expire: {
    label: '过期',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
};

const TIER_NAMES: Record<string, string> = {
  free: '免费版',
  basic: '基础版',
  pro: '专业版',
};

export default function SubscriptionHistory() {
  const { data: history, isLoading } = trpc.subscription.history.useQuery();
  
  const handleExport = (format: 'excel' | 'csv') => {
    if (!history || history.length === 0) return;
    
    const exportData = history.map(record => ({
      '操作类型': ACTION_CONFIG[record.action as keyof typeof ACTION_CONFIG]?.label || record.action,
      '从': TIER_NAMES[record.fromTier || 'free'] || record.fromTier,
      '到': TIER_NAMES[record.toTier] || record.toTier,
      '备注': record.note || '',
      '操作时间': new Date(record.createdAt).toLocaleString('zh-CN'),
    }));
    
    const filename = `订阅历史_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`;
    
    if (format === 'excel') {
      exportToExcel(exportData, filename);
    } else {
      exportToCSV(exportData, filename);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">订阅历史</h1>
            <p className="text-muted-foreground mt-1">
              查看您的所有订阅操作记录
            </p>
          </div>
          {history && history.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  导出为 Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  导出为 CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>操作记录</CardTitle>
            <CardDescription>
              包括升级、续费、降级等所有订阅相关操作
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无订阅历史记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((record) => {
                  const config = ACTION_CONFIG[record.action as keyof typeof ACTION_CONFIG];
                  const Icon = config.icon;

                  return (
                    <div
                      key={record.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className={`p-2 rounded-full ${config.bgColor} shrink-0`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{config.label}</Badge>
                          {record.fromTier && (
                            <>
                              <span className="text-sm text-muted-foreground">
                                {TIER_NAMES[record.fromTier]}
                              </span>
                              <span className="text-muted-foreground">→</span>
                            </>
                          )}
                          <span className="text-sm font-medium">
                            {TIER_NAMES[record.toTier]}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                          {record.durationDays && (
                            <p>订阅时长: {record.durationDays}天</p>
                          )}
                          {record.amount && (
                            <p>金额: ¥{(record.amount / 100).toFixed(2)}</p>
                          )}
                          {record.paymentMethod && (
                            <p>支付方式: {record.paymentMethod}</p>
                          )}
                          {record.note && (
                            <p className="text-xs italic">{record.note}</p>
                          )}
                        </div>

                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
