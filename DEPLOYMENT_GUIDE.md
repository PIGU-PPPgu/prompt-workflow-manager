# TeachPT 部署和维护指南

## 📋 目录
- [部署方案选择](#部署方案选择)
- [SaaS 模式部署（推荐）](#saas-模式部署推荐)
- [后端维护策略](#后端维护策略)
- [成本预算](#成本预算)
- [扩展性方案](#扩展性方案)

---

## 部署方案选择

### 方案对比

| 维度 | SaaS 模式 | 私有部署 |
|------|-----------|----------|
| 用户体验 | ⭐⭐⭐⭐⭐ 直接访问网址 | ⭐⭐⭐ 需要部署 |
| 维护成本 | ⭐⭐⭐⭐⭐ 统一维护 | ⭐⭐ 每个客户单独维护 |
| 数据安全 | ⭐⭐⭐⭐ 云端隔离 | ⭐⭐⭐⭐⭐ 本地私有 |
| 扩展性 | ⭐⭐⭐⭐⭐ 易扩展 | ⭐⭐ 按客户扩展 |
| 盈利模式 | 订阅制 SaaS | 一次性部署费 |

**推荐**：优先选择 **SaaS 模式**，后期可提供私有部署选项。

---

## SaaS 模式部署（推荐）

### 1. 技术栈选择

#### 方案 A：全国内方案（速度快，稳定）

```yaml
前端部署: Vercel（自动部署）或阿里云 OSS
后端服务: 阿里云 ECS（1核2G起步，¥50/月）
数据库: 阿里云 RDS MySQL（基础版 ¥100/月）
认证: Supabase（免费版 50,000 MAU）
对象存储: 阿里云 OSS（图片存储，¥0.12/GB）
域名 + SSL: 阿里云（¥60/年 + 免费SSL）
```

**月成本**：¥150-200（100个用户内）

#### 方案 B：国际方案（自动化程度高）

```yaml
前端部署: Vercel（免费）
后端服务: Railway/Render（¥5-20/月）
数据库: PlanetScale（免费 5GB）或 Supabase Postgres
认证: Supabase（免费）
对象存储: Cloudflare R2（免费 10GB）
域名: Cloudflare（¥10/年）
```

**月成本**：¥5-50（起步阶段几乎免费）

---

### 2. 部署步骤（以阿里云为例）

#### Step 1: 购买服务器和数据库

```bash
# 服务器配置
CPU: 1核 或 2核
内存: 2GB 或 4GB
带宽: 1Mbps（够100个并发用户）
系统: Ubuntu 22.04 LTS

# 数据库配置
RDS MySQL 8.0
基础版 1核1G，20GB存储
```

#### Step 2: 服务器初始化

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2（进程管理）
npm install -g pm2

# 安装 MySQL 客户端
sudo apt-get install mysql-client
```

#### Step 3: 部署应用

```bash
# 克隆代码（或上传打包好的代码）
git clone <your-repo> /var/www/teachpt
cd /var/www/teachpt

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
nano .env  # 修改数据库、API密钥等配置

# 构建前端
npm run build

# 启动服务（使用 PM2）
pm2 start npm --name "teachpt" -- start
pm2 save
pm2 startup  # 设置开机自启
```

#### Step 4: 配置 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/teachpt
server {
    listen 80;
    server_name teachpt.yourdomain.com;

    # 静态文件
    location / {
        root /var/www/teachpt/dist/client;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:1060;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/teachpt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 安装 SSL 证书（Let's Encrypt 免费）
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d teachpt.yourdomain.com
```

#### Step 5: 数据库迁移

```bash
# 连接到 RDS 数据库
mysql -h rm-xxx.mysql.rds.aliyuncs.com -u root -p

# 创建数据库
CREATE DATABASE prompt_workflow_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 运行迁移
cd /var/www/teachpt
npx drizzle-kit push

# 导入初始场景数据
node seed-scenarios-education-v3.mjs
```

---

### 3. 后端维护策略

#### 日常维护

```bash
# 查看日志
pm2 logs teachpt

# 重启服务
pm2 restart teachpt

# 更新代码
cd /var/www/teachpt
git pull
npm install
npm run build
pm2 restart teachpt

# 数据库备份（每日自动）
# 在 crontab 中添加
0 2 * * * mysqldump -h <rds-host> -u root -p<password> prompt_workflow_manager > /backup/db_$(date +\%Y\%m\%d).sql
```

#### 监控和告警

**推荐工具**：
- **UptimeRobot**（免费）：监控网站可用性，宕机邮件通知
- **阿里云监控**：CPU、内存、磁盘使用率告警
- **Sentry**（免费版）：前后端错误追踪

```bash
# 安装 Sentry SDK（可选）
npm install @sentry/node @sentry/react
```

#### 数据备份策略

1. **数据库自动备份**（RDS 自带，保留 7 天）
2. **手动导出重要数据**（每周一次）
   ```bash
   mysqldump -h <host> -u root -p prompt_workflow_manager > backup_$(date +%Y%m%d).sql
   ```
3. **代码版本控制**（Git 管理）

---

## 成本预算

### 初期（0-100 个用户）

| 项目 | 国内方案 | 国际方案 |
|------|----------|----------|
| 服务器 | ¥50/月 | $5/月 (¥35) |
| 数据库 | ¥100/月 | 免费 |
| 对象存储 | ¥10/月 | 免费 |
| 域名 + SSL | ¥60/年 | $10/年 (¥70) |
| **月总成本** | **¥165** | **¥40** |

### 中期（100-1000 个用户）

| 项目 | 国内方案 | 国际方案 |
|------|----------|----------|
| 服务器 | ¥200/月（2核4G） | $20/月 (¥140) |
| 数据库 | ¥300/月（高可用） | $25/月 (¥175) |
| CDN | ¥50/月 | 免费（Cloudflare） |
| **月总成本** | **¥550** | **¥315** |

### 后期（1000+ 用户）

- 考虑使用负载均衡
- 数据库读写分离
- Redis 缓存层
- **月成本**：¥1000-3000

---

## 扩展性方案

### 性能优化

1. **数据库优化**
   - 添加索引（scenarios, prompts 表）
   - 查询缓存（Redis）
   - 读写分离

2. **API 优化**
   - 分页加载（大列表）
   - 懒加载（图片）
   - 接口缓存

3. **CDN 加速**
   - 静态资源上传到 OSS/Cloudflare
   - 前端页面通过 CDN 分发

### 多租户隔离

```typescript
// 在所有查询中添加 userId 过滤
export async function getPrompts(userId: number) {
  return db.select()
    .from(prompts)
    .where(eq(prompts.userId, userId));
}

// 场景支持系统预设 + 用户自定义
export async function getScenarios(userId: number) {
  return db.select()
    .from(scenarios)
    .where(
      or(
        eq(scenarios.isCustom, false),  // 系统预设
        eq(scenarios.userId, userId)    // 用户自定义
      )
    );
}
```

### 功能迭代策略

**推荐工作流**：
```bash
开发环境（本地） → 测试环境（测试服务器） → 生产环境（正式服务器）

# 灰度发布
1. 新功能先对 10% 用户开放
2. 监控错误率和性能
3. 逐步扩大到 50% → 100%
```

---

## 运维工具推荐

### 部署自动化

```yaml
# .github/workflows/deploy.yml（GitHub Actions）
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: root
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/teachpt
            git pull
            npm install
            npm run build
            pm2 restart teachpt
```

### 监控面板

**推荐**：Grafana + Prometheus

```bash
# 安装 PM2 metrics
pm2 install pm2-metrics

# 访问 http://your-server:9209/metrics
```

---

## 常见问题

### Q1: 用户数据如何隔离？
A: 所有数据表添加 `userId` 字段，查询时强制过滤。

### Q2: 如何防止滥用？
A: 实施 API 限流（已有 rateLimit 中间件）、用量监控、付费套餐。

### Q3: 数据丢失怎么办？
A: RDS 自动备份 + 每日手动导出 SQL 文件到 OSS。

### Q4: 性能瓶颈在哪？
A: 初期是数据库查询，中期是 API 并发，后期是存储。

---

## 盈利模式建议

### 免费版（吸引用户）
- 20 个提示词
- 5 个工作流
- 基础 AI 优化（每日 10 次）

### 专业版（¥29/月）
- 无限提示词
- 无限工作流
- 无限 AI 优化
- 团队协作（5人）

### 企业版（¥299/月）
- 专业版所有功能
- 私有部署支持
- 数据导出
- 优先技术支持

---

**总结**：
1. **起步阶段**：用国际方案（几乎免费），快速验证产品
2. **有用户后**：迁移到国内服务器（速度更快）
3. **规模化后**：考虑团队协作、企业部署等增值服务

**下一步建议**：
1. 先在 Railway/Render 免费部署测试
2. 邀请 10-20 个教师内测
3. 收集反馈优化产品
4. 正式上线推广
