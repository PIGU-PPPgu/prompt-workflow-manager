import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Workflow, ArrowRight, Sparkles, BookOpen, GraduationCap, LayoutTemplate, Database, Network, Cpu, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn, parseTags } from "@/lib/utils";
import { motion } from "framer-motion";

// --- 1. 精密点阵背景 (Dot Pattern) ---
const DotBackground = () => {
  return (
    <div className="absolute inset-0 h-full w-full bg-slate-950 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none select-none" />
  );
};

// --- 2. 边框发光容器 (Glowing Border Container) ---
const GlowingCard = ({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: delay * 0.1 }}
    className={cn(
      "relative rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden group hover:border-slate-700 transition-colors",
      className
    )}
  >
    {/* 悬停光照效果 */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(600px_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(99,102,241,0.1),transparent_40%)] pointer-events-none" />
    <div className="relative z-10 h-full p-6 flex flex-col">
      {children}
    </div>
  </motion.div>
);

// --- 主页面组件 ---
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-indigo-500 font-medium font-mono">
        INITIALIZING REPOSITORY...
      </div>
    );
  }

  // --- 登录后视图 (保持不变) ---
  if (isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="pb-20 md:pb-0">
          <div className="container py-8 md:py-16">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8 md:mb-12">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3 md:mb-4">
                  欢迎回来, {user?.name} 老师
                </h1>
                <p className="text-base md:text-lg text-muted-foreground">
                  准备好管理您的教学资产了吗？
                </p>
              </div>
              
              <RecommendationSection />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <Link href="/prompts" className="block border border-border rounded-lg p-5 md:p-6 hover:border-primary/50 hover:shadow-md transition-all group bg-card">
                  <BookOpen className="h-7 w-7 md:h-8 md:w-8 mb-3 md:mb-4 text-primary group-hover:scale-110 transition-transform" />
                  <h2 className="text-lg md:text-xl font-medium mb-2">教学指令库</h2>
                  <p className="text-sm text-muted-foreground mb-3 md:mb-4">
                    创建和管理教学常用的AI指令
                  </p>
                  <div className="flex items-center text-sm font-medium text-primary">
                    开始使用
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                <Link href="/workflows" className="block border border-border rounded-lg p-5 md:p-6 hover:border-primary/50 hover:shadow-md transition-all group bg-card">
                  <Workflow className="h-7 w-7 md:h-8 md:w-8 mb-3 md:mb-4 text-primary group-hover:scale-110 transition-transform" />
                  <h2 className="text-lg md:text-xl font-medium mb-2">备课工作流</h2>
                  <p className="text-sm text-muted-foreground mb-3 md:mb-4">
                    自动生成教案、课件和练习题
                  </p>
                  <div className="flex items-center text-sm font-medium text-primary">
                    开始使用
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                <Link href="/agents" className="block border border-border rounded-lg p-5 md:p-6 hover:border-primary/50 hover:shadow-md transition-all group bg-card">
                  <GraduationCap className="h-7 w-7 md:h-8 md:w-8 mb-3 md:mb-4 text-primary group-hover:scale-110 transition-transform" />
                  <h2 className="text-lg md:text-xl font-medium mb-2">AI 助教</h2>
                  <p className="text-sm text-muted-foreground mb-3 md:mb-4">
                    配置专属的学科辅导助手
                  </p>
                  <div className="flex items-center text-sm font-medium text-primary">
                    开始使用
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                <Link href="/template-marketplace" className="block border border-border rounded-lg p-5 md:p-6 hover:border-primary/50 hover:shadow-md transition-all group bg-card">
                  <LayoutTemplate className="h-7 w-7 md:h-8 md:w-8 mb-3 md:mb-4 text-primary group-hover:scale-110 transition-transform" />
                  <h2 className="text-lg md:text-xl font-medium mb-2">教研场景</h2>
                  <p className="text-sm text-muted-foreground mb-3 md:mb-4">
                    浏览优质的教学场景模板
                  </p>
                  <div className="flex items-center text-sm font-medium text-primary">
                    开始使用
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
          <MobileBottomNav />
        </div>
      </DashboardLayout>
    );
  }

  // --- 未登录：Bento Grid Repository Theme ---
  return (
    <div className="relative min-h-screen bg-slate-950 font-sans selection:bg-indigo-500/30 text-slate-200 overflow-x-hidden">
      <DotBackground />
      
      {/* 顶部光晕 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">{APP_TITLE}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={getLoginUrl()} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              访问系统
            </a>
            <Button asChild size="sm" className="bg-white text-black hover:bg-slate-200 font-medium">
              <a href={getLoginUrl()}>登录</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 pt-32 pb-24 relative z-10">
        
        {/* Hero Header */}
        <div className="max-w-3xl mx-auto text-center mb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6"
          >
            您的 AI 教学<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              智能中心
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto"
          >
            教学 AI 工作流的统一操作系统。存储指令、编排智能助手、部署教学场景，一站式管理您的教学资产。
          </motion.p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
          
          {/* Card 1: Prompt Library (Large, spans 2 cols) */}
          <GlowingCard className="md:col-span-2 md:row-span-2 min-h-[300px]" delay={1}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded bg-blue-500/10 text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">教学指令库</h3>
                <p className="text-sm text-slate-500">版本化指令管理</p>
              </div>
            </div>
            <div className="flex-1 bg-slate-950/50 rounded-lg border border-slate-800 p-4 font-mono text-xs text-slate-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-8 bg-slate-900 border-b border-slate-800 flex items-center px-3 gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
              </div>
              <div className="mt-6 space-y-2">
                <p><span className="text-purple-400">const</span> <span className="text-blue-400">lessonPlan</span> = <span className="text-green-400">await</span> ai.generate({`{`}</p>
                <p className="pl-4"><span className="text-sky-400">role</span>: <span className="text-orange-300">"Physics Teacher"</span>,</p>
                <p className="pl-4"><span className="text-sky-400">topic</span>: <span className="text-orange-300">"Quantum Mechanics"</span>,</p>
                <p className="pl-4"><span className="text-sky-400">level</span>: <span className="text-orange-300">"High School"</span></p>
                <p>{`}`});</p>
                <p className="text-slate-600 animate-pulse">_</p>
              </div>
            </div>
          </GlowingCard>

          {/* Card 2: Agents (Tall) */}
          <GlowingCard className="md:row-span-2 min-h-[300px]" delay={2}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded bg-purple-500/10 text-purple-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">智能助教</h3>
                <p className="text-sm text-slate-500">自主学习辅导</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent rounded-full blur-2xl" />
              <div className="relative z-10 w-24 h-24 rounded-full border border-purple-500/30 flex items-center justify-center bg-purple-500/5 backdrop-blur-md">
                <GraduationCap className="w-10 h-10 text-purple-400" />
                {/* Orbiting dots */}
                <div className="absolute w-full h-full animate-spin-slow border border-dashed border-purple-500/20 rounded-full" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/50 p-2 rounded">
                <span>数学助教</span>
                <span className="text-green-400">在线</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/50 p-2 rounded">
                <span>作文批改</span>
                <span className="text-green-400">运行中</span>
              </div>
            </div>
          </GlowingCard>

          {/* Card 3: Workflows (Wide) */}
          <GlowingCard className="md:col-span-2" delay={3}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded bg-cyan-500/10 text-cyan-400">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">逻辑工作流</h3>
              </div>
            </div>
            <div className="h-16 flex items-center gap-2 overflow-hidden opacity-70">
              <div className="h-1 w-full bg-gradient-to-r from-slate-800 via-cyan-500/50 to-slate-800 rounded-full relative">
                <div className="absolute top-0 left-0 h-full w-20 bg-cyan-400 blur-sm animate-shimmer-slide" />
              </div>
            </div>
          </GlowingCard>

          {/* Card 4: Templates (Small) */}
          <GlowingCard delay={4}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded bg-pink-500/10 text-pink-400">
                <LayoutTemplate className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">教学场景</h3>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="border-pink-500/20 text-pink-300">试卷生成</Badge>
              <Badge variant="outline" className="border-pink-500/20 text-pink-300">复习</Badge>
              <Badge variant="outline" className="border-pink-500/20 text-pink-300">测验</Badge>
            </div>
          </GlowingCard>

        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <Button asChild size="lg" className="h-12 px-8 text-base bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-900/20 rounded-lg">
            <a href={getLoginUrl()}>
              开始使用 <ArrowRight className="ml-2 w-4 h-4" />
            </a>
          </Button>
          <p className="mt-4 text-xs text-slate-500 font-mono">
            安全连接 • 加密存储 • V1.0.0
          </p>
        </div>

      </div>
    </div>
  );
}

// 智能推荐区域组件
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
    return null;
  }

  return (
    <div className="mb-8 md:mb-12 space-y-6">
      {/* 最常用提示词 */}
      {topUsed && topUsed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-medium">常用教学指令</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {topUsed.map((prompt: any) => (
              <Link key={prompt.id} href={`/prompts/${prompt.id}`}>
                <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <h4 className="font-medium mb-2 line-clamp-1">{prompt.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {prompt.description || prompt.content}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      {parseTags(prompt.tags).slice(0, 2).map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">使用 {prompt.useCount || 0} 次</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 最近使用 */}
      {recentlyUsed && recentlyUsed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-medium">最近备课</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {recentlyUsed.map((prompt: any) => (
              <Link key={prompt.id} href={`/prompts/${prompt.id}`}>
                <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <h4 className="font-medium mb-2 line-clamp-1">{prompt.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {prompt.description || prompt.content}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      {parseTags(prompt.tags).slice(0, 2).map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {prompt.lastUsedAt ? new Date(prompt.lastUsedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around h-16 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors w-16",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                <span className="text-[10px]">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}