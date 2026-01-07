import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { LLMConfigError, LLMRequestError } from "./_core/llm";
import * as db from "./db";
import { checkRateLimit } from "./utils/rateLimit";
import {
  PromptContent,
  PromptTitle,
  Description,
  Tags,
  SafeString,
  SafeUrl,
  CreatePromptInput,
  UpdatePromptInput,
  ImportTemplateInput,
  CreateApiKeyInput,
  UpdateApiKeyInput,
  UserMessage,
} from "./schemas/enhanced";

export const appRouter = router({
  system: systemRouter,
  models: router({
    byScene: protectedProcedure
      .input(z.object({ scene: z.string() }))
      .query(async ({ input }) => {
        const scene = input.scene.toLowerCase();
        const base = [
          { name: "gpt-4o-mini", provider: "openai", mode: "cheap", costHint: "低成本" },
          { name: "gpt-4o", provider: "openai", mode: "accurate", costHint: "高质量" },
          { name: "claude-3.5-sonnet", provider: "anthropic", mode: "accurate", costHint: "高质量" },
          { name: "gpt-4o-mini-vision", provider: "openai", mode: "multimodal", costHint: "图片/PDF" },
        ];

        if (scene.includes("作业") || scene.includes("考试")) {
          return base.filter(m => m.mode !== "cheap");
        }
        if (scene.includes("互动") || scene.includes("家长") || scene.includes("沟通")) {
          return base.filter(m => m.mode !== "multimodal");
        }
        return base;
      }),
  }),
  quickStart: router({
    list: protectedProcedure.query(async () => {
      // 预置的教学场景快捷入口
      return [
        {
          id: "lesson-plan",
          title: "备课大纲生成",
          teachingScene: "备课",
          subject: "通用",
          modelHint: "accurate",
          type: "promptTemplate" as const,
          content: "请基于课程主题，输出教学目标、重难点、学生活动设计、评价方式的纲要。",
        },
        {
          id: "homework-review",
          title: "作业批改与点评",
          teachingScene: "作业",
          subject: "通用",
          modelHint: "balanced",
          type: "promptTemplate" as const,
          content: "根据学生作业内容，给出得分、优点、改进建议和后续练习推荐。",
        },
        {
          id: "exam-parse",
          title: "试卷解析与讲评",
          teachingScene: "考试",
          subject: "通用",
          modelHint: "accurate",
          type: "promptTemplate" as const,
          content: "请对试题进行知识点归类、常见错误、易混淆点、解题步骤讲解，并给出举一反三题。",
        },
        {
          id: "parent-communication",
          title: "家长沟通话术",
          teachingScene: "家校沟通",
          subject: "通用",
          modelHint: "cheap",
          type: "promptTemplate" as const,
          content: "以尊重和建设性的口吻，向家长反馈学生表现，给出可执行的家庭支持建议。",
        },
        {
          id: "class-interaction",
          title: "课堂互动脚本",
          teachingScene: "授课",
          subject: "通用",
          modelHint: "balanced",
          type: "promptTemplate" as const,
          content: "设计 3-5 个分层提问或小组讨论任务，包含提问、追问、板书要点和时间分配。",
        },
      ];
    }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({
      success: true as const,
    })),

    // Register with invitation code
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().optional(),
        invitationCode: z.string().min(1).max(50),
      }))
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: 3 registration attempts per hour per IP
        const identifier = `register:${ctx.req?.ip || 'unknown'}`;
        const rateLimit = checkRateLimit(identifier, {
          windowMs: 60 * 60 * 1000, // 1 hour
          maxRequests: 3,
        });

        if (rateLimit.limited) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: '注册次数过多，请稍后再试',
          });
        }

        // Step 1: Validate invitation code
        const validation = await db.validateInvitationCode(input.invitationCode);
        if (!validation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: validation.error || '邀请码无效',
          });
        }

        const invCode = validation.invitationCode!;

        // Step 2: Register with Supabase Auth
        // Note: We need to import supabaseAdmin
        const { supabaseAdmin } = await import('./lib/supabase');

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true, // Auto-confirm email for invited users
          user_metadata: {
            name: input.name,
            invitation_code: input.invitationCode,
          },
        });

        if (authError || !authData.user) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: authError?.message || '注册失败',
          });
        }

        // Step 3: Create local user record
        const grantDays = invCode.grantDays ?? 0;
        await db.upsertUser({
          openId: authData.user.id,
          email: input.email,
          name: input.name || null,
          loginMethod: 'email',
          subscriptionTier: invCode.grantTier || 'free',
          subscriptionStatus: grantDays > 0 ? 'active' : undefined,
          subscriptionEndDate: grantDays > 0
            ? new Date(Date.now() + grantDays * 24 * 60 * 60 * 1000)
            : undefined,
        });

        // Get the created user
        const user = await db.getUserByOpenId(authData.user.id);
        if (!user) {
          // Rollback: delete the Supabase user if local user creation failed
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '创建用户失败',
          });
        }

        // Step 4: Record invitation code usage (CRITICAL - must succeed)
        try {
          await db.useInvitationCode(
            input.invitationCode,
            user.id,
            ctx.req?.ip,
            ctx.req?.headers['user-agent']
          );
        } catch (error: any) {
          // CRITICAL: If invitation code usage fails, rollback the registration
          console.error('[Auth] Failed to record invitation code usage, rolling back:', error);

          // Delete local user
          await db.deleteUser(user.id).catch(e =>
            console.error('[Auth] Failed to delete local user during rollback:', e)
          );

          // Delete Supabase user
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(e =>
            console.error('[Auth] Failed to delete Supabase user during rollback:', e)
          );

          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message || '邀请码使用失败，注册已回滚',
          });
        }

        // Record audit log
        await db.createAuditLog({
          userId: user.id,
          action: 'create',
          resourceType: 'user',
          resourceId: user.id,
          details: {
            action: 'register',
            invitationCode: input.invitationCode,
            grantTier: invCode.grantTier,
          },
          ipAddress: ctx.req?.ip,
          userAgent: ctx.req?.headers['user-agent'],
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        };
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: SafeString.optional(),
        email: z.string().email().optional().or(z.literal('')),
        phoneNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUser(ctx.user.id, input);
        
        // Record audit log
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'user',
          resourceId: ctx.user.id,
          details: { action: 'updateProfile' },
        });
        
        return { success: true };
      }),
  }),

  // ============ Scenario Routes ============
  scenarios: router({  
    list: publicProcedure.query(async ({ ctx }) => {
      // 如果已登录，返回系统预设 + 用户自定义场景；未登录只返回系统预设
      return await db.getAllScenarios(ctx.user?.id);
    }),
    byLevel: publicProcedure
      .input(z.object({ level: z.number().min(1).max(3) }))
      .query(async ({ input }) => {
        return await db.getScenariosByLevel(input.level);
      }),
    byParent: publicProcedure
      .input(z.object({ parentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getScenariosByParent(input.parentId);
      }),
    create: protectedProcedure
      .input(z.object({
        name: SafeString,
        description: Description,
        parentId: z.number().optional(),
        level: z.number().min(1).max(3),
        icon: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createScenario({
          ...input,
          isCustom: true,
          userId: ctx.user.id,
        });

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'create',
          resourceType: 'scenario',
          resourceId: id,
          details: { name: input.name, level: input.level },
        });

        return { success: true, id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: SafeString.optional(),
        description: Description,
      }))
      .mutation(async ({ ctx, input }) => {
        // 🔒 传入 userId 进行权限检查
        await db.updateScenario(input.id, ctx.user.id, {
          name: input.name,
          description: input.description,
        });

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'scenario',
          resourceId: input.id,
          details: { name: input.name },
        });

        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // 🔒 传入 userId 进行权限检查
        await db.deleteScenario(input.id, ctx.user.id);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'delete',
          resourceType: 'scenario',
          resourceId: input.id,
        });

        return { success: true };
      }),
    generateByAI: protectedProcedure
      .input(z.object({ industry: z.string() }))
      .mutation(async ({ input }) => {
        return await db.generateScenariosByAI(input.industry);
      }),
    updateSortOrder: protectedProcedure
      .input(z.object({
        updates: z.array(z.object({
          id: z.number(),
          sortOrder: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        await db.updateScenarioSortOrder(input.updates);
        return { success: true };
      }),
    importTemplate: protectedProcedure
      .input(ImportTemplateInput)
      .mutation(async ({ input, ctx }) => {
        let categories;

        if (input.fileType === 'csv') {
          categories = await db.parseCategoriesFromCSV(input.fileContent);
        } else {
          categories = await db.parseCategoriesFromJSON(input.fileContent);
        }

        const result = await db.importCategoriesFromTemplate(ctx.user.id, categories);
        return { success: true, count: result.length, categories: result };
      }),
    initializePresets: publicProcedure
      .input(z.object({ forceReset: z.boolean().optional() }).optional())
      .mutation(async ({ input }) => {
        // 动态导入 seedScenarios 函数
        const { seedScenarios } = await import('./seedScenarios.js');
        await seedScenarios(input?.forceReset ?? false);
        return { success: true, message: input?.forceReset ? '预设场景分类已重置' : '预设场景分类初始化成功' };
      }),
  }),

  // ============ Category Routes ============
  categories: router({
    list: protectedProcedure
      .input(z.object({ type: z.enum(["prompt", "workflow", "agent"]).optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getUserCategories(ctx.user.id, input.type);
      }),
    create: protectedProcedure
      .input(z.object({
        name: SafeString,
        description: Description,
        type: z.enum(["prompt", "workflow", "agent"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = Number(await db.createCategory({
          ...input,
          userId: ctx.user.id,
        }));

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'create',
          resourceType: 'category',
          resourceId: id,
          details: { name: input.name, type: input.type },
        });

        return { success: true, id };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCategory(input.id, ctx.user.id);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'delete',
          resourceType: 'category',
          resourceId: input.id,
        });

        return { success: true };
      }),
  }),

  // ============ Prompt Routes ============
  prompts: router({
    list: protectedProcedure
      .input(z.object({
        gradeLevel: z.string().optional(),
        subject: z.string().optional(),
        teachingScene: z.string().optional(),
        textbookVersion: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserPrompts(ctx.user.id, input || undefined);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getPromptById(input.id, ctx.user.id);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getPromptById(input.id, ctx.user.id);
      }),
    create: protectedProcedure
      .input(CreatePromptInput)
      .mutation(async ({ ctx, input }) => {
        // 管理员不受订阅限制
        if (ctx.user.role !== 'admin') {
          // 检查订阅限制
          const subscription = await db.getUserSubscription(ctx.user.id);
          const userTier = subscription?.subscriptionTier || 'free';
          const { getUserPlan } = await import('./products');
          const plan = getUserPlan(userTier);
          
          const { allowed, current } = await db.checkPromptLimit(ctx.user.id, plan.features.maxPrompts);
          if (!allowed) {
            // 发送限制通知
            await db.createNotification({
              userId: ctx.user.id,
              type: 'operation',
              title: '提示词数量已达上限',
              content: `您已达到${plan.name}的提示词数量限制(${plan.features.maxPrompts}个)。升级订阅以创建更多提示词。`,
              link: '/subscription',
            });
            throw new Error(`已达到提示词数量限制(${plan.features.maxPrompts}个)，请升级订阅`);
          }
        }
        
        const id = await db.createPrompt({
          ...input,
          userId: ctx.user.id,
        });

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'create',
          resourceType: 'prompt',
          resourceId: id,
          details: { title: input.title },
        });

        // 自动同步到飞书（如果已配置）
        const feishuConfig = await db.getFeishuConfig(ctx.user.id);
        if (feishuConfig && feishuConfig.enabled && feishuConfig.syncOnCreate) {
          await db.syncPromptToFeishu(id, ctx.user.id).catch(err => {
            console.error('飞书同步失败:', err);
            // 同步失败不影响主流程，仅记录日志
          });
        }

        return { id };
      }),
    update: protectedProcedure
      .input(UpdatePromptInput)
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updatePrompt(id, ctx.user.id, data);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'prompt',
          resourceId: id,
          details: { title: input.title },
        });

        // 自动同步到飞书（如果已配置）
        const feishuConfig = await db.getFeishuConfig(ctx.user.id);
        if (feishuConfig && feishuConfig.enabled && feishuConfig.syncOnUpdate) {
          await db.syncPromptToFeishu(id, ctx.user.id).catch(err => {
            console.error('飞书同步失败:', err);
            // 同步失败不影响主流程，仅记录日志
          });
        }

        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePrompt(input.id, ctx.user.id);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'delete',
          resourceType: 'prompt',
          resourceId: input.id,
        });

        return { success: true };
      }),
    versions: protectedProcedure
      .input(z.object({ promptId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPromptVersions(input.promptId);
      }),
    optimize: protectedProcedure
      .input(z.object({
        content: PromptContent,
        targetModel: z.enum(["gpt", "claude", "general"]).optional(),
        intensity: z.enum(["light", "medium", "deep"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 管理员不受订阅限制
        if (ctx.user.role !== 'admin') {
          // 检查订阅限制
          const subscription = await db.getUserSubscription(ctx.user.id);
          const userTier = subscription?.subscriptionTier || 'free';
          const { getUserPlan } = await import('./products');
          const plan = getUserPlan(userTier);
          
          const { allowed, current } = await db.checkOptimizationLimit(ctx.user.id, plan.features.maxOptimizations);
          if (!allowed) {
            // 发送限制通知
            await db.createNotification({
              userId: ctx.user.id,
              type: 'operation',
              title: 'AI优化次数已用完',
              content: `您本月的AI优化次数已达上限(${plan.features.maxOptimizations}次)。升级订阅以获取更多AI优化次数。`,
              link: '/subscription',
            });
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: `本月AI优化次数已用完(${plan.features.maxOptimizations}次)，请升级订阅`,
            });
          }
        }

        if (!ENV.forgeApiKey) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'AI服务未配置。请联系管理员设置 BUILT_IN_FORGE_API_KEY 环境变量。',
          });
        }

        try {
          return await db.optimizePrompt(input.content, input.targetModel, input.intensity);
        } catch (error: any) {
          // Handle LLM configuration errors
          if (error instanceof LLMConfigError) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'AI服务未配置。请联系管理员设置 BUILT_IN_FORGE_API_KEY 环境变量。'
            });
          }

          // Handle LLM request errors
          if (error instanceof LLMRequestError) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `AI服务调用失败: ${error.message}`
            });
          }

          // Handle generic errors
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || '优化失败，请稍后重试'
          });
        }
      }),
    score: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const scores = await db.calculatePromptScore(input.id, ctx.user.id);
        return scores;
      }),
    recordUse: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.recordPromptUse(input.id, ctx.user.id);
        return { success: true };
      }),
    analyzeAndSuggest: protectedProcedure
      .input(z.object({
        promptId: z.number(),
        content: PromptContent,
      }))
      .mutation(async ({ input }) => {
        return await db.analyzePromptAndSuggest(input.content);
      }),
    toggleFavorite: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.togglePromptFavorite(input.id, ctx.user.id);
        return { success: true };
      }),
    setCustomMark: protectedProcedure
      .input(z.object({
        id: z.number(),
        mark: z.enum(["常用", "待优化", "已验证", ""]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.setPromptCustomMark(input.id, ctx.user.id, input.mark || null);
        return { success: true };
      }),
    batchUpdate: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()),
        action: z.enum(["addTags", "removeTags", "setCategory", "setScenario", "optimize"]),
        tags: z.array(z.string()).optional(),
        categoryId: z.number().optional(),
        scenarioId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.batchUpdatePrompts(input.ids, ctx.user.id, input.action, {
          tags: input.tags,
          categoryId: input.categoryId,
          scenarioId: input.scenarioId,
        });
        return { success: true };
      }),
    createShare: protectedProcedure
      .input(z.object({
        promptId: z.number(),
        permission: z.enum(["view", "edit"]),
        isPublic: z.boolean(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = await db.createPromptShare({
          ...input,
          userId: ctx.user.id,
        });
        return { token };
      }),
    getShares: protectedProcedure
      .input(z.object({ promptId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getPromptShares(input.promptId, ctx.user.id);
      }),
    getByShareToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const share = await db.getPromptShareByToken(input.token);
        if (!share) throw new Error("Share not found or expired");

        // 检查是否过期
        if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
          throw new Error("Share link has expired");
        }

        // 检查是否公开访问
        if (!share.isPublic) {
          throw new Error("This share requires authentication");
        }

        const prompt = await db.getPromptById(share.promptId, share.userId);
        if (!prompt) throw new Error("Prompt not found");

        // 根据权限返回不同的数据
        if (share.permission === "view") {
          // 只读权限：只返回基本信息，不返回敏感数据
          return {
            prompt: {
              id: prompt.id,
              title: prompt.title,
              content: prompt.content,
              description: prompt.description,
              tags: prompt.tags,
              version: prompt.version,
              createdAt: prompt.createdAt,
              // 不返回：userId, categoryId, scenarioId, customMark 等敏感信息
            },
            permission: "view" as const,
          };
        }

        // 编辑权限：返回完整数据
        return { prompt, permission: share.permission };
      }),
    deleteShare: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePromptShare(input.id, ctx.user.id);
        return { success: true };
      }),
    suggestCategoryAndTags: protectedProcedure
      .input(z.object({
        content: PromptContent,
        title: PromptTitle.optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.suggestCategoryAndTags(input.content, input.title, ctx.user.id);
      }),
    convertToTemplate: protectedProcedure
      .input(z.object({
        content: PromptContent,
        title: PromptTitle.optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.convertToTemplate(input.content, input.title);
      }),
    recommended: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getRecommendedPrompts(ctx.user.id, input.limit);
      }),
    usageHistory: protectedProcedure
      .input(z.object({ promptId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getPromptUsageHistory(input.promptId, input.limit);
      }),
    recommendedTemplates: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getRecommendedTemplates(ctx.user.id, input.limit);
      }),
    exportAsMarkdown: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const markdown = await db.exportPromptsAsMarkdown(input.ids, ctx.user.id);
        return { content: markdown };
      }),
    exportAsJSON: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const json = await db.exportPromptsAsJSON(input.ids, ctx.user.id);
        return { content: json };
      }),
    exportAsCSV: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const csv = await db.exportPromptsAsCSV(input.ids, ctx.user.id);
        return { content: csv };
      }),
    restoreVersion: protectedProcedure
      .input(z.object({ promptId: z.number(), version: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.restorePromptVersion(input.promptId, input.version, ctx.user.id);
      }),
    topUsed: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getTopUsedPrompts(ctx.user.id, input.limit || 10);
      }),
    recentlyUsed: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getRecentlyUsedPrompts(ctx.user.id, input.limit || 5);
      }),
    recommendByMeta: protectedProcedure
      .input(z.object({
        subject: z.string().optional(),
        teachingScene: z.string().optional(),
        gradeLevel: z.string().optional(),
        textbookVersion: z.string().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getPromptRecommendationsByMeta(ctx.user.id, input, input.limit || 10);
      }),
    essential: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getEssentialPrompts(ctx.user.id, input?.limit || 10);
      }),
    feedback: protectedProcedure
      .input(z.object({
        promptId: z.number(),
        satisfactionScore: z.number().min(0).max(5),
        hitExpectation: z.boolean().optional(),
        usable: z.boolean().optional(),
        comment: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createPromptFeedback({
          promptId: input.promptId,
          userId: ctx.user.id,
          satisfactionScore: input.satisfactionScore,
          hitExpectation: input.hitExpectation ?? false,
          usable: input.usable ?? true,
          comment: input.comment,
        });
        return { success: true };
      }),
    feedbackSummary: protectedProcedure
      .input(z.object({ promptId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPromptFeedbackSummary(input.promptId);
      }),
  }),

  // ============ Template Library Routes ============
  templates: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional() }))
      .query(async ({ input }) => {
        return await db.getTemplatePrompts(input.category);
      }),
    categories: publicProcedure.query(async () => {
      return await db.getTemplateCategories();
    }),
    import: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.importTemplateToUser(input.templateId, ctx.user.id);
        return { id };
      }),
  }),

  // ============ Workflow Routes ============
  workflows: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserWorkflows(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getWorkflowById(input.id, ctx.user.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: PromptTitle,
        description: Description,
        categoryId: z.number().optional(),
        steps: z.string(),
        platform: z.string().optional(),
        externalUrl: SafeUrl.optional(),
        externalJson: z.string().optional(),
        isTemplate: z.boolean().optional(),
        isPublic: z.boolean().optional(),
        tags: Tags,
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createWorkflow({
          ...input,
          userId: ctx.user.id,
        });

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'create',
          resourceType: 'workflow',
          resourceId: id,
          details: { title: input.title },
        });

        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: PromptTitle.optional(),
        description: Description,
        categoryId: z.number().optional(),
        steps: z.string().optional(),
        platform: z.string().optional(),
        externalUrl: SafeUrl.optional(),
        externalJson: z.string().optional(),
        isTemplate: z.boolean().optional(),
        isPublic: z.boolean().optional(),
        tags: Tags,
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateWorkflow(id, ctx.user.id, data);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'workflow',
          resourceId: id,
          details: { title: input.title },
        });

        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteWorkflow(input.id, ctx.user.id);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'delete',
          resourceType: 'workflow',
          resourceId: input.id,
        });

        return { success: true };
      }),
    executions: protectedProcedure
      .input(z.object({ workflowId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getWorkflowExecutions(input.workflowId, ctx.user.id);
      }),
    execute: protectedProcedure
      .input(z.object({
        workflowId: z.number(),
        input: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const workflow = await db.getWorkflowById(input.workflowId, ctx.user.id);
        if (!workflow) throw new Error("Workflow not found");

        const executionId = await db.createWorkflowExecution({
          workflowId: input.workflowId,
          userId: ctx.user.id,
          status: "running",
          input: input.input,
        });

        // Execute workflow asynchronously
        (async () => {
          try {
            const { executeWorkflow } = await import("./_core/workflowExecutor");

            // Parse workflow steps
            let steps = [];
            try {
              steps = JSON.parse(workflow.steps);
            } catch {
              throw new Error("Invalid workflow steps format");
            }

            // Execute the workflow
            const result = await executeWorkflow(steps, input.input || "");

            // Update execution record
            await db.updateWorkflowExecution(executionId, {
              status: result.status,
              completedAt: new Date(),
              output: JSON.stringify({
                finalOutput: result.output,
                stepResults: result.stepResults,
                totalDuration: result.totalDuration,
              }),
              error: result.error,
            });

            // Record workflow usage statistics
            await db.recordWorkflowUsage({
              workflowId: input.workflowId,
              userId: ctx.user.id,
              executionTime: result.totalDuration,
              status: result.status === "completed" ? "success" : "failed",
            });
          } catch (error: any) {
            await db.updateWorkflowExecution(executionId, {
              status: "failed",
              completedAt: new Date(),
              error: error.message || "Unknown execution error",
            });
          }
        })();

        return { executionId };
      }),
  }),

  // ============ Agent Routes ============
  agents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserAgents(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getAgentById(input.id, ctx.user.id);
      }),
    create: protectedProcedure
      .input(z.object({
        name: SafeString,
        description: Description,
        externalUrl: SafeUrl.optional(),
        platform: z.string().optional(),
        categoryId: z.number().optional(),
        systemPrompt: PromptContent.optional(),
        linkedPromptIds: z.string().optional(),
        model: z.string().optional(),
        temperature: z.string().optional(),
        maxTokens: z.number().optional(),
        isPublic: z.boolean().optional(),
        tags: Tags,
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createAgent({
          ...input,
          userId: ctx.user.id,
        });

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'create',
          resourceType: 'agent',
          resourceId: id,
          details: { name: input.name },
        });

        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: SafeString.optional(),
        description: Description,
        externalUrl: SafeUrl.optional(),
        platform: z.string().optional(),
        categoryId: z.number().optional(),
        systemPrompt: PromptContent.optional(),
        linkedPromptIds: z.string().optional(),
        model: z.string().optional(),
        temperature: z.string().optional(),
        maxTokens: z.number().optional(),
        isPublic: z.boolean().optional(),
        tags: Tags,
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateAgent(id, ctx.user.id, data);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'agent',
          resourceId: id,
          details: { name: input.name },
        });

        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteAgent(input.id, ctx.user.id);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'delete',
          resourceType: 'agent',
          resourceId: input.id,
        });

        return { success: true };
      }),
    conversations: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getAgentConversations(input.agentId, ctx.user.id);
      }),
    chat: protectedProcedure
      .input(z.object({
        agentId: z.number(),
        conversationId: z.number().optional(),
        message: UserMessage,
      }))
      .mutation(async ({ ctx, input }) => {
        const agent = await db.getAgentById(input.agentId, ctx.user.id);
        if (!agent) throw new Error("Agent not found");

        // Get conversation history
        let messages: Array<{ role: "user" | "assistant"; content: string }> = [];
        if (input.conversationId) {
          const conversation = await db.getAgentConversations(input.agentId, ctx.user.id);
          const current = conversation.find(c => c.id === input.conversationId);
          if (current) {
            const parsed = JSON.parse(current.messages);
            messages = parsed.filter((m: any) => m.role === "user" || m.role === "assistant");
          }
        }

        // Add system prompt and user message
        const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
        if (agent.systemPrompt) {
          llmMessages.push({ role: "system", content: agent.systemPrompt });
        }
        llmMessages.push(...messages);
        llmMessages.push({ role: "user", content: input.message });

        // Call AI API
        const { invokeLLM } = await import("./_core/llm");
        const llmResponse = await invokeLLM({
          messages: llmMessages,
        });

        const responseContent = llmResponse.choices[0]?.message?.content;
        const response = typeof responseContent === "string" ? responseContent : "无法生成回复";

        // Save conversation
        messages.push({ role: "user", content: input.message });
        messages.push({ role: "assistant", content: response });

        let conversationId = input.conversationId;
        if (!conversationId) {
          conversationId = await db.createAgentConversation({
            agentId: input.agentId,
            userId: ctx.user.id,
            messages: JSON.stringify(messages),
          });
        } else {
          await db.updateAgentConversation(conversationId, ctx.user.id, {
            messages: JSON.stringify(messages),
          });
        }

        return { conversationId, response };
      }),
    recordVisit: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.recordAgentVisit(input.id, ctx.user.id);
        return { success: true };
      }),
    batchImport: protectedProcedure
      .input(z.object({
        items: z.array(z.object({
          name: SafeString,
          description: Description,
          externalUrl: SafeUrl.optional(),
          platform: z.string().optional(),
          systemPrompt: PromptContent.optional(),
          model: z.string().optional(),
          temperature: z.string().optional(),
          maxTokens: z.number().optional(),
          tags: Tags,
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const results = { success: 0, failed: 0, errors: [] as string[] };
        
        for (const item of input.items) {
          try {
            await db.createAgent({
              ...item,
              userId: ctx.user.id,
              categoryId: undefined,
              linkedPromptIds: undefined,
            });
            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push(`${item.name}: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
        
        return results;
      }),
  }),

  // ============ API Key Routes ============
  apiKeys: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const keys = await db.getUserApiKeys(ctx.user.id);
      // Don't send actual key values to frontend
      return keys.map(k => ({ ...k, keyValue: "***" }));
    }),
    reveal: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const apiKeyRecord = await db.getApiKeyById(input.id, ctx.user.id);
        if (!apiKeyRecord) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'API Key 不存在' });
        }

        // 解密 API Key
        const { decrypt } = await import('./_core/crypto');
        let decryptedKey = apiKeyRecord.keyValue;
        try {
          const maybeDecrypted = decrypt(apiKeyRecord.keyValue);
          if (typeof maybeDecrypted === "string") {
            decryptedKey = maybeDecrypted;
          }
        } catch (e) {
          // 解密失败，返回原始值
        }

        return { keyValue: decryptedKey };
      }),
    create: protectedProcedure
      .input(CreateApiKeyInput)
      .mutation(async ({ ctx, input }) => {
        // 加密 API Key
        const { encrypt } = await import('./_core/crypto');
        const encryptedKey = encrypt(input.keyValue);

        const id = await db.createApiKey({
          ...input,
          keyValue: encryptedKey,
          userId: ctx.user.id,
        });

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'create',
          resourceType: 'apiKey',
          resourceId: id,
          details: { name: input.name, provider: input.provider },
        });

        return { id };
      }),
    update: protectedProcedure
      .input(UpdateApiKeyInput)
      .mutation(async ({ ctx, input }) => {
        const { id, keyValue, ...data } = input;

        // 如果提供了新的 keyValue，需要加密
        if (keyValue) {
          const { encrypt } = await import('./_core/crypto');
          data.keyValue = encrypt(keyValue);
        }

        await db.updateApiKey(id, ctx.user.id, data);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'apiKey',
          resourceId: id,
        });

        return { success: true };
      }),
    test: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const startTime = Date.now();

        try {
          const apiKeyRecord = await db.getApiKeyById(input.id, ctx.user.id);
          if (!apiKeyRecord) {
            return { success: false, message: "API Key 不存在" };
          }
          if (!apiKeyRecord.keyValue) {
            return { success: false, message: "API Key 值未设置" };
          }

          // 解密 API Key
          const { decrypt } = await import('./_core/crypto');
          let decryptedKey: string = apiKeyRecord.keyValue;
          try {
            const maybeDecrypted = decrypt(apiKeyRecord.keyValue);
            if (typeof maybeDecrypted === "string") {
              decryptedKey = maybeDecrypted;
            }
          } catch (e) {
            console.error("解密失败，使用原始值");
          }

          // 提取第一个模型和 apiType
          let testModel: string | undefined;
          let apiType: "chat" | "images" = "chat";

          // 优先从 modelMetadata 中提取
          if (apiKeyRecord.modelMetadata) {
            try {
              const metadata = JSON.parse(apiKeyRecord.modelMetadata);
              const modelNames = Object.keys(metadata);
              if (modelNames.length > 0) {
                testModel = modelNames[0];
                apiType = metadata[testModel]?.apiType || "chat";
              }
            } catch (e) {
              console.error("解析 modelMetadata 失败");
            }
          }

          // 回退到 models 数组
          if (!testModel && apiKeyRecord.models) {
            try {
              const models = JSON.parse(apiKeyRecord.models);
              if (Array.isArray(models) && models.length > 0) {
                testModel = models[0];
              }
            } catch (e) {
              console.error("解析 models 失败");
            }
          }

          if (!testModel) {
            return { success: false, message: "未配置任何模型" };
          }

          // 调用测试函数
          const { testExternalModel } = await import('./_core/llm');
          await testExternalModel({
            apiKey: decryptedKey,
            baseUrl: apiKeyRecord.apiUrl || undefined,
            model: testModel,
            provider: apiKeyRecord.provider,
            apiType,
          });

          const latency = Date.now() - startTime;
          return {
            success: true,
            message: `连接正常，延迟 ${latency}ms`,
            latency
          };
        } catch (error: any) {
          const latency = Date.now() - startTime;
          const message = error?.message || "连接测试失败";
          return {
            success: false,
            message,
            latency
          };
        }
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteApiKey(input.id, ctx.user.id);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'delete',
          resourceType: 'apiKey',
          resourceId: input.id,
        });

        return { success: true };
      }),
  }),

  // ============ Marketplace Routes ============
  marketplace: router({
    listPublicPrompts: publicProcedure.query(async () => {
      return await db.getPublicPrompts();
    }),
    myFavorites: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserFavorites(ctx.user.id);
    }),
    toggleFavorite: protectedProcedure
      .input(z.object({ promptId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.toggleFavorite(ctx.user.id, input.promptId);
        return { success: true };
      }),
    getComments: publicProcedure
      .input(z.object({ promptId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPromptComments(input.promptId);
      }),
    addComment: protectedProcedure
      .input(z.object({
        promptId: z.number(),
        content: UserMessage,
        rating: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addPromptComment({
          ...input,
          userId: ctx.user.id,
        });
        return { success: true };
      }),
    importPrompt: protectedProcedure
      .input(z.object({ promptId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.importPromptToUser(input.promptId, ctx.user.id);
        return { id };
      }),
  }),

  // ============ Statistics Routes ============
  statistics: router({
    promptUsage: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPromptUsageStats(ctx.user.id);
    }),
    promptMeta: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPromptMetaStats(ctx.user.id);
    }),
    workflowUsage: protectedProcedure.query(async ({ ctx }) => {
      return await db.getWorkflowUsageStats(ctx.user.id);
    }),
    agentUsage: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAgentUsageStats(ctx.user.id);
    }),
    subscriptionStats: protectedProcedure.query(async () => {
      return await db.getSubscriptionStats();
    }),
  }),

  // ============ Batch Operations Routes ============
  batch: router({
    import: protectedProcedure
      .input(z.object({
        data: z.array(z.any()),
        type: z.enum(["prompts", "workflows", "agents"]),
      }))
      .mutation(async ({ ctx, input }) => {
        let count = 0;
        // Simple implementation - just count items
        count = input.data.length;
        return { count };
      }),
  }),

  // ============ Category Assistant Routes ============
  categoryAssistant: router({
    createConversation: protectedProcedure
      .mutation(async ({ ctx }) => {
        const id = await db.createCategoryAssistantConversation(ctx.user.id);
        return { id };
      }),
    getConversation: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getCategoryAssistantConversation(input.id, ctx.user.id);
      }),
    chat: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        message: UserMessage,
        fileContent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.chatWithCategoryAssistant(
          input.conversationId,
          ctx.user.id,
          input.message,
          input.fileContent
        );
      }),
    confirmAndCreate: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const conversation = await db.getCategoryAssistantConversation(input.conversationId, ctx.user.id);
        if (!conversation || !conversation.generatedCategories) {
          throw new Error("No categories to create");
        }
        
        const categories = JSON.parse(conversation.generatedCategories);
        
        // 创建一级分类
        const level1Result = await db.createScenario({
          name: categories.name,
          description: categories.description || null,
          level: 1,
          userId: ctx.user.id,
          isCustom: true,
        });
        
        // 创建二级分类
        for (const l2 of categories.children || []) {
          const level2Result = await db.createScenario({
            name: l2.name,
            description: l2.description || null,
            level: 2,
            parentId: level1Result,
            userId: ctx.user.id,
            isCustom: true,
          });
          
          // 创建三级分类
          for (const l3 of l2.children || []) {
            const l3Name = typeof l3 === 'string' ? l3 : l3.name;
            const l3Desc = typeof l3 === 'string' ? null : (l3.description || null);
            await db.createScenario({
              name: l3Name,
              description: l3Desc,
              level: 3,
              parentId: level2Result,
              userId: ctx.user.id,
              isCustom: true,
            });
          }
        }
        
        // 更新会话状态
        await db.updateCategoryAssistantConversation(input.conversationId, ctx.user.id, {
          status: "completed",
        });
        
        return { success: true };
      }),
  }),
  
  // Feishu Integration
  feishu: router({
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      return await db.getFeishuConfig(ctx.user.id);
    }),
    updateConfig: protectedProcedure
      .input(z.object({
        webhookUrl: SafeUrl,
        enabled: z.boolean(),
        syncOnCreate: z.boolean(),
        syncOnUpdate: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.upsertFeishuConfig(
          ctx.user.id,
          input.webhookUrl,
          input.enabled,
          input.syncOnCreate,
          input.syncOnUpdate
        );
      }),
    syncPrompt: protectedProcedure
      .input(z.object({ promptId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.syncPromptToFeishu(input.promptId, ctx.user.id);
        if (!success) throw new Error('同步失败');
        return { success: true };
      }),
  }),
  
  // ============ Category Template Marketplace Routes ============
  templateMarketplace: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCategoryTemplates();
    }),
    byIndustry: publicProcedure
      .input(z.object({ industry: z.string() }))
      .query(async ({ input }) => {
        return await db.getCategoryTemplatesByIndustry(input.industry);
      }),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCategoryTemplateById(input.id);
      }),
    import: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        levels: z.array(z.number().int().min(1).max(3)).optional(),
        dedupeStrategy: z.enum(['skip', 'overwrite']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.importCategoryTemplate(input.templateId, ctx.user.id, {
          levels: input.levels,
          dedupeStrategy: input.dedupeStrategy,
        });
        return { success: true, count: result.length, categories: result };
      }),
  }),

  // ============ Optimization History Routes ============
  optimizationHistory: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserOptimizationHistory(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getOptimizationHistoryById(input.id, ctx.user.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: PromptTitle.optional(),
        systemPrompt: PromptContent.optional(),
        conversationData: z.string(),
        settings: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createOptimizationHistory({
          ...input,
          userId: ctx.user.id,
        });
        return { success: true, id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: PromptTitle.optional(),
        systemPrompt: PromptContent.optional(),
        conversationData: z.string().optional(),
        settings: z.string().optional(),
        lastMessageAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateOptimizationHistory(id, ctx.user.id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteOptimizationHistory(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ Notification Routes ============
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserNotifications(ctx.user.id, input?.limit);
      }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotificationCount(ctx.user.id);
    }),
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationAsRead(input.id, ctx.user.id);
        return { success: true };
      }),
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteNotification(input.id, ctx.user.id);
        return { success: true };
      }),
    deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.deleteAllReadNotifications(ctx.user.id);
      return { success: true };
    }),
    create: protectedProcedure
      .input(z.object({
        type: z.enum(['system', 'subscription', 'operation', 'achievement']),
        title: SafeString,
        content: UserMessage,
        link: SafeUrl.optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createNotification({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),
  }),

  // ============ Subscription Routes ============
  subscription: router({
    // 获取当前用户订阅信息
    info: protectedProcedure.query(async ({ ctx }) => {
      const subscription = await db.getUserSubscription(ctx.user.id);
      return subscription;
    }),
    
    // 管理员：获取所有用户列表
    listAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('无权限访问');
      }
      return await db.getAllUsers();
    }),
    
    // 管理员：手动升级用户订阅
    upgradeUser: protectedProcedure
      .input(z.object({
        userId: z.number(),
        tier: z.enum(['free', 'basic', 'pro']),
        durationDays: z.number().optional(), // 订阅时长(天)
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }
        
        // 获取用户当前订阅信息
        const currentSub = await db.getUserSubscription(input.userId);
        const fromTier = currentSub?.subscriptionTier || 'free';
        
        const endDate = input.durationDays 
          ? new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000)
          : undefined;
        
        await db.updateUserSubscription(input.userId, {
          subscriptionTier: input.tier,
          subscriptionStatus: input.tier === 'free' ? undefined : 'active',
          subscriptionEndDate: endDate,
        });
        
        // 记录订阅历史
        const action = fromTier === 'free' && input.tier !== 'free' ? 'upgrade' : 
                      fromTier !== 'free' && input.tier === 'free' ? 'downgrade' : 'renew';
        await db.createSubscriptionHistory({
          userId: input.userId,
          action,
          fromTier,
          toTier: input.tier,
          durationDays: input.durationDays,
          operatorId: ctx.user.id,
          note: '管理员手动操作',
        });
        
        // 发送通知
        if (input.tier !== 'free') {
          const tierNames = { basic: '基础版', pro: '专业版', free: '免费版' };
          await db.createNotification({
            userId: input.userId,
            type: 'subscription',
            title: '订阅已开通',
            content: `管理员已为您开通${tierNames[input.tier]}，感谢支持！`,
            link: '/subscription',
          });
        }

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'subscription',
          resourceId: input.userId,
          details: {
            targetUserId: input.userId,
            fromTier,
            toTier: input.tier,
            durationDays: input.durationDays,
          },
        });

        return { success: true };
      }),
    

    
    // 管理员：手动触发订阅到期检查(测试用)
    checkExpiry: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }
        
        const { checkAndSendExpiryReminders, checkAndHandleExpiredSubscriptions } = await import('./jobs/subscriptionReminder');
        
        // 发送到期提醒(提前3天)
        const remindersCount = await checkAndSendExpiryReminders(3);
        
        // 处理已过期的订阅
        const expiredCount = await checkAndHandleExpiredSubscriptions();
        
        return {
          success: true,
          remindersCount,
          expiredCount,
        };
      }),
    
    // 获取当前用户订阅历史
    history: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserSubscriptionHistory(ctx.user.id);
    }),
    
    // 管理员：获取所有订阅历史
    allHistory: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('无权限访问');
      }
      return await db.getAllSubscriptionHistory();
    }),
    
    // 检查功能限制
    checkLimit: protectedProcedure
      .input(z.object({
        feature: z.enum(['maxPrompts', 'maxOptimizations', 'maxAgents', 'maxWorkflows']),
      }))
      .query(async ({ ctx, input }) => {
        const { checkFeatureLimit, getUserPlan } = await import('./products');
        const subscription = await db.getUserSubscription(ctx.user.id);
        const userTier = subscription?.subscriptionTier || 'free';
        const plan = getUserPlan(userTier);
        
        let currentCount = 0;
        if (input.feature === 'maxPrompts') {
          const result = await db.checkPromptLimit(ctx.user.id, plan.features.maxPrompts);
          currentCount = result.current;
        } else if (input.feature === 'maxOptimizations') {
          const result = await db.checkOptimizationLimit(ctx.user.id, plan.features.maxOptimizations);
          currentCount = result.current;
        }
        
        const limit = checkFeatureLimit(userTier, input.feature, currentCount);
        return { ...limit, current: currentCount };
      }),
  }),

  // ============ Coupon Routes ============
  coupons: router({
    // 管理员：获取所有优惠券
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('无权限访问');
      }
      return await db.getAllCoupons();
    }),

    // 用户：获取公开优惠券列表
    public: publicProcedure.query(async () => {
      return await db.getPublicCoupons();
    }),

    // 用户：获取我的定向优惠券
    myTargeted: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserTargetedCoupons(ctx.user.id);
    }),

    // 管理员：创建优惠券
    create: protectedProcedure
      .input(z.object({
        code: SafeString.refine(val => val.length >= 1 && val.length <= 50, {
          message: '优惠券码长度必须在1-50个字符之间'
        }),
        discountType: z.enum(['percentage', 'fixed']),
        discountValue: z.number().min(1),
        tier: z.enum(['basic', 'pro']).optional(),
        maxUses: z.number().optional(),
        expiresAt: z.date().optional(),
        isPublic: z.boolean().optional(),
        targetUserId: z.number().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }

        // 验证：公开券和定向券互斥
        if (input.isPublic && input.targetUserId) {
          throw new Error('公开券和定向券不能同时设置');
        }

        // 检查优惠券码是否已存在
        const existing = await db.getCouponByCode(input.code);
        if (existing) {
          throw new Error('优惠券码已存在');
        }

        const id = await db.createCoupon({
          ...input,
          createdBy: ctx.user.id,
        });

        return { success: true, id };
      }),

    // 用户：验证优惠券
    validate: protectedProcedure
      .input(z.object({
        code: z.string(),
        tier: z.enum(['basic', 'pro']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.validateCoupon(input.code, input.tier, ctx.user.id);
      }),
    
    // 管理员：更新优惠券
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.boolean().optional(),
        maxUses: z.number().optional(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }
        
        const { id, ...updates } = input;
        await db.updateCoupon(id, updates);
        
        return { success: true };
      }),
    
    // 管理员：删除优惠券
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }
        
        await db.deleteCoupon(input.id);
        
        return { success: true };
      }),
    
    // 管理员：查看优惠券使用历史
    usage: protectedProcedure
      .input(z.object({ couponId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }

        return await db.getCouponUsageHistory(input.couponId);
      }),
  }),

  // ============ Audit Log Routes ============
  auditLogs: router({
    // 管理员：获取所有审计日志
    list: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        resourceType: z.string().optional(),
        action: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }
        return await db.getAllAuditLogs(
          input?.limit || 100,
          input?.offset || 0,
          input?.resourceType,
          input?.action
        );
      }),

    // 获取当前用户的审计日志
    myLogs: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getAuditLogsByUser(ctx.user.id, input?.limit || 50);
      }),

    // 管理员：按资源查询审计日志
    byResource: protectedProcedure
      .input(z.object({
        resourceType: z.enum(['prompt', 'workflow', 'agent', 'category', 'scenario', 'apiKey', 'subscription', 'coupon', 'user', 'share', 'image']),
        resourceId: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }
        return await db.getAuditLogs({
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          limit: input.limit || 50,
        });
      }),
  }),

  // ============ Rate Limit Management Routes ============
  rateLimit: router({
    // 管理员：获取速率限制配置
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('无权限访问');
      }
      const { getRateLimitConfig } = await import('./middleware/rateLimit');
      return getRateLimitConfig();
    }),

    // 管理员：设置全局开关
    setGlobalEnabled: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }
        const { setGlobalEnabled } = await import('./middleware/rateLimit');
        setGlobalEnabled(input.enabled);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'user', // 使用user类型
          resourceId: ctx.user.id,
          details: { action: 'setRateLimitGlobal', enabled: input.enabled },
        });

        return { success: true, enabled: input.enabled };
      }),

    // 管理员：更新特定限制配置
    updateConfig: protectedProcedure
      .input(z.object({
        type: z.enum(['optimize', 'import', 'createShare', 'general', 'imageGeneration']),
        tier: z.string(),
        updates: z.object({
          windowMs: z.number().optional(),
          maxRequests: z.number().optional(),
          message: z.string().optional(),
          enabled: z.boolean().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }
        const { updateRateLimitConfig } = await import('./middleware/rateLimit');
        const success = updateRateLimitConfig(input.type, input.tier, input.updates);

        if (success) {
          // 记录审计日志
          await db.createAuditLog({
            userId: ctx.user.id,
            action: 'update',
            resourceType: 'user',
            resourceId: ctx.user.id,
            details: {
              action: 'updateRateLimitConfig',
              type: input.type,
              tier: input.tier,
              updates: input.updates
            },
          });
        }

        return { success };
      }),

    // 管理员：应用预设配置
    applyPreset: protectedProcedure
      .input(z.object({ preset: z.enum(['strict', 'relaxed', 'unlimited']) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }
        const { applyPreset } = await import('./middleware/rateLimit');
        applyPreset(input.preset);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'user',
          resourceId: ctx.user.id,
          details: { action: 'applyRateLimitPreset', preset: input.preset },
        });

        return { success: true };
      }),

    // 管理员：获取所有速率限制记录
    getAllRecords: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('无权限访问');
      }
      const { getAllRateLimitRecords } = await import('./middleware/rateLimit');
      return getAllRateLimitRecords();
    }),

    // 管理员：重置用户速率限制
    resetUserLimit: protectedProcedure
      .input(z.object({
        userId: z.number(),
        type: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }
        const { resetUserRateLimit } = await import('./middleware/rateLimit');
        resetUserRateLimit(input.userId, input.type);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'user',
          resourceId: input.userId,
          details: { action: 'resetRateLimit', type: input.type },
        });

        return { success: true };
      }),

    // 管理员：清空所有速率限制记录
    clearAll: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('无权限访问');
      }
      const { clearAllRateLimits } = await import('./middleware/rateLimit');
      clearAllRateLimits();

      // 记录审计日志
      await db.createAuditLog({
        userId: ctx.user.id,
        action: 'update',
        resourceType: 'user',
        resourceId: ctx.user.id,
        details: { action: 'clearAllRateLimits' },
      });

      return { success: true };
    }),

    // 用户：查看自己的速率限制状态
    myStatus: protectedProcedure
      .input(z.object({ type: z.enum(['optimize', 'import', 'createShare', 'general', 'imageGeneration']) }))
      .query(async ({ ctx, input }) => {
        const { getRateLimitStatus, getRateLimitConfig } = await import('./middleware/rateLimit');
        const status = getRateLimitStatus(ctx.user.id, input.type, ctx.user.subscriptionTier as 'free' | 'basic' | 'pro' | 'admin');
        const config = getRateLimitConfig();

        return {
          ...status,
          globalEnabled: config.globalEnabled,
          typeEnabled: (config.limits as any)[input.type]?.enabled || false,
        };
      }),
  }),

  // ============ Image Generation Routes ============
  imageGeneration: router({
    // 生成图片
    generate: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1, '提示词不能为空').max(2000, '提示词不能超过2000个字符'),
        model: z.string().min(1, '请选择模型'),
        apiKeyId: z.number().optional(),
        parameters: z.object({
          size: z.string().optional(), // e.g. "1024x1024"
          n: z.number().min(1).max(10).optional(), // 生成图片数量
          quality: z.enum(['standard', 'hd']).optional(),
          style: z.enum(['vivid', 'natural']).optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 应用速率限制
        const { checkRateLimit, RATE_LIMITS } = await import('./middleware/rateLimit');
        const subscription = await db.getUserSubscription(ctx.user.id);
        const tier = (ctx.user.role === 'admin' ? 'admin' : subscription?.subscriptionTier || 'free') as 'free' | 'basic' | 'pro' | 'admin';
        const rateLimitConfig = RATE_LIMITS.imageGeneration[tier];
        const rateLimitResult = checkRateLimit(`imageGeneration:${ctx.user.id}`, rateLimitConfig);

        if (!rateLimitResult.allowed) {
          const resetDate = new Date(rateLimitResult.resetTime);
          throw new Error(
            `${rateLimitConfig.message}。重置时间：${resetDate.toLocaleTimeString('zh-CN')}`
          );
        }

        const database = await db.db;
        if (!database) throw new Error('数据库连接失败');

        // 验证 API Key 所有权（如果提供）
        if (input.apiKeyId) {
          const apiKey = await database
            .select()
            .from(db.apiKeys)
            .where(db.and(
              db.eq(db.apiKeys.id, input.apiKeyId),
              db.eq(db.apiKeys.userId, ctx.user.id)
            ))
            .limit(1);

          if (apiKey.length === 0) {
            throw new Error('API Key 不存在或无权访问');
          }
        }

        // 创建数据库记录
        const [generationRecord] = await database.insert(db.imageGenerations).values({
          userId: ctx.user.id,
          prompt: input.prompt,
          model: input.model,
          apiKeyId: input.apiKeyId || null,
          imageUrls: '[]', // 初始为空数组
          parameters: input.parameters ? JSON.stringify(input.parameters) : null,
          status: 'pending',
        }).$returningId();

        const generationId = generationRecord.id;

        try {
          // 调用内部生图API（使用 Forge）
          const { generateImage } = await import('./_core/imageGeneration');
          const n = input.parameters?.n || 1;
          const imageUrls: string[] = [];

          // 获取并解密用户的 API Key（如果提供）
          let userApiKey: string | undefined;
          let userApiUrl: string | undefined;
          if (input.apiKeyId) {
            const apiKeyRecord = await db.getApiKeyById(input.apiKeyId, ctx.user.id);
            if (apiKeyRecord && apiKeyRecord.keyValue) {
              const { decrypt } = await import('./_core/crypto');
              try {
                const decrypted = decrypt(apiKeyRecord.keyValue);
                if (typeof decrypted === "string") {
                  userApiKey = decrypted;
                }
              } catch (e) {
                // 如果解密失败，可能是未加密的旧数据
                console.error("API Key 解密失败，尝试使用原始值");
                userApiKey = apiKeyRecord.keyValue;
              }
              userApiUrl = apiKeyRecord.apiUrl || undefined;
            }
          }

          // 生成多张图片
          for (let i = 0; i < n; i++) {
            const result = await generateImage({
              prompt: input.prompt,
              model: input.model,                      // ✅ 传递模型
              size: input.parameters?.size,            // ✅ 传递尺寸
              quality: input.parameters?.quality,      // ✅ 传递质量
              style: input.parameters?.style,          // ✅ 传递风格
              apiKey: userApiKey,                      // ✅ 传递用户 API Key
              apiUrl: userApiUrl,                      // ✅ 传递用户 API URL
            });
            if (result.url) {
              imageUrls.push(result.url);
            }
          }

          // 更新记录为成功
          await database.update(db.imageGenerations)
            .set({
              imageUrls: JSON.stringify(imageUrls),
              status: 'success',
            })
            .where(db.eq(db.imageGenerations.id, generationId));

          // 记录审计日志
          await db.createAuditLog({
            userId: ctx.user.id,
            action: 'create',
            resourceType: 'image',
            resourceId: generationId,
            details: {
              model: input.model,
              prompt: input.prompt.substring(0, 100),
              imageCount: imageUrls.length,
            },
          });

          return {
            id: generationId,
            images: imageUrls.map(url => ({ url })),
          };
        } catch (error: any) {
          // 更新记录为失败
          await database.update(db.imageGenerations)
            .set({
              status: 'failed',
              errorMessage: error.message || '生成失败',
            })
            .where(db.eq(db.imageGenerations.id, generationId));

          throw error;
        }
      }),

    // 获取生成历史列表
    getHistory: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const database = await db.db;
        if (!database) return [];

        const limit = input.limit || 20;
        const offset = input.offset || 0;

        const records = await database
          .select()
          .from(db.imageGenerations)
          .where(db.eq(db.imageGenerations.userId, ctx.user.id))
          .orderBy(db.desc(db.imageGenerations.createdAt))
          .limit(limit)
          .offset(offset);

        return records.map(record => {
          let imageUrls: string[] = [];
          let parameters: any = null;

          // 安全解析 JSON
          try {
            imageUrls = JSON.parse(record.imageUrls);
          } catch (e) {
            console.error('Failed to parse imageUrls:', e);
            imageUrls = [];
          }

          try {
            parameters = record.parameters ? JSON.parse(record.parameters) : null;
          } catch (e) {
            console.error('Failed to parse parameters:', e);
            parameters = null;
          }

          return {
            ...record,
            imageUrls,
            parameters,
          };
        });
      }),

    // 获取单个生成记录
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const database = await db.db;
        if (!database) throw new Error('数据库连接失败');

        const record = await database
          .select()
          .from(db.imageGenerations)
          .where(db.eq(db.imageGenerations.id, input.id))
          .limit(1);

        if (record.length === 0) {
          throw new Error('记录不存在');
        }

        if (record[0].userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new Error('无权限访问');
        }

        let imageUrls: string[] = [];
        let parameters: any = null;

        // 安全解析 JSON
        try {
          imageUrls = JSON.parse(record[0].imageUrls);
        } catch (e) {
          console.error('Failed to parse imageUrls:', e);
          imageUrls = [];
        }

        try {
          parameters = record[0].parameters ? JSON.parse(record[0].parameters) : null;
        } catch (e) {
          console.error('Failed to parse parameters:', e);
          parameters = null;
        }

        return {
          ...record[0],
          imageUrls,
          parameters,
        };
      }),

    // 删除生成记录
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.db;
        if (!database) throw new Error('数据库连接失败');

        const record = await database
          .select()
          .from(db.imageGenerations)
          .where(db.eq(db.imageGenerations.id, input.id))
          .limit(1);

        if (record.length === 0) {
          throw new Error('记录不存在');
        }

        if (record[0].userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new Error('无权限删除');
        }

        await database.delete(db.imageGenerations)
          .where(db.eq(db.imageGenerations.id, input.id));

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'delete',
          resourceType: 'image',
          resourceId: input.id,
          details: {
            prompt: record[0].prompt.substring(0, 100),
          },
        });

        return { success: true };
      }),
  }),

  // ============ Invitation Code Routes ============
  invitationCodes: router({
    // Public: Validate invitation code (with rate limiting)
    validate: publicProcedure
      .input(z.object({ code: z.string().min(1).max(50) }))
      .query(async ({ input, ctx }) => {
        // Rate limiting: 5 attempts per 15 minutes per IP
        const identifier = ctx.req?.ip || 'unknown';
        const rateLimit = checkRateLimit(identifier, {
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: 5,
        });

        if (rateLimit.limited) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: '验证次数过多，请稍后再试',
          });
        }

        return await db.validateInvitationCode(input.code);
      }),

    // Admin: Get all invitation codes
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权限访问',
        });
      }
      return await db.getAllInvitationCodes();
    }),

    // Admin: Generate invitation code
    generate: protectedProcedure
      .input(z.object({
        code: z.string().min(1).max(50).optional(),
        description: z.string().optional(),
        maxUses: z.number().int().positive().optional(),
        expiresAt: z.date().optional(),
        grantTier: z.enum(['free', 'basic', 'pro']).optional(),
        grantDays: z.number().int().nonnegative().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权限访问',
          });
        }

        const id = await db.generateInvitationCode({
          ...input,
          createdBy: ctx.user.id,
        });

        // Record audit log
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'create',
          resourceType: 'invitationCode',
          resourceId: id,
          details: {
            code: input.code || 'auto-generated',
            maxUses: input.maxUses,
            grantTier: input.grantTier,
          },
        });

        return { success: true, id };
      }),

    // Admin: View invitation code usage history
    usage: protectedProcedure
      .input(z.object({ codeId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权限访问',
          });
        }

        return await db.getInvitationCodeUsage(input.codeId);
      }),

    // Admin: Toggle invitation code active status
    toggle: protectedProcedure
      .input(z.object({
        codeId: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权限访问',
          });
        }

        await db.toggleInvitationCode(input.codeId, input.isActive);

        // Record audit log
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'invitationCode',
          resourceId: input.codeId,
          details: {
            action: input.isActive ? 'enable' : 'disable',
          },
        });

        return { success: true };
      }),

    // Admin: Delete invitation code
    delete: protectedProcedure
      .input(z.object({ codeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权限访问',
          });
        }

        await db.deleteInvitationCode(input.codeId);

        // Record audit log
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'delete',
          resourceType: 'invitationCode',
          resourceId: input.codeId,
          details: {},
        });

        return { success: true };
      }),
  }),

  // ============ Site Settings Routes (Admin Only) ============
  siteSettings: router({
    // 获取所有设置（管理员）
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权限访问',
        });
      }
      return await db.getAllSiteSettings();
    }),

    // 获取公开设置（所有用户可访问）
    publicSettings: publicProcedure.query(async () => {
      return await db.getPublicSiteSettings();
    }),

    // 获取单个设置
    get: protectedProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权限访问',
          });
        }
        return await db.getSiteSetting(input.key);
      }),

    // 设置或更新
    set: protectedProcedure
      .input(z.object({
        key: z.string().min(1).max(100),
        value: z.string(),
        description: z.string().optional(),
        type: z.enum(['string', 'number', 'boolean', 'json']).optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权限访问',
          });
        }

        await db.setSiteSetting({
          ...input,
          updatedBy: ctx.user.id,
        });

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update',
          resourceType: 'setting',
          resourceId: 0, // 设置没有数字ID
          details: { key: input.key, value: input.value },
        });

        return { success: true };
      }),

    // 删除设置
    delete: protectedProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '无权限访问',
          });
        }

        await db.deleteSiteSetting(input.key);

        // 记录审计日志
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'delete',
          resourceType: 'setting',
          resourceId: 0,
          details: { key: input.key },
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
