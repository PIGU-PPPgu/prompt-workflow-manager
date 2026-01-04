import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startSubscriptionReminderJob } from "../jobs/subscriptionReminder";
import { checkRateLimit } from "../utils/rateLimit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ============ 安全配置 ============

  // 1. 请求体大小限制（防止DoS攻击）
  // 全局限制为 1MB，对于普通 API 请求已经足够
  // 如果需要文件上传，应在特定路由单独配置
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // 2. 基础速率限制（防止滥用）
  // 只对 API 路由限制，不限制静态资源（HTML、CSS、JS、图片等）
  // 每个 IP 限制：200 req/min（全局 API）
  app.use("/api", (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    const result = checkRateLimit(`global:${ip}`, {
      windowMs: 60 * 1000, // 1 分钟
      maxRequests: 200, // 200 次请求
    });

    if (result.limited) {
      res.status(429).json({
        error: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      });
      return;
    }

    next();
  });

  // ============ tRPC API ============
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ============ 静态文件服务 ============
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // 启动订阅到期提醒定时任务
    startSubscriptionReminderJob();
  });
}

startServer().catch(console.error);
