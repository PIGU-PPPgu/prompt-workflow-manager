import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { APP_TITLE, getLoginUrl } from "@/const";
import {
  BookOpen,
  Workflow,
  LayoutTemplate,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Library,
  Sparkles,
  MessageSquare,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Animation Demo Component ---
const PromptToContentDemo = () => {
  const [step, setStep] = useState<"input" | "processing" | "output">("input");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const runSequence = () => {
      // Step 1: Input (Show raw prompts)
      setStep("input");
      
      // Step 2: Processing (After 2.5s, prompts converge)
      timer = setTimeout(() => {
        setStep("processing");
        
        // Step 3: Output (After 1.5s processing, show result)
        timer = setTimeout(() => {
          setStep("output");
          
          // Step 4: Reset (After 5s reading time, restart)
          timer = setTimeout(() => {
             runSequence();
          }, 5000);
          
        }, 1500);
        
      }, 2500);
    };

    runSequence();
    return () => clearTimeout(timer);
  }, []);

  const rawPrompts = [
    { text: "初二物理", x: -120, y: -40, delay: 0 },
    { text: "杠杆原理", x: 120, y: -60, delay: 0.2 },
    { text: "生活实例", x: -100, y: 50, delay: 0.4 },
    { text: "互动提问", x: 100, y: 30, delay: 0.6 },
    { text: "生成教案", x: 0, y: -80, delay: 0.8 },
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto h-[320px] mt-16 flex items-center justify-center">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input-stage"
            className="absolute inset-0"
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.5 } }}
          >
             {rawPrompts.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    x: item.x, 
                    y: item.y,
                  }}
                  transition={{ 
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                    delay: item.delay 
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="bg-white/80 backdrop-blur-sm border border-indigo-100 shadow-sm px-4 py-2 rounded-full text-indigo-800 font-medium text-sm whitespace-nowrap">
                    {item.text}
                  </div>
                </motion.div>
             ))}
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1, transition: { delay: 1 } }}
               className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 text-xs mt-24"
             >
               输入关键词...
             </motion.div>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div
            key="processing-stage"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
            transition={{ duration: 0.5 }}
            className="absolute z-10"
          >
             <div className="relative">
               <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-50 animate-pulse"></div>
               <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl relative z-10">
                 <Zap className="w-8 h-8 animate-[spin_3s_linear_infinite]" />
               </div>
             </div>
             <div className="text-center mt-4 font-medium text-indigo-600">AI 生成中...</div>
          </motion.div>
        )}

        {step === "output" && (
          <motion.div
            key="output-stage"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden relative z-20"
          >
             <div className="h-1.5 bg-indigo-600 w-full"></div>
             <div className="p-6 text-left">
               <div className="flex items-center gap-2 mb-4">
                 <div className="p-1.5 bg-green-100 text-green-700 rounded-md">
                   <BookOpen className="w-4 h-4" />
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-900 text-base">《杠杆》探究式教学设计</h3>
                   <p className="text-xs text-slate-500">适用年级: 初二物理 | 课时: 1课时</p>
                 </div>
               </div>
               
               <div className="space-y-3">
                 <div className="space-y-1">
                   <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">01. 教学目标</div>
                   <p className="text-sm text-slate-600 leading-relaxed">
                     理解杠杆的概念及其五要素；通过实验探究，总结并掌握杠杆平衡条件（F1L1=F2L2）。
                   </p>
                 </div>
                 
                 <div className="space-y-1">
                   <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">02. 情景导入</div>
                   <p className="text-sm text-slate-600 leading-relaxed">
                     展示图片：阿基米德"给我一个支点，我就能撬动地球"。提问：这是真的吗？他在吹牛吗？引发学生认知冲突。
                   </p>
                 </div>

                 <div className="p-3 bg-slate-50 rounded border border-slate-100 mt-2">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-slate-700">随堂测验生成</span>
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded">Ready</span>
                   </div>
                   <div className="h-1.5 bg-slate-200 rounded-full w-full overflow-hidden">
                     <div className="h-full bg-green-500 w-full animate-[shimmer_2s_infinite]"></div>
                   </div>
                 </div>
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Landing() {
  const loginUrl = getLoginUrl();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* --- Navbar --- */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-xl tracking-tight text-slate-900">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            {APP_TITLE}
          </div>
          <div className="flex items-center gap-4">
            <Link href={loginUrl}>
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                登录
              </Button>
            </Link>
            <Link href={loginUrl}>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                立即开始
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        
        {/* --- Hero Section --- */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-800 mb-6">
                <span className="flex h-2 w-2 rounded-full bg-indigo-600 mr-2"></span>
                专为教育工作者打造
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-tight">
                教育行业的 <span className="text-indigo-600">提示词存储</span> 与 <span className="text-indigo-600">采集库</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                告别杂乱的文档记录。这是一个专门用于管理教学 AI 指令、自动化备课流程和分享教育智慧的专业工具。
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href={loginUrl}>
                  <Button size="lg" className="h-12 px-8 text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg w-full sm:w-auto">
                    免费开始使用
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>

              {/* Animation Demo */}
              <PromptToContentDemo />

            </motion.div>
          </div>
        </section>

        {/* --- Value Proposition Grid --- */}
        <section className="py-24 bg-white border-y border-slate-100">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                  <Library className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">结构化资产管理</h3>
                <p className="text-slate-600 leading-relaxed">
                  不再依赖记事本。将您的 Prompt 按学科、年级、教学场景进行结构化存储，支持版本控制与标签检索，随时调取最优质的指令。
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4">
                  <Workflow className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">备课工作流自动化</h3>
                <p className="text-slate-600 leading-relaxed">
                  将复杂的备课任务拆解为工作流。串联多个 AI 步骤，一键生成从"教学大纲"到"课堂练习"的全套资料，大幅提升备课效率。
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                  <LayoutTemplate className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">教育场景模板库</h3>
                <p className="text-slate-600 leading-relaxed">
                  不知道怎么写好指令？浏览内置的优质教学场景模板，涵盖教案设计、题目生成、学情分析等，一键复制并根据需求修改。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- Feature Detail Section --- */}
        <section className="py-24 bg-slate-50">
          <div className="container mx-auto px-4 max-w-6xl">
            
            <div className="flex flex-col md:flex-row items-center gap-16 mb-24">
              <div className="flex-1 space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">专为教师设计的指令编辑器</h2>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 shrink-0 mt-0.5" />
                    <span className="text-slate-700">内置结构化提示词框架，引导您写出高质量指令</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 shrink-0 mt-0.5" />
                    <span className="text-slate-700">自动关联学科与年级属性，方便归档与检索</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 shrink-0 mt-0.5" />
                    <span className="text-slate-700">支持 AI 自动优化功能，让您的简单指令变得专业</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 bg-white p-6 rounded-2xl shadow-xl border border-slate-200 rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Mock UI Representation */}
                <div className="space-y-4">
                  <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                    <div className="h-3 bg-slate-100 rounded w-4/6"></div>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="text-xs text-indigo-600 font-medium mb-1">AI 优化建议</div>
                    <div className="h-2 bg-indigo-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row-reverse items-center gap-16">
               <div className="flex-1 space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">不仅是存储，更是分享与成长</h2>
                <p className="text-slate-600 text-lg">
                  我们相信教育智慧应当流动。在 {APP_TITLE}，您可以选择将优质的 Prompt 公开分享，帮助更多同行，也能从社区中汲取灵感。
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <div className="text-2xl font-bold text-indigo-600 mb-1">Tags</div>
                    <div className="text-sm text-slate-500">多维度标签体系</div>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <div className="text-2xl font-bold text-indigo-600 mb-1">Share</div>
                    <div className="text-sm text-slate-500">一键生成分享链接</div>
                  </div>
                </div>
              </div>
               <div className="flex-1 bg-white p-6 rounded-2xl shadow-xl border border-slate-200 -rotate-1 hover:rotate-0 transition-transform duration-500">
                 {/* Mock UI Representation */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Card 1 */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                         <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded">
                           <BookOpen className="w-4 h-4" />
                         </div>
                         <div className="flex items-center text-xs text-slate-400">
                           <span className="w-3 h-3 mr-1 fill-rose-500 text-rose-500">❤️</span> 128
                         </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">高中语文-古诗词赏析</div>
                        <div className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100 inline-block">Prompt</div>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                         <div className="p-1.5 bg-blue-100 text-blue-600 rounded">
                           <MessageSquare className="w-4 h-4" />
                         </div>
                         <div className="flex items-center text-xs text-slate-400">
                           <span className="w-3 h-3 mr-1 fill-rose-500 text-rose-500">❤️</span> 85
                         </div>
                      </div>
                       <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">初中数学-几何证明助手</div>
                        <div className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100 inline-block">Agent</div>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                         <div className="p-1.5 bg-purple-100 text-purple-600 rounded">
                           <Workflow className="w-4 h-4" />
                         </div>
                         <div className="flex items-center text-xs text-slate-400">
                           <span className="w-3 h-3 mr-1 fill-rose-500 text-rose-500">❤️</span> 256
                         </div>
                      </div>
                       <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">英语作文批改工作流</div>
                         <div className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100 inline-block">Workflow</div>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                         <div className="p-1.5 bg-amber-100 text-amber-600 rounded">
                           <LayoutTemplate className="w-4 h-4" />
                         </div>
                         <div className="flex items-center text-xs text-slate-400">
                           <span className="w-3 h-3 mr-1 fill-rose-500 text-rose-500">❤️</span> 342
                         </div>
                      </div>
                       <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">班主任-期末评语生成</div>
                        <div className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100 inline-block">Template</div>
                      </div>
                    </div>
                 </div>
              </div>
            </div>

          </div>
        </section>

        {/* --- CTA Section --- */}
        <section className="py-24 bg-indigo-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">准备好升级您的备课工具箱了吗？</h2>
            <p className="text-indigo-100 text-lg mb-10 max-w-2xl mx-auto">
              加入我们，开始构建属于您的数字化教学资产库，让 AI 真正服务于教育一线。
            </p>
            <Link href={loginUrl}>
              <Button size="lg" className="h-14 px-10 text-lg bg-white text-indigo-600 hover:bg-indigo-50 border-none shadow-xl">
                立即注册 / 登录
              </Button>
            </Link>
          </div>
        </section>

      </main>

      {/* --- Footer --- */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center text-white text-xs">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="text-slate-200 font-medium">{APP_TITLE}</span>
          </div>
          <div className="text-sm">
            © {new Date().getFullYear()} {APP_TITLE}. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
