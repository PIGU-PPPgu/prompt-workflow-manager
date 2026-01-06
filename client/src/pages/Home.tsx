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
  const [location, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录直接跳转登录页
  if (!isAuthenticated) {
    // 使用 useEffect 会更好，但这里用简单的方式
    if (typeof window !== "undefined" && window.location.pathname !== getLoginUrl()) {
      window.location.href = getLoginUrl();
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">正在跳转到登录页...</p>
        </div>
      </div>
    );
  }

  // --- 登录后视图 ---
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

  // 不应该到达这里
  return null;
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