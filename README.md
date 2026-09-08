# nest-admin-ts

**简体中文** | [English](./README.en.md)

基于 **NestJS 12 + Fastify + Drizzle ORM + MySQL** 的后台管理 API，配套 **Vue 3 + Vite** 的 Web 管理前端。

后台管理系统的完整解决方案：RBAC 权限、部门/岗位/字典/配置、操作与登录审计、定时任务、文件管理、代码生成器、Redis 监控，以及一个开箱即用的现代化前端界面。

[![Bun](https://img.shields.io/badge/bun-%3E%3D1.4-orange)](https://bun.sh)
[![NestJS](https://img.shields.io/badge/nestjs-12-red)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)](https://www.typescriptlang.org)
[![Vue](https://img.shields.io/badge/vue-3.5-green)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/vite-8-purple)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## 目录

- [界面预览](#界面预览)
- [Web 前端介绍](#web-前端介绍)
- [功能模块](#功能模块)
- [AI 操作助手](#ai-操作助手)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [环境变量](#环境变量)
- [命令](#命令)
- [测试](#测试)
- [License](#license)

## 界面预览

<img src="docs/screenshots/login.png"  alt="登录页" />
<img src="docs/screenshots/dashboard.png" alt="首页数据看板" />

## Web 前端介绍

管理前端位于 [`web/`](./web)，为独立的 **Vue 3 + Vite** 单页应用，与后端分离部署，通过 `/api` 代理联调。

### 技术栈

| 类别     | 选型                                            |
| -------- | ----------------------------------------------- |
| 框架     | Vue 3.5 + Vite 8 + TypeScript 5.9               |
| 路由     | Vue Router 5                                    |
| 状态管理 | Pinia 3                                         |
| UI 组件  | lew-ui                                          |
| 样式     | UnoCSS（原子化 CSS，按需生成）                  |
| 图表     | ECharts 6（首页登录趋势 / 状态分布 / 看板图表） |
| HTTP     | axios（JWT 自动刷新 + 并发刷新排队）            |
| 工具     | dayjs、lucide-vue-next、@vueuse/core            |
| 构建     | unplugin-auto-import + unplugin-vue-components  |

### 核心特性

- **登录与令牌**：JWT 双 token；访问令牌 401 时自动刷新并重放请求，刷新期间并发请求排队，多标签页时序安全。
- **权限驱动**：前端 `permission` 指令 + 路由守卫；按钮级权限由后端返回的权限码控制。
- **暗色主题**：基于 `lew-dark` 类名的暗色切换，图表随主题自动适配。
- **动态路由**：菜单/按钮权限由后端 `menus/routes` 逐级生成前端路由。
- **数据看板**：首页聚合用户/部门/角色/菜单/岗位统计，登录趋势与状态分布图表。
- **通用全屏表格**：封装 `useTable` 组合式函数，统一分页、查询、开关、删除确认。
- **路由标签页**：多级 Tab 多开、可关闭（首页固定）、右键「关闭当前/其他/全部」、横向滚动。
- **AI 操作助手**：Header 图标一键唤出 AI 面板；自然语言驱动后台操作，含审批确认闭环、真流式回复、操作结果持久化回显（详见下文「AI 操作助手」）。

### 页面清单

| 模块     | 路径                        | 说明                                 |
| -------- | --------------------------- | ------------------------------------ |
| 登录页   | `/login`                    | 登录                                 |
| 首页     | `/dashboard`                | 数据看板、登录趋势、最近登录         |
| 用户管理 | `/system/users`             | CRUD、角色分配、状态、软删除         |
| 角色管理 | `/system/roles`             | CRUD、菜单权限、数据权限             |
| 菜单管理 | `/system/menus`             | 树形菜单、按钮权限、前端路由         |
| 部门管理 | `/system/depts`             | 树形部门                             |
| 岗位管理 | `/system/posts`             | 岗位 CRUD、用户关联                  |
| 字典管理 | `/system/dicts`             | 字典类型 / 字典数据                  |
| 参数配置 | `/system/configs`           | 系统配置、内置参数保护               |
| 定时任务 | `/system/jobs`              | Cron 调度、手动执行、执行日志        |
| 文件管理 | `/files`                    | 上传 / 预览 / 下载                   |
| 登录日志 | `/monitor/login-logs`       | 记录查询、删除、清空                 |
| 操作日志 | `/monitor/operation-logs`   | 增删改操作审计                       |
| 在线用户 | `/monitor/online`           | Redis 会话、强制下线                 |
| 缓存监控 | `/monitor/cache`            | Redis 信息                           |
| 代码生成 | `/generator`                | 读取表结构生成脚手架                 |
| 个人中心 | `/profile`                  | 资料、头像、修改密码                 |
| AI 操作  | `/ai`（Header AI 图标进入） | 自然语言 Agent：审批、任务、SSE 流式 |

### 前端目录结构

```
web/
├── src/
│   ├── api/                        # 接口封装（system / monitor / jobs / files / dashboard）
│   ├── views/                      # 页面
│   │   ├── dashboard/              # 首页数据看板
│   │   ├── login/                  # 登录
│   │   ├── system/                 # 用户/角色/菜单/部门/岗位/字典/配置
│   │   ├── monitor/                # 登录/操作日志、在线用户、缓存
│   │   ├── jobs/                   # 定时任务
│   │   ├── files/                  # 文件管理
│   │   ├── generator/              # 代码生成器
│   │   └── profile/                # 个人中心
│   ├── layouts/                    # 布局（侧边栏、头部、Tab 标签、主题面板）
│   ├── components/                 # 通用组件
│   ├── composables/                # useTable / useDict / useFormat
│   ├── store/                      # Pinia（user / settings / permission）
│   ├── router/                     # 路由 + 守卫
│   ├── request.ts                  # axios 封装（刷新排队）
│   └── types/                      # 类型定义
├── vite.config.ts                  # 端口 5173，/api 代理到 3000
└── package.json
```

## 功能模块

| 模块            | 说明                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- |
| **认证鉴权**    | JWT 双 token（access + refresh）、HS256 签名、密码 Bun.password argon2id 哈希         |
| **用户管理**    | 用户 CRUD、角色分配、状态管理、软删除                                                 |
| **角色管理**    | 角色 CRUD、菜单权限分配、数据权限范围                                                 |
| **菜单管理**    | 树形菜单 CRUD、按钮权限标识、前端路由数据                                             |
| **部门管理**    | 树形部门 CRUD、祖级路径维护                                                           |
| **岗位管理**    | 岗位 CRUD、用户岗位关联                                                               |
| **字典管理**    | 字典类型 / 字典数据 CRUD、按类型获取启用项                                            |
| **参数配置**    | 系统配置项 CRUD、按键查询、内置参数保护                                               |
| **首页统计**    | 用户/部门/角色/菜单/岗位聚合统计、登录趋势与状态分布                                  |
| **登录日志**    | 登录记录查询、删除、清空                                                              |
| **操作日志**    | 基于拦截器的增删改操作自动审计                                                        |
| **在线用户**    | Redis 会话跟踪、强制下线                                                              |
| **定时任务**    | Cron 调度、手动执行、执行日志                                                         |
| **文件管理**    | 上传（multipart）、下载、类型/大小校验                                                |
| **代码生成器**  | 读取 information_schema 自动生成模块脚手架                                            |
| **AI 操作助手** | 自然语言驱动工具调用；策略/风险审批闭环、多步任务与撤销、SSE 流式回复、结果持久化回显 |
| **健康检查**    | `GET /health` 免认证                                                                  |
| **Swagger**     | 开发环境自动启用，路径 `/api/v1/docs`                                                 |

## AI 操作助手

内置“用自然语言操作系统后台”的 Agent 能力，后端位于 `src/ai/`，Web 端通过顶部 Header 的 AI 机器人图标唤出面板使用（也可直达 `/ai` 页面）。

### 能力一览

- **自然语言 → 工具调用**：LLM 自主决策调用已注册的后台工具（用户/部门/字典/菜单等），全程策略评估（权限 + 风险分级 + 审批策略 + 工具限流）。
- **审批闭环**：需确认的高风险操作在会话消息内内嵌确认条完成「取消 / 确认执行」，确认后由 LLM 生成总结回复；审批结果元数据持久化于消息 `tool_results`，刷新/重新进入仍还原结果条样式。
- **真流式回复**：基于 SSE 的文本增量推送，前端边收边渲染（非模拟打字机）；兼容 DeepSeek thinking 模式，`reasoning_content` 正确解析并按需原样回传。
- **多步任务与撤销**：多步操作进入任务时间线，成功步骤支持一键 Saga 撤销（Undo）。
- **安全**：Tool 返回结果统一脱敏；ActionIntent 一次性 token + 预览数据快照 TOCTOU 校验；全部操作审计留痕。
- **前端形态**：Header 图标唤起 → 底部滑出面板（可一键全屏）；会话/历史会话管理、Markdown 渲染、审批/任务/结果回显齐全。

> 需配置 `DEEPSEEK_API_KEY` 等环境变量（可用 `AI_ENABLED` 控制），详见下文环境变量表。

## 技术栈

### 后端

- **框架**：NestJS 12 + Fastify
- **ORM**：Drizzle ORM 1.0（MySQL 8）
- **校验**：Zod 4
- **认证**：jose（JWT）+ Bun.password（argon2id 密码哈希）
- **缓存**：Bun.RedisClient（可选，未配置自动降级）
- **调度**：@nestjs/schedule + cron
- **文档**：@nestjs/swagger
- **测试**：bun test（Bun 内置运行器）· 断言/mock 沿用 vitest API
- **Lint**：oxlint + oxfmt

### 前端

- **框架**：Vue 3.5 + Vite 8 + TypeScript
- **状态**：Pinia 3 · **路由**：Vue Router 5
- **UI**：lew-ui + UnoCSS
- **HTTP**：axios · **图表**：ECharts 6

## 快速开始

### 环境要求

- Bun >= 1.4（后端单一运行时：应用、迁移、seed、测试均运行在 Bun 上）
- MySQL 8
- Redis（可选，不配置则缓存/在线用户/任务模块自动降级）
- Node.js + pnpm（可选，用于 web 前端）

### 后端启动

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

后端默认运行在 `http://localhost:3000`，Swagger 文档地址 `http://localhost:3000/api/v1/docs`。

### Web 前端启动

```bash
cd web
bun install        # 或 pnpm install
bun run dev        # http://localhost:5173
```

前端开发服务运行在 `http://localhost:5173`，`/api` 会代理到后端 `http://localhost:3000`。

### 默认管理员

| 用户名  | 密码                   |
| ------- | ---------------------- |
| `admin` | `db:seed` 时设置的密码 |

## 项目结构

```
.
├── src/                          # 后端源码
│   ├── main.ts                   # 启动入口
│   ├── app.module.ts             # 根模块
│   ├── config/                   # 环境变量配置（Zod）
│   ├── database/
│   │   ├── schema/index.ts       # 全部表定义 + 关联（单文件）
│   │   ├── database.service.ts   # MySQL 连接池 + Drizzle 实例
│   │   ├── migrations/           # SQL 迁移文件
│   │   └── seed/index.ts         # 管理员初始化脚本
│   ├── common/
│   │   ├── auth/                 # JWT Guard、权限装饰器、公开路由装饰器
│   │   ├── cache/                # Redis 封装
│   │   ├── data-scope/           # 数据权限（若依数据范围）
│   │   └── logging/              # 操作日志拦截器
│   ├── ai/                       # AI 操作助手（agent / gateway / approval / task / llm / tools）
│   └── modules/
│       ├── auth/                 # 登录 / 刷新 / 登出
│       ├── system/               # 用户、角色、菜单、部门、岗位、字典、配置
│       ├── monitor/              # 登录日志、操作日志、在线用户、缓存监控
│       ├── dashboard/            # 首页聚合统计
│       ├── jobs/                 # 定时任务
│       ├── files/                # 文件管理
│       ├── generator/            # 代码生成器
│       ├── health/               # 健康检查
│       └── generated/            # 代码生成器输出（gitignore）
├── web/                          # Web 前端（Vue 3 + Vite）
├── docs/screenshots/             # 界面截图（含占位图与生成脚本）
└── uploads/                      # 文件上传目录
```

## 环境变量

| 变量                 |  必填  | 默认值                     | 说明                               |
| -------------------- | :----: | -------------------------- | ---------------------------------- |
| `NODE_ENV`           |   否   | `development`              | 运行环境                           |
| `PORT`               |   否   | `3000`                     | 服务端口                           |
| `API_PREFIX`         |   否   | `api/v1`                   | API 前缀                           |
| `DATABASE_URL`       | **是** | —                          | MySQL 连接字符串                   |
| `REDIS_URL`          |   否   | —                          | Redis 连接（可选）                 |
| `JWT_ISSUER`         | **是** | —                          | JWT 签发者                         |
| `JWT_AUDIENCE`       | **是** | —                          | JWT 受众                           |
| `JWT_ACCESS_SECRET`  | **是** | —                          | Access Token 密钥（≥32 字符）      |
| `JWT_REFRESH_SECRET` | **是** | —                          | Refresh Token 密钥（≥32 字符）     |
| `JWT_ACCESS_TTL`     |   否   | `15m`                      | Access Token 有效期                |
| `JWT_REFRESH_TTL`    |   否   | `7d`                       | Refresh Token 有效期               |
| `CORS_ORIGINS`       |   否   | `http://localhost:5173`    | CORS 允许来源（逗号分隔）          |
| `UPLOAD_DIR`         |   否   | `uploads`                  | 文件上传目录                       |
| `SWAGGER_ENABLED`    |   否   | `true`                     | 是否启用 Swagger                   |
| `SWAGGER_PATH`       |   否   | `docs`                     | Swagger 路径                       |     | `AI_ENABLED` | 否  | `true` | 是否启用 AI 操作助手 |
| `DEEPSEEK_API_KEY`   |   否   | —                          | DeepSeek API Key（启用 AI 时填写） |
| `DEEPSEEK_BASE_URL`  |   否   | `https://api.deepseek.com` | DeepSeek 接口地址                  |
| `DEEPSEEK_MODEL`     |   否   | `deepseek-chat`            | DeepSeek 模型                      |

## 命令

```bash
# 后端（根目录）
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

# 前端（web/ 目录）
bun run dev              # 开发模式（5173）
bun run build            # 类型检查 + 构建
bun run typecheck        # vue-tsc 类型检查
bun run lint             # oxlint
```

## 测试

```bash
bun test                 # 单元测试（Bun 内置运行器，秒级完成）
bun test --watch         # 监听模式
bun test --coverage      # 覆盖率（text / lcov 到 coverage/）
```

bun test 单元测试覆盖 Controller、Service、Guard、Interceptor、工具函数与 AI 模块（LLM 流式/思考解析、审批 hash 等），每个测试完全隔离，不依赖数据库。
`.spec.ts` 中 `from 'vitest'` 的导入仅用作断言/mock 库，由 bun test 直接执行、不经过 vitest runner，因此没有其性能开销。

## License

MIT
