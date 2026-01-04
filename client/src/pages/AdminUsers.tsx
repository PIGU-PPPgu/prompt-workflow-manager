import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import { Crown, Loader2, Shield, History, Download } from "lucide-react";
import { exportToExcel, exportToCSV } from "@/lib/exportUtils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function AdminUsers() {
  const { user } = useAuth();
  const { data: users, isLoading, refetch } = trpc.subscription.listAllUsers.useQuery();
  const upgradeMutation = trpc.subscription.upgradeUser.useMutation();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [newTier, setNewTier] = useState<'free' | 'basic' | 'pro'>('basic');
  const [durationDays, setDurationDays] = useState('30');
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedUserHistory, setSelectedUserHistory] = useState<any>(null);
  
  const { data: allHistory } = trpc.subscription.allHistory.useQuery();
  
  const handleExport = (format: 'excel' | 'csv') => {
    if (!users || users.length === 0) return;
    
    const exportData = users.map(u => ({
      'ID': u.id,
      '用户名': u.name || '',
      '邮箱': u.email || '',
      '订阅等级': u.subscriptionTier === 'free' ? '免费版' : u.subscriptionTier === 'basic' ? '基础版' : '专业版',
      '订阅状态': u.subscriptionStatus || 'inactive',
      '到期时间': u.subscriptionEndDate ? new Date(u.subscriptionEndDate).toLocaleDateString('zh-CN') : '',
      '注册时间': new Date(u.createdAt).toLocaleDateString('zh-CN'),
      '最后登录': new Date(u.lastSignedIn).toLocaleDateString('zh-CN'),
    }));
    
    const filename = `用户列表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`;
    
    if (format === 'excel') {
      exportToExcel(exportData, filename);
    } else {
      exportToCSV(exportData, filename);
    }
  };
  
  const handleViewHistory = (userId: number) => {
    const userHistory = allHistory?.filter(h => h.userId === userId) || [];
    setSelectedUserHistory(userHistory);
    setShowHistoryDialog(true);
  };

  // 检查是否是管理员
  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>无权限访问</CardTitle>
            <CardDescription>此页面仅限管理员访问</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  const handleUpgrade = async () => {
    if (!selectedUser) return;

    try {
      await upgradeMutation.mutateAsync({
        userId: selectedUser.id,
        tier: newTier,
        durationDays: newTier === 'free' ? undefined : parseInt(durationDays),
      });

      toast.success('订阅已更新');
      setShowUpgradeDialog(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    }
  };

  const getTierBadge = (tier: string) => {
    const variants: Record<string, any> = {
      free: 'secondary',
      basic: 'default',
      pro: 'default',
    };
    const colors: Record<string, string> = {
      free: '',
      basic: 'bg-blue-500',
      pro: 'bg-purple-500',
    };
    return (
      <Badge variant={variants[tier]} className={colors[tier]}>
        {tier === 'free' && '免费版'}
        {tier === 'basic' && '基础版'}
        {tier === 'pro' && '专业版'}
      </Badge>
    );
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const variants: Record<string, any> = {
      active: 'default',
      canceled: 'secondary',
      past_due: 'destructive',
      trialing: 'outline',
    };
    return (
      <Badge variant={variants[status]}>
        {status === 'active' && '正常'}
        {status === 'canceled' && '已取消'}
        {status === 'past_due' && '逾期'}
        {status === 'trialing' && '试用中'}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8" />
              用户管理
            </h1>
            <p className="text-muted-foreground mt-1">
              管理所有用户的订阅状态
            </p>
          </div>
          {users && users.length > 0 && (
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
            <CardTitle>用户列表</CardTitle>
            <CardDescription>
              共 {users?.length || 0} 个用户
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>订阅计划</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>到期时间</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.name || '未设置'}
                        </TableCell>
                        <TableCell>{u.email || '-'}</TableCell>
                        <TableCell>
                          {u.role === 'admin' ? (
                            <Badge variant="destructive">
                              <Crown className="h-3 w-3 mr-1" />
                              管理员
                            </Badge>
                          ) : (
                            <Badge variant="outline">用户</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getTierBadge(u.subscriptionTier)}</TableCell>
                        <TableCell>{getStatusBadge(u.subscriptionStatus)}</TableCell>
                        <TableCell>
                          {u.subscriptionEndDate
                            ? new Date(u.subscriptionEndDate).toLocaleDateString('zh-CN')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(u);
                                setNewTier(u.subscriptionTier);
                                setShowUpgradeDialog(true);
                              }}
                            >
                              管理订阅
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewHistory(u.id)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>管理用户订阅</DialogTitle>
            <DialogDescription>
              为用户 {selectedUser?.name || selectedUser?.email} 设置订阅
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>订阅计划</Label>
              <Select value={newTier} onValueChange={(v: any) => setNewTier(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">免费版</SelectItem>
                  <SelectItem value="basic">基础版 (¥9.9/月)</SelectItem>
                  <SelectItem value="pro">专业版 (¥19.9/月)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newTier !== 'free' && (
              <div className="space-y-2">
                <Label>订阅时长(天)</Label>
                <Input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">
                  留空表示永久有效
                </p>
              </div>
            )}

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">预览:</p>
              <p className="text-muted-foreground">
                将为用户开通
                <span className="font-medium text-foreground mx-1">
                  {newTier === 'free' && '免费版'}
                  {newTier === 'basic' && '基础版'}
                  {newTier === 'pro' && '专业版'}
                </span>
                {newTier !== 'free' && durationDays && (
                  <>
                    ,有效期
                    <span className="font-medium text-foreground mx-1">
                      {durationDays}天
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={upgradeMutation.isPending}
            >
              {upgradeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              确认更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>订阅历史记录</DialogTitle>
            <DialogDescription>
              查看该用户的所有订阅操作记录
            </DialogDescription>
          </DialogHeader>
          
          {selectedUserHistory && selectedUserHistory.length > 0 ? (
            <div className="space-y-4">
              {selectedUserHistory.map((record: any) => (
                <Card key={record.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge>
                            {record.action === 'upgrade' && '升级'}
                            {record.action === 'downgrade' && '降级'}
                            {record.action === 'renew' && '续费'}
                            {record.action === 'cancel' && '取消'}
                            {record.action === 'expire' && '到期'}
                          </Badge>
                          <span className="text-sm font-medium">
                            {record.fromTier} → {record.toTier}
                          </span>
                        </div>
                        {record.note && (
                          <p className="text-sm text-muted-foreground">{record.note}</p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无订阅历史记录
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
