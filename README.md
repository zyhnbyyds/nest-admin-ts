# nest-admin

基于 NestJS 12 + Fastify + Drizzle ORM + MySQL 的通用后台管理 API。

[![Node.js](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.4-orange)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## 功能模块

| 模块           | 说明                                                             |
| -------------- | ---------------------------------------------------------------- |
| **认证鉴权**   | JWT 双 token（access + refresh）、HS256 签名、密码 argon2id 哈希 |
| **用户管理**   | 用户 CRUD、角色分配、状态管理、软删除                            |
| **角色管理**   | 角色 CRUD、菜单权限分配、数据权限范围                            |
| **菜单管理**   | 树形菜单 CRUD、按钮权限标识、前端路由数据                        |
| **部门管理**   | 树形部门 CRUD、祖级路径维护                                      |
| **岗位管理**   | 岗位 CRUD、用户岗位关联                                          |
| **字典管理**   | 字典类型 / 字典数据 CRUD、按类型获取启用项                       |
| **参数配置**   | 系统配置项 CRUD、按键查询、内置参数保护                          |
| **登录日志**   | 登录记录查询、删除、清空                                         |
| **操作日志**   | 基于拦截器的增删改操作自动审计                                   |
| **在线用户**   | Redis 会话跟踪、强制下线                                         |
| **定时任务**   | Cron 调度、手动执行、执行日志                                    |
| **文件管理**   | 上传（multipart）、下载、类型/大小校验                           |
| **代码生成器** | 读取 information_schema 自动生成模块脚手架                       |
| **健康检查**   | `GET /health` 免认证                                             |
| **Swagger**    | 开发环境自动启用，路径 `/api/v1/docs`                            |

## 技术栈

- **框架**：NestJS 11 + Fastify
- **ORM**：Drizzle ORM 1.0（MySQL）
- **校验**：Zod 4
- **认证**：jose（JWT）+ argon2（密码）
- **缓存**：ioredis（可选）
- **调度**：@nestjs/schedule + cron
- **文档**：@nestjs/swagger
- **测试**：vitest + @vitest/coverage-v8
- **Lint**：oxlint + oxfmt

## 快速开始

### 环境要求

- Node.js >= 24 或 Bun >= 1.4
- MySQL 8
- Redis（可选，不配置则缓存/在线用户/任务模块自动降级）

### 安装运行

```bash
# 1. 克隆项目
git clone <repo-url>
cd nest-admin

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填写数据库连接等必须项

# 3. 安装依赖
bun install

# 4. 数据库迁移
bun run db:migrate

# 5. 初始化管理员
SEED_ADMIN_PASSWORD=your-password bun run db:seed

# 6. 启动开发服务
bun run dev
```

服务默认运行在 `http://localhost:3000`，Swagger 文档地址 `http://localhost:3000/api/v1/docs`。

### 默认管理员

| 用户名  | 密码                   |
| ------- | ---------------------- |
| `admin` | `db:seed` 时设置的密码 |

## 项目结构

```
src/
├── main.ts                         # 启动入口
├── app.module.ts                   # 根模块
├── config/                         # 环境变量配置（Zod）
├── database/
│   ├── schema/index.ts             # 全部表定义 + 关联（单文件）
│   ├── database.service.ts         # MySQL 连接池 + Drizzle 实例
│   ├── migrations/                 # SQL 迁移文件
│   └── seed/index.ts               # 管理员初始化脚本
├── common/
│   ├── auth/                       # JWT Guard、权限装饰器、公开路由装饰器
│   ├── cache/                      # Redis 封装
│   └── logging/                    # 操作日志拦截器
└── modules/
    ├── auth/                       # 登录 / 刷新 / 登出
    ├── system/                     # 用户、角色、菜单、部门、岗位、字典、配置
    ├── monitor/                    # 登录日志、操作日志、在线用户、缓存监控
    ├── jobs/                       # 定时任务
    ├── files/                      # 文件管理
    ├── generator/                  # 代码生成器
    ├── health/                     # 健康检查
    └── generated/                  # 代码生成器输出（gitignore）
```

## 环境变量

| 变量                 |  必填  | 默认值                  | 说明                           |
| -------------------- | :----: | ----------------------- | ------------------------------ |
| `NODE_ENV`           |   否   | `development`           | 运行环境                       |
| `PORT`               |   否   | `3000`                  | 服务端口                       |
| `API_PREFIX`         |   否   | `api/v1`                | API 前缀                       |
| `DATABASE_URL`       | **是** | —                       | MySQL 连接字符串               |
| `REDIS_URL`          |   否   | —                       | Redis 连接（可选）             |
| `JWT_ISSUER`         | **是** | —                       | JWT 签发者                     |
| `JWT_AUDIENCE`       | **是** | —                       | JWT 受众                       |
| `JWT_ACCESS_SECRET`  | **是** | —                       | Access Token 密钥（≥32 字符）  |
| `JWT_REFRESH_SECRET` | **是** | —                       | Refresh Token 密钥（≥32 字符） |
| `JWT_ACCESS_TTL`     |   否   | `15m`                   | Access Token 有效期            |
| `JWT_REFRESH_TTL`    |   否   | `7d`                    | Refresh Token 有效期           |
| `CORS_ORIGINS`       |   否   | `http://localhost:5173` | CORS 允许来源（逗号分隔）      |
| `UPLOAD_DIR`         |   否   | `uploads`               | 文件上传目录                   |
| `SWAGGER_ENABLED`    |   否   | `true`                  | 是否启用 Swagger               |
| `SWAGGER_PATH`       |   否   | `docs`                  | Swagger 路径                   |

## 命令

```bash
bun run dev              # 开发模式
bun run build            # 编译
bun run start            # 生产启动
bun run typecheck        # 类型检查
bun run lint             # 代码检查
bun run lint:fix         # 自动修复
bun run format           # 格式化
bun run test             # 运行测试
bun run test:watch       # 监听测试
bun run db:generate      # 生成迁移文件
bun run db:migrate       # 执行迁移
bun run db:seed          # 初始化管理员
bun run db:studio        # 打开 Drizzle Studio
```

## 测试

```bash
bun run test             # 229 个测试用例，全部通过
bun run test:watch       # 监听模式
```

测试覆盖全部 Controller、Service、Guard、Interceptor 和工具函数。每个测试完全隔离，不依赖数据库。

## 部署到 Vercel

本仓库配置为**单项目部署**：前端 SPA 与 NestJS API 合并为一个 Vercel 项目（同源 `/api/v1`，无需配置 CORS 跨域）。后端使用 Vercel 的 **Bun 运行时**（Beta，见 <https://vercel.com/docs/functions/runtimes/bun>），前端静态资源与 API 函数共存。

### 部署步骤

1. **准备外部依赖**（Vercel 是无状态 Serverless 平台，MySQL / Redis 需要自备）：
   - MySQL：任意公网可达实例，如 TiDB Cloud（MySQL 兼容，有免费档）、Aiven、自建 VPS；
   - Redis（可选）：如 Upstash、Redis Cloud。
2. **在 Vercel Dashboard 导入仓库**：Framework Preset 选 **Other**，Root Directory 保持仓库根目录（`.`）。
3. **配置环境变量**（Vercel → Project → Settings → Environment Variables，必填项与 `.env.example` 一致）：

   | 变量 | 必填 | 说明 |
   | --- | --- | --- |
   | `DATABASE_URL` | ✅ | 形如 `mysql://user:pass@host:3306/dbname` |
   | `JWT_ISSUER` / `JWT_AUDIENCE` | ✅ | 任意字符串 |
   | `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ✅ | 至少 32 位随机字符 |
   | `REDIS_URL` | ❌ | 不配则相关功能降级 |
   | `CORS_ORIGINS` | ❌ | 同源部署时可不配 |
   | `SWAGGER_ENABLED` | ❌ | 默认 `true`，文档地址 `/api/v1/docs` |

4. 推送代码触发部署。首次部署前用 `bun run db:migrate` + `bun run db:seed`（本机执行，指向同一数据库）初始化表结构和管理员账号。

### 部署机制

- **Bun 运行时**：`vercel.json` 中声明 `"bunVersion": "1.4.x"`，Vercel 会用 Bun 运行时执行 API 函数（若遇兼容问题可改回 `"1.x"`，即 Bun 1.3.14）；
- **API 函数**：`api/server.ts` 在模块启动时调用一次 `Bun.serve()`，Vercel 检测后把 `/api/*` 的请求路由给它；请求经标准 Web `Request` 转换后由 `fastify.inject()` 分发给 NestJS（冷启动缓存实例）；
- **构建工具链全程 bun**：`buildCommand` 为 `bun run build:vercel`（`scripts/vercel-build.mjs`），只构建前端 `web/dist`（`bun install` + `vite build`），由 `outputDirectory` 发布为静态资源。后端源码由 Vercel 在部署时直接编译，无需本地 `nest build`，也不需要 pnpm / npm / node；
- 路由：`/api/*` → `/api/server`（Bun 函数），其余路径 → SPA `index.html`；
- `dist/`、`uploads/`、`.env.*`、`.vercel*` 均已在 `.gitignore`，不会提交。

### 已知限制（Serverless 平台特性）

- **文件上传不持久**：`UPLOAD_DIR` 写入的是函数临时磁盘，实例回收即丢失。文件管理模块建议改为对象存储（S3/R2/OSS）；
- **定时任务不可靠**：`@nestjs/schedule` 依赖常驻进程。可在 Vercel 用 `crons` 定时请求暴露的 HTTP 任务接口替代；
- **Bun 运行时为 Beta**：函数包上限 5GB、最长执行时长 30 分钟（Beta 特性）；上传接口仍受 Vercel 请求体大小限制；
- **内存态限流/在线会话**：基于实例内存，多实例并发时不精确；
- 数据库连接池按函数实例各自建立，注意连接数上限（小实例数配置可缓解）。

### 可选：前后端拆分为两个 Vercel 项目

也可以只把 `web/` 部署为静态站（Root Directory 选 `web/`，已附 `web/vercel.json` 处理 SPA 路由），后端另部署到常驻平台（Railway / Render / Fly.io / VPS）。此时需在 Web 项目配置环境变量 `VITE_API_BASE_URL=https://<后端域名>/api/v1`，并在后端环境变量中把前端域名加入 `CORS_ORIGINS`。

## License

MIT
