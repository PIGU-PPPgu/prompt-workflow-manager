import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, Edit2, X, Settings as SettingsIcon } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminSettings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    type: 'string' as 'string' | 'number' | 'boolean' | 'json',
    isPublic: false,
  });

  const { data: settings, isLoading, refetch } = trpc.siteSettings.list.useQuery();
  const utils = trpc.useUtils();

  const setMutation = trpc.siteSettings.set.useMutation({
    onSuccess: () => {
      toast.success(editingKey ? '设置更新成功' : '设置创建成功');
      setDialogOpen(false);
      resetForm();
      utils.siteSettings.list.invalidate();
    },
    onError: (error) => {
      toast.error('操作失败: ' + error.message);
    },
  });

  const deleteMutation = trpc.siteSettings.delete.useMutation({
    onSuccess: () => {
      toast.success('设置删除成功');
      utils.siteSettings.list.invalidate();
    },
    onError: (error) => {
      toast.error('删除失败: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      key: '',
      value: '',
      description: '',
      type: 'string',
      isPublic: false,
    });
    setEditingKey(null);
  };

  const handleEdit = (setting: any) => {
    setFormData({
      key: setting.key,
      value: setting.value,
      description: setting.description || '',
      type: setting.type,
      isPublic: setting.isPublic,
    });
    setEditingKey(setting.key);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.key || !formData.value) {
      toast.error('键和值不能为空');
      return;
    }

    setMutation.mutate(formData);
  };

  const handleDelete = (key: string) => {
    if (confirm(`确认删除设置 "${key}"？`)) {
      deleteMutation.mutate({ key });
    }
  };

  // 根据类型返回颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'default';
      case 'number': return 'secondary';
      case 'boolean': return 'outline';
      case 'json': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">全局设置</h1>
            <p className="text-muted-foreground mt-1">管理系统全局配置参数</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加设置
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">总设置项</div>
            <div className="text-2xl font-bold mt-2">{settings?.length || 0}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">公开设置</div>
            <div className="text-2xl font-bold mt-2 text-green-600">
              {settings?.filter(s => s.isPublic).length || 0}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">私有设置</div>
            <div className="text-2xl font-bold mt-2 text-blue-600">
              {settings?.filter(s => !s.isPublic).length || 0}
            </div>
          </Card>
        </div>

        {/* 设置表格 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>键</TableHead>
                <TableHead>值</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>可见性</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : !settings || settings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    暂无设置项
                  </TableCell>
                </TableRow>
              ) : (
                settings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {setting.key}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-sm">{setting.value}</div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate text-sm text-muted-foreground">
                        {setting.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeColor(setting.type)}>
                        {setting.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {setting.isPublic ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          公开
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          私有
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(setting)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(setting.key)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingKey ? '编辑设置' : '添加设置'}
              </DialogTitle>
              <DialogDescription>
                {editingKey ? '修改现有设置项' : '创建新的全局设置项'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>键 (Key)</Label>
                <Input
                  placeholder="例如: site_title, max_upload_size"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  disabled={!!editingKey}
                />
                <p className="text-xs text-muted-foreground">
                  唯一标识符，创建后不可修改
                </p>
              </div>

              <div className="space-y-2">
                <Label>值 (Value)</Label>
                {formData.type === 'json' ? (
                  <Textarea
                    placeholder='{"key": "value"}'
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    rows={5}
                    className="font-mono text-sm"
                  />
                ) : (
                  <Input
                    placeholder="设置值"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  placeholder="设置项的说明（可选）"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>数据类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">字符串</SelectItem>
                      <SelectItem value="number">数字</SelectItem>
                      <SelectItem value="boolean">布尔值</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>可见性</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                    />
                    <Label className="text-sm font-normal">
                      {formData.isPublic ? '公开（前端可读取）' : '私有（仅管理员）'}
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={setMutation.isPending}>
                {setMutation.isPending ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
