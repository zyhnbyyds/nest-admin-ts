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

## License

MIT
