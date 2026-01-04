import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { format } from "date-fns";
import { RefreshCw, Filter, Download, Eye } from "lucide-react";
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

const RESOURCE_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'prompt', label: '提示词' },
  { value: 'workflow', label: '工作流' },
  { value: 'agent', label: 'AI助教' },
  { value: 'scenario', label: '场景分类' },
  { value: 'user', label: '用户' },
  { value: 'subscription', label: '订阅' },
  { value: 'coupon', label: '优惠券' },
  { value: 'setting', label: '设置' },
];

const ACTION_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
];

export default function AdminAudit() {
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);

  const { data: logs, isLoading, refetch } = trpc.auditLogs.list.useQuery({
    limit,
    offset,
    resourceType: resourceFilter,
    action: actionFilter,
  });

  // 根据操作类型返回颜色
  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      case 'login': return 'outline';
      default: return 'secondary';
    }
  };

  // 根据资源类型返回标签
  const getResourceLabel = (type: string) => {
    return RESOURCE_TYPES.find(t => t.value === type)?.label || type;
  };

  // 导出为CSV
  const handleExport = () => {
    if (!logs || !logs.length) return;

    const csv = [
      ['时间', '用户ID', '操作', '资源类型', '资源ID', '详情'].join(','),
      ...logs.map(log => [
        format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        log.userId,
        log.action,
        log.resourceType,
        log.resourceId || '',
        JSON.stringify(log.details || {}).replace(/,/g, ';'),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">审计日志</h1>
            <p className="text-muted-foreground mt-1">查看系统所有操作记录</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">总操作数</div>
            <div className="text-2xl font-bold mt-2">{logs?.length || 0}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">创建操作</div>
            <div className="text-2xl font-bold mt-2 text-green-600">
              {logs?.filter(l => l.action === 'create').length || 0}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">更新操作</div>
            <div className="text-2xl font-bold mt-2 text-blue-600">
              {logs?.filter(l => l.action === 'update').length || 0}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">删除操作</div>
            <div className="text-2xl font-bold mt-2 text-destructive">
              {logs?.filter(l => l.action === 'delete').length || 0}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <div className="flex gap-4 flex-1">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">资源类型</label>
                <Select value={resourceFilter} onValueChange={setResourceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">操作类型</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(action => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* 日志表格 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>用户ID</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>资源类型</TableHead>
                <TableHead>资源ID</TableHead>
                <TableHead>详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : !logs || logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    暂无审计日志
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.createdAt), 'MM-dd HH:mm:ss')}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.userId}</TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getResourceLabel(log.resourceType)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.resourceId || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {JSON.stringify(log.details || {})}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 分页 */}
        {logs && logs.length >= limit && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              onClick={() => setOffset(offset + limit)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
