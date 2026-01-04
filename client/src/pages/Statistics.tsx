import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { TrendingUp, Activity, MessageSquare, BarChart3, Star, Crown, Users, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useMemo } from "react";
import { toast } from "sonner";

const COLORS = ['#000000', '#404040', '#737373', '#a3a3a3', '#d4d4d4'];

export default function Statistics() {
  const { data: promptStats, isLoading: promptLoading } = trpc.statistics.promptUsage.useQuery();
  const { data: workflowStats, isLoading: workflowLoading } = trpc.statistics.workflowUsage.useQuery();
  const { data: agentStats, isLoading: agentLoading } = trpc.statistics.agentUsage.useQuery();
  const { data: prompts } = trpc.prompts.list.useQuery();
  const { data: subscriptionStats } = trpc.statistics.subscriptionStats.useQuery();

  // 提示词使用次数趋势数据
  const usageTrendData = useMemo(() => {
    if (!prompts) return [];
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });
    
    return last7Days.map(date => {
      const count = prompts.filter(p => {
        if (!p.lastUsedAt) return false;
        const usedDate = new Date(p.lastUsedAt).toISOString().split('T')[0];
        return usedDate === date;
      }).length;
      
      return {
        date: new Date(date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
        count,
      };
    });
  }, [prompts]);

  // 热门分类分布数据
  const categoryDistributionData = useMemo(() => {
    if (!prompts) return [];
    
    const categoryCounts: Record<string, number> = {};
    prompts.forEach(p => {
      const category = p.customMark || '未标记';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    return Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [prompts]);

  // 评分分布数据
  const scoreDistributionData = useMemo(() => {
    if (!prompts) return [];
    
    const ranges = [
      { name: '0-20', min: 0, max: 20, count: 0 },
      { name: '21-40', min: 21, max: 40, count: 0 },
      { name: '41-60', min: 41, max: 60, count: 0 },
      { name: '61-80', min: 61, max: 80, count: 0 },
      { name: '81-100', min: 81, max: 100, count: 0 },
    ];
    
    prompts.forEach(p => {
      const score = p.score || 0;
      const range = ranges.find(r => score >= r.min && score <= r.max);
      if (range) range.count++;
    });
    
    return ranges;
  }, [prompts]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">使用统计</h1>
          <p className="text-muted-foreground mt-1">
            查看提示词、工作流和智能体的使用情况和数据分析
          </p>
        </div>

        {/* 订阅概览 */}
        {subscriptionStats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总用户数</p>
                  <p className="text-2xl font-bold mt-1">{subscriptionStats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">付费用户</p>
                  <p className="text-2xl font-bold mt-1">{subscriptionStats.paidUsers}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    转化率: {subscriptionStats.conversionRate}%
                  </p>
                </div>
                <Crown className="h-8 w-8 text-primary" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">MRR(月度收入)</p>
                  <p className="text-2xl font-bold mt-1">￥{subscriptionStats.mrr.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">专业版用户</p>
                  <p className="text-2xl font-bold mt-1">{subscriptionStats.proUsers}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    基础版: {subscriptionStats.basicUsers}
                  </p>
                </div>
                <Crown className="h-8 w-8 text-amber-500" />
              </div>
            </Card>
          </div>
        )}

        {/* 热门提示词TOP10排行榜 */}
        <TopPromptsRanking />

        {/* 概览卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">提示词总数</p>
                <p className="text-2xl font-bold mt-1">{prompts?.length || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">工作流总数</p>
                <p className="text-2xl font-bold mt-1">{workflowStats?.length || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">智能体总数</p>
                <p className="text-2xl font-bold mt-1">{agentStats?.length || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* 使用次数趋势图 */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">最近7天使用趋势</h2>
          </div>
          {promptLoading ? (
            <p className="text-muted-foreground">加载中...</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" stroke="#737373" />
                <YAxis stroke="#737373" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e5e5',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Line type="monotone" dataKey="count" stroke="#000000" strokeWidth={2} name="使用次数" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 评分分布和分类分布 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 评分分布 */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5" />
              <h2 className="text-lg font-semibold">提示词评分分布</h2>
            </div>
            {promptLoading ? (
              <p className="text-muted-foreground">加载中...</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="name" stroke="#737373" />
                  <YAxis stroke="#737373" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e5e5',
                      borderRadius: '0.5rem'
                    }} 
                  />
                  <Bar dataKey="count" fill="#000000" name="数量" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* 分类分布 */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="h-5 w-5" />
              <h2 className="text-lg font-semibold">热门标记分布</h2>
            </div>
            {promptLoading ? (
              <p className="text-muted-foreground">加载中...</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e5e5',
                      borderRadius: '0.5rem'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* 提示词使用统计表格 */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5" />
            <h2 className="text-lg font-semibold">最近创建的提示词</h2>
          </div>
          {promptLoading ? (
            <p className="text-muted-foreground">加载中...</p>
          ) : promptStats && promptStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4 font-medium">标题</th>
                    <th className="text-left py-2 px-4 font-medium">评分</th>
                    <th className="text-left py-2 px-4 font-medium">使用次数</th>
                    <th className="text-left py-2 px-4 font-medium">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {promptStats.map((stat: any) => (
                    <tr key={stat.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{stat.title}</td>
                      <td className="py-3 px-4">{stat.score || "-"}</td>
                      <td className="py-3 px-4">{stat.useCount || 0}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(stat.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">暂无数据</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

// 热门提示词TOP10排行榜组件
function TopPromptsRanking() {
  const { data: topPrompts } = trpc.prompts.topUsed.useQuery({ limit: 10 });
  const toggleFavoriteMutation = trpc.prompts.toggleFavorite.useMutation({
    onSuccess: () => {
      toast.success('收藏状态已更新');
    },
  });
  const utils = trpc.useUtils();

  const handleToggleFavorite = (id: number) => {
    toggleFavoriteMutation.mutate({ id }, {
      onSuccess: () => {
        utils.prompts.topUsed.invalidate();
      },
    });
  };

  if (!topPrompts || topPrompts.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">热门提示词 TOP 10</h2>
      </div>
      <div className="space-y-2">
        {topPrompts.map((prompt: any, index: number) => (
          <div
            key={prompt.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-foreground transition-colors group"
          >
            {/* 排名 */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
              {index + 1}
            </div>

            {/* 提示词信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <a
                  href={`/prompts/${prompt.id}`}
                  className="font-medium hover:underline truncate"
                >
                  {prompt.title}
                </a>
                {prompt.isFavorite && (
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {prompt.description || prompt.content}
              </p>
            </div>

            {/* 使用次数 */}
            <div className="text-right">
              <p className="text-sm font-medium">{prompt.useCount || 0} 次</p>
              <p className="text-xs text-muted-foreground">
                {prompt.lastUsedAt ? new Date(prompt.lastUsedAt).toLocaleDateString() : '未使用'}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleToggleFavorite(prompt.id)}
                className="p-2 rounded hover:bg-muted transition-colors"
                title={prompt.isFavorite ? '取消收藏' : '收藏'}
              >
                <Star className={`h-4 w-4 ${prompt.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
              </button>
              <a
                href={`/prompts/${prompt.id}`}
                className="p-2 rounded hover:bg-muted transition-colors"
                title="查看详情"
              >
                <Activity className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
