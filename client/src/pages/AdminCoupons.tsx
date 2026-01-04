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
import { Ticket, Plus, Trash2, Loader2 } from "lucide-react";

export default function AdminCoupons() {
  const { user } = useAuth();
  const { data: coupons, isLoading, refetch } = trpc.coupons.list.useQuery();
  const createMutation = trpc.coupons.create.useMutation();
  const deleteMutation = trpc.coupons.delete.useMutation();
  const updateMutation = trpc.coupons.update.useMutation();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    tier: '' as '' | 'basic' | 'pro',
    maxUses: '',
    expiresAt: '',
  });

  // 检查是否是管理员
  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">无权限访问此页面</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        code: formData.code,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        tier: formData.tier || undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
      });
      
      toast.success('优惠券创建成功');
      setShowCreateDialog(false);
      setFormData({
        code: '',
        discountType: 'percentage',
        discountValue: 10,
        tier: '',
        maxUses: '',
        expiresAt: '',
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个优惠券吗?')) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success('优惠券已删除');
      refetch();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, isActive: !isActive });
      toast.success(isActive ? '优惠券已停用' : '优惠券已启用');
      refetch();
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Ticket className="h-8 w-8" />
              优惠券管理
            </h1>
            <p className="text-muted-foreground mt-1">
              创建和管理订阅优惠券
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建优惠券
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>优惠券列表</CardTitle>
            <CardDescription>
              共 {coupons?.length || 0} 个优惠券
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
                      <TableHead>优惠券码</TableHead>
                      <TableHead>折扣</TableHead>
                      <TableHead>适用计划</TableHead>
                      <TableHead>使用情况</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>过期时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons?.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-medium">
                          {coupon.code}
                        </TableCell>
                        <TableCell>
                          {coupon.discountType === 'percentage' 
                            ? `${coupon.discountValue}%` 
                            : `¥${(coupon.discountValue / 100).toFixed(2)}`}
                        </TableCell>
                        <TableCell>
                          {coupon.tier ? (
                            <Badge variant="outline">
                              {coupon.tier === 'basic' ? '基础版' : '专业版'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">全部</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {coupon.usedCount} / {coupon.maxUses || '∞'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={coupon.isActive ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive(coupon.id, coupon.isActive)}
                          >
                            {coupon.isActive ? '启用' : '停用'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {coupon.expiresAt 
                            ? new Date(coupon.expiresAt).toLocaleDateString('zh-CN')
                            : '永久有效'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建优惠券</DialogTitle>
            <DialogDescription>
              创建新的订阅优惠券
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="code">优惠券码</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="例如: SUMMER2024"
              />
            </div>

            <div>
              <Label htmlFor="discountType">折扣类型</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: 'percentage' | 'fixed') => 
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">百分比折扣</SelectItem>
                  <SelectItem value="fixed">固定金额</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discountValue">
                {formData.discountType === 'percentage' ? '折扣百分比 (1-100)' : '折扣金额 (元)'}
              </Label>
              <Input
                id="discountValue"
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="tier">适用计划</Label>
              <Select
                value={formData.tier}
                onValueChange={(value: '' | 'basic' | 'pro') => 
                  setFormData({ ...formData, tier: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部计划" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部计划</SelectItem>
                  <SelectItem value="basic">基础版</SelectItem>
                  <SelectItem value="pro">专业版</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="maxUses">最大使用次数 (留空表示无限制)</Label>
              <Input
                id="maxUses"
                type="number"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                placeholder="无限制"
              />
            </div>

            <div>
              <Label htmlFor="expiresAt">过期时间 (留空表示永久有效)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.code || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
