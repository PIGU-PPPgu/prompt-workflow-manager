import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { APP_TITLE, getLoginUrl } from "@/const";
import { 
  Workflow, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  LayoutTemplate, 
  Search, 
  Plus, 
  Library,
  FileText,
  Bot,
  BarChart3,
  History
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn, parseTags } from "@/lib/utils";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import Landing from "./Landing";

// --- Hero Section ---
const HeroSection = ({ userName }: { userName?: string }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white shadow-xl mb-10">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      
      <div className="relative z-10 px-8 py-12 md:py-16 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-2xl">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm mb-2">
            <Sparkles className="w-3 h-3 mr-2" />
            教育行业提示词存储与采集库
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            欢迎回来，{userName} 老师
          </h1>
          <p className="text-lg text-indigo-100 max-w-lg leading-relaxed">
            这里是您的专属 AI 教学资产库。您可以存储优质指令、构建备课工作流、配置学科助教，并与全网教师共享教育智慧。
          </p>
          
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/prompts">
              <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 border-none shadow-lg">
                <Library className="w-4 h-4 mr-2" />
                浏览指令库
              </Button>
            </Link>
            <Link href="/optimizer">
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                优化提示词
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Quick Stats / Visual Decoration */}
        <div className="hidden md:block">
           <div className="grid grid-cols-2 gap-3 opacity-90">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-center min-w-[120px]">
                <div className="text-3xl font-bold mb-1">∞</div>
                <div className="text-xs text-indigo-100">云端存储</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-center min-w-[120px]">
                <div className="text-3xl font-bold mb-1">AI</div>
                <div className="text-xs text-indigo-100">智能优化</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-center min-w-[120px]">
                <div className="text-3xl font-bold mb-1">10+</div>
                <div className="text-xs text-indigo-100">学科场景</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-center min-w-[120px]">
                <div className="text-3xl font-bold mb-1">Pro</div>
                <div className="text-xs text-indigo-100">专业工具</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Quick Search Bar ---
const QuickSearch = () => {
  const [, setLocation] = useLocation();
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // 简单的跳转到列表页，实际可以带参数
      setLocation('/prompts');
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto -mt-16 mb-12 z-20 px-4">
      <div className="bg-background rounded-full shadow-xl border border-border/50 flex items-center p-2 pl-6 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
        <Search className="h-5 w-5 text-muted-foreground mr-3" />
        <Input 
          type="text" 
          placeholder="搜索教学指令、工作流或教案模板..." 
          className="border-none shadow-none focus-visible:ring-0 text-base h-10 bg-transparent"
          onKeyDown={handleKeyDown}
        />
        <div className="hidden md:flex items-center gap-1 pr-2">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
        </div>
        <Button className="rounded-full ml-2 px-6">搜索</Button>
      </div>
    </div>
  );
};

// --- Main Feature Cards ---
const FeatureGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      <Link href="/prompts">
        <Card className="h-full hover:shadow-lg transition-all hover:border-indigo-500/50 cursor-pointer group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen className="w-24 h-24 text-indigo-600 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <CardHeader className="pb-2">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Library className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl">教学指令库</CardTitle>
            <CardDescription>Prompt Library</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              集中管理您的教学提示词。支持按学科、年级、场景分类，一键调用 AI 生成教案。
            </p>
          </CardContent>
          <CardFooter className="pt-0 text-indigo-600 text-sm font-medium flex items-center">
            进入库 <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </CardFooter>
        </Card>
      </Link>

      <Link href="/workflows">
        <Card className="h-full hover:shadow-lg transition-all hover:border-purple-500/50 cursor-pointer group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Workflow className="w-24 h-24 text-purple-600 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <CardHeader className="pb-2">
            <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Workflow className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl">备课工作流</CardTitle>
            <CardDescription>Automation Flows</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              将复杂的备课任务自动化。串联多个 AI 步骤，自动生成课件大纲、习题和评估标准。
            </p>
          </CardContent>
          <CardFooter className="pt-0 text-purple-600 text-sm font-medium flex items-center">
            创建工作流 <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </CardFooter>
        </Card>
      </Link>

      <Link href="/agents">
        <Card className="h-full hover:shadow-lg transition-all hover:border-blue-500/50 cursor-pointer group relative overflow-hidden">
           <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Bot className="w-24 h-24 text-blue-600 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <CardHeader className="pb-2">
            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl">AI 学科助教</CardTitle>
            <CardDescription>AI Tutors</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              配置专属的 AI 智能体。无论是英语口语陪练还是数学解题助手，都能轻松构建。
            </p>
          </CardContent>
          <CardFooter className="pt-0 text-blue-600 text-sm font-medium flex items-center">
            配置助教 <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </CardFooter>
        </Card>
      </Link>

      <Link href="/template-marketplace">
        <Card className="h-full hover:shadow-lg transition-all hover:border-amber-500/50 cursor-pointer group relative overflow-hidden">
           <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <LayoutTemplate className="w-24 h-24 text-amber-600 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <CardHeader className="pb-2">
            <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl">场景市场</CardTitle>
            <CardDescription>Marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              探索同行分享的优质教学场景。发现、复制并改编来自全网的优秀教育 Prompt 模板。
            </p>
          </CardContent>
          <CardFooter className="pt-0 text-amber-600 text-sm font-medium flex items-center">
            探索市场 <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </CardFooter>
        </Card>
      </Link>
    </div>
  );
};

// --- Smart Recommendations ---
function RecommendationSection() {
  const { user, isAuthenticated } = useAuth();
  const { data: topUsed } = trpc.prompts.topUsed.useQuery(
    { limit: 3 },
    { enabled: isAuthenticated && !!user }
  );
  const { data: recentlyUsed } = trpc.prompts.recentlyUsed.useQuery(
    { limit: 3 },
    { enabled: isAuthenticated && !!user }
  );

  if ((!topUsed || topUsed.length === 0) && (!recentlyUsed || recentlyUsed.length === 0)) {
    return (
       <div className="mb-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
             <Plus className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">开始您的 AI 教学之旅</h3>
          <p className="text-sm text-slate-500 mb-4">您还没有创建任何指令。立即创建一个，体验 AI 的效率。</p>
          <Link href="/prompts">
            <Button>创建第一个指令</Button>
          </Link>
       </div>
    );
  }

  return (
    <div className="space-y-8 mb-12">
      {/* 最近使用 */}
      {recentlyUsed && recentlyUsed.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-md">
                  <History className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">最近访问</h3>
             </div>
             <Link href="/prompts">
               <Button variant="ghost" size="sm" className="text-muted-foreground">查看全部</Button>
             </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentlyUsed.map((prompt: any) => (
              <Link key={prompt.id} href={`/prompts/${prompt.id}`}>
                <Card className="h-full hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold line-clamp-1 text-base">{prompt.title}</h4>
                      {prompt.subject && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 whitespace-nowrap">
                          {prompt.subject}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                     <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
                        {prompt.description || "暂无描述"}
                     </p>
                  </CardContent>
                  <CardFooter className="p-4 pt-2 flex items-center justify-between text-xs text-muted-foreground border-t bg-slate-50/50">
                    <span>
                      {prompt.lastUsedAt ? new Date(prompt.lastUsedAt).toLocaleDateString() : '刚刚'}
                    </span>
                    <span className="flex items-center">
                       打开 <ArrowRight className="w-3 h-3 ml-1" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 常用指令 */}
      {topUsed && topUsed.length > 0 && (
        <div>
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded-md">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">高频指令</h3>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topUsed.map((prompt: any) => (
              <Link key={prompt.id} href={`/prompts/${prompt.id}`}>
                <Card className="h-full hover:shadow-md transition-all cursor-pointer border-l-4 border-l-amber-500">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                       <h4 className="font-semibold line-clamp-1 text-base">{prompt.title}</h4>
                       <Badge variant="secondary" className="text-[10px] px-1 h-5">Top</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                     <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
                        {prompt.description || prompt.content.slice(0, 50)}
                     </p>
                  </CardContent>
                  <CardFooter className="p-4 pt-2 flex items-center justify-between text-xs text-muted-foreground border-t bg-slate-50/50">
                    <span>使用 {prompt.useCount || 0} 次</span>
                    <div className="flex gap-1">
                      {parseTags(prompt.tags).slice(0, 2).map((tag: string, i: number) => (
                        <span key={i} className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px]">{tag}</span>
                      ))}
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Page Component ---
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm font-medium">加载教育资产库...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <DashboardLayout>
      <div className="pb-20 md:pb-8 bg-slate-50/50 min-h-full">
        <div className="container max-w-7xl mx-auto py-6 px-4 md:px-6">
          
          <HeroSection userName={user?.name || "老师"} />
          
          <QuickSearch />

          <FeatureGrid />

          <RecommendationSection />
          
        </div>
        <MobileBottomNav />
      </div>
    </DashboardLayout>
  );
}

// 移动端底部导航栏组件 (保持不变)
function MobileBottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/prompts", icon: BookOpen, label: "指令" },
    { href: "/workflows", icon: Workflow, label: "备课" },
    { href: "/", icon: Sparkles, label: "首页" },
    { href: "/agents", icon: GraduationCap, label: "助教" },
    { href: "/statistics", icon: BarChart3, label: "统计" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-lg transition-colors min-w-[64px]",
                  isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "fill-current/20")} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}