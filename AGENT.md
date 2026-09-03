# AGENT.md — Nest Admin

## 项目概述

**nest-admin** 是一个通用后端管理 API。技术栈为 NestJS + Fastify 作为 HTTP 层，Drizzle ORM 操作数据库，Zod 做数据校验。主要功能：JWT 双 token 认证、基于权限字符串的 RBAC 访问控制、部门/菜单/岗位/字典管理、定时任务、文件上传、操作审计日志、在线用户跟踪、代码生成器。

- **运行时 / 包管理器**：`bun@1.4.0`（唯一运行时与包管理器，锁文件 `bun.lock` 为准；应用、迁移、seed、测试全部跑在 Bun 上，不依赖 Node/tsx）
- **数据库**：MySQL，通过 `mysql2` + `drizzle-orm@1.0.0-rc.3` 访问
- **缓存**：Bun.RedisClient（可选——所有 Redis 调用在 `REDIS_URL` 未配置时静默降级）

## 技术栈

| 领域              | 选型                                                              |
| ----------------- | ----------------------------------------------------------------- |
| 运行时 / 包管理器 | Bun（无 Node / tsx 运行方式）                                     |
| Web 框架          | NestJS 12 + Fastify 适配器（不是 Express）                        |
| ORM               | Drizzle ORM 1.0.0-rc.3（MySQL 方言）                              |
| 数据校验          | Zod 4（Controller 层校验请求体；`AppConfigService` 校验环境变量） |
| 认证              | JWT via `jose`（HS256）；密码哈希 `Bun.password`（argon2id）      |
| 调度              | `@nestjs/schedule` + `cron`                                       |
| API 文档          | `@nestjs/swagger`（开启时路径：`/api/v1/docs`）                   |
| 日志              | `pino`（Fastify 内置）                                            |
| 测试              | `vitest` 4.x + `@vitest/coverage-v8`                              |
| Lint / 格式化     | `oxlint`、`oxfmt`（不用 ESLint / Prettier）                       |
| 语言              | TypeScript 5.9，`moduleResolution: NodeNext`，ESM `.js` 后缀导入  |

## 常用命令

```bash
bun dev                    # 开发模式（bun --watch src/main.ts）
bun run build              # 编译
bun run start              # 生产启动（bun src/main.ts）
bun run typecheck          # 类型检查（tsc --noEmit）
bun run lint               # 代码检查（oxlint）
bun run lint:fix           # 自动修复 lint 问题
bun run format             # 格式化代码（oxfmt --write）
bun run test               # 跑测试（单次）
bun run test:watch         # 测试监听模式
bun run db:generate        # 生成 Drizzle 迁移文件
bun run db:migrate         # 执行数据库迁移
bun run db:seed            # 初始化管理员账号
bun run db:studio          # 打开 Drizzle Studio
```

## 项目结构

```
src/
  main.ts                         # 启动入口：Fastify + Swagger + 中间件注册
  app.module.ts                   # 根模块——引入所有功能模块
  config/
    app-config.module.ts
    app-config.service.ts         # Zod 校验环境变量（PORT、JWT_*、DATABASE_URL 等）
    app-config.service.spec.ts    # 环境变量校验测试
  database/
    schema/index.ts               # 所有 Drizzle 表定义 + 关联关系（单文件）
      包含表: users, roles, menus, departments, posts, userRoles, roleMenus,
              userPosts, refreshTokens, dictionaries, dictTypes, configs,
              operationLogs, loginLogs, jobs, jobLogs, files
    database.module.ts
    database.service.ts           # 封装 mysql2 连接池 + Drizzle db 实例
    migrate.ts                    # 独立的迁移执行脚本
    seed/index.ts                 # 初始化超级管理员角色和用户
    migrations/                   # drizzle-kit 生成的 SQL 迁移文件
  common/
    auth/
      access-token.guard.ts       # 全局 APP_GUARD——校验 JWT、写入 req.user、检查权限
      access-token.guard.spec.ts
      permissions.decorator.ts    # @RequirePermissions('system:user:list')
      public.decorator.ts         # @Public()——跳过认证
    cache/
      redis.module.ts
      redis.service.ts            # Bun.RedisClient 封装（get/set/del/keys/getJson/setJson/ping）
      redis.service.spec.ts
      cache-keys.ts               # 在线会话 key 前缀及 key 生成函数
    logging/
      operation-log.interceptor.ts # 全局 APP_INTERCEPTOR——记录增删改操作到 sys_operation_log
      operation-log.interceptor.spec.ts
    common.dto.ts                 # SearchQuery（分页参数基类）
  modules/
    auth/
      auth.module.ts
      auth.controller.ts          # POST /auth/login、/auth/refresh、/auth/logout
      auth.service.ts             # 登录、刷新、登出、Token 签发、权限解析
      (认证由 AccessTokenGuard 直接处理 JWT，不需要 passport 策略)
    system/
      users/                      # 用户管理——CRUD + 分配角色
      roles/                      # 角色管理——CRUD + 设置菜单权限 + 获取菜单 ID 列表
      menus/                      # 菜单管理——CRUD + 树形构建 + 路由树
      depts/                      # 部门管理——CRUD + 树形构建 + 祖级路径维护
      posts/                      # 岗位管理——CRUD
      dict-types/                 # 字典类型——CRUD
      dict-data/                  # 字典数据——CRUD + 按类型获取启用项
      configs/                    # 参数配置——CRUD + 按 key 查询（内置参数禁止删除）
    monitor/
      login-logs/                 # 登录日志——list / findOne / remove / clear
      operation-logs/             # 操作日志——list / findOne / remove / clear
      online/                     # 在线用户——Redis 会话跟踪（list / forceLogout）
      cache/                      # Redis 信息端点
    jobs/                         # 定时任务——CRUD + runNow + 日志查询 + 清空日志
    files/                        # 文件管理——上传（multipart）/ 列表 / 详情 / 下载 / 删除
    generator/                    # 代码生成器——表列表 / 列信息 / 预览 / 生成
    compat/                       # 旧版 REST 控制器（role / menu / user）——封装新版 service
    health/                       # GET /health——始终公开，无需认证
  generated/                      # （已被 gitignore）代码生成器的输出目录
```

## 数据库表结构

全部 17 张表的定义在 **一个文件** 中：`src/database/schema/index.ts`。

所有支持软删除/审计的表都包含：

- `created_at`、`updated_at`（timestamp）
- `deleted_at`（datetime，可为空）
- `created_by`、`updated_by`（unsigned int，可为空）

Drizzle 关联也定义在同一文件中（通过 `defineRelations`）。

**核心表说明：**

| 表名            | 说明                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| `sys_user`      | `username` 唯一、`password_hash`、`status`(active/disabled)、`dept_id` 外键，软删除 |
| `sys_role`      | `role_key` 唯一、`is_system` 标记、`data_scope`，软删除                             |
| `sys_menu`      | `parent_id` 实现树形、`type`(M/C/F=目录/菜单/按钮)、`permission` 权限标识，软删除   |
| `sys_user_role` | 用户-角色关联表                                                                     |
| `sys_role_menu` | 角色-菜单关联表                                                                     |
| `sys_dept`      | `parent_id` + `ancestors`(祖级路径) 实现树形                                        |
| `sys_job`       | `handler` 字符串映射到注册的处理器名称；通过 `@nestjs/schedule` 调度                |

## 认证与鉴权

1. **登录**：`POST /auth/login` 返回 `{ accessToken, refreshToken, tokenType, expiresIn }`。
2. **Access Token**：HS256 签名 JWT，TTL 可配置（默认 `15m`）。Payload 包含 `sub`、`username`、`permissions[]`、`roles[]`。
3. **Refresh Token**：HS256 签名 JWT，TTL 可配置（默认 `7d`）。以 SHA-256 哈希存入 `sys_refresh_token` 表，每次使用后轮换。
4. **AccessTokenGuard**：注册为全局 `APP_GUARD`，处理逻辑：
   - 标有 `@Public()` 的路由直接放行。
   - 从 `Authorization` 头提取 `Bearer` token 并校验。
   - 将 `{ id, username, permissions[], roles[] }` 写入 `request.user`。
   - 检查 `@RequirePermissions(...)` 元数据；拥有 `*:*:*` 的用户（超级管理员）通过所有权限检查。
5. **超级管理员**：任何被分配了 `isSystem: true` 或 `key: 'admin'` 角色的用户，自动获得 `*:*:*` 通配权限。

## 编码规范

### ESM 导入

所有 `.ts` 文件的导入路径必须使用 `.js` 后缀（匹配 `moduleResolution: NodeNext`）：

```ts
import { UsersService } from './users.service.js';
```

### Controller 编写规范

- 路由前缀采用分层风格：`system/users`、`system/roles`、`monitor/login-logs` 等。
- 所有受保护路由必须用 `@RequirePermissions('模块:资源:操作')` 装饰。
- 请求体用 Zod schema 校验，schema 定义在 Controller 文件中。
- Controller 保持薄层——仅调用 Service 并返回结果。

### Service 编写规范

- Service 依赖 `DatabaseService`（提供 `db` 即 Drizzle 实例）和/或 `RedisService`。
- 分页 `list` 方法接收 `page` 和 `pageSize`，做范围限制后返回 `{ items, page, pageSize }`。
- 软删除使用 `deletedAt = new Date()`，不物理删除行。
- 唯一键冲突抛 `ConflictException`。
- 实体不存在抛 `NotFoundException`。

### 命名约定

- **文件名**：`kebab-case.service.ts`、`kebab-case.controller.ts`、`kebab-case.spec.ts`
- **类名**：`PascalCase`（`UsersService`、`UsersController`）
- **表名**：数据库中为 `snake_case`，Drizzle 变量为 `camelCase`（`sys_dept` → `departments`）
- **权限标识**：冒号分隔，如 `system:user:list`、`monitor:loginlog:delete`

## 测试

### 运行测试

```bash
bun run test          # 单次运行
bun run test:watch    # 监听模式
```

### 测试结构

- 测试文件与源文件同目录：`src/modules/system/users/users.service.spec.ts`
- 使用 `vitest` + `describe`/`it`/`expect`/`vi`
- 全部 269 个测试用例完全隔离——每个 Service 测试都 mock 了 `DatabaseService`（必要时还有 `RedisService`、`AppConfigService`、`SchedulerRegistry`）
- 覆盖率：`vitest.config.ts` 启用了 `@vitest/coverage-v8`（输出 `text` 和 `lcov`）

### Mock 模板

**基础 DB mock**（所有 Service 测试共用此模式）：

```ts
import { describe, expect, it, vi } from 'vitest';

function mockDb() {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      }),
      transaction: vi
        .fn()
        .mockImplementation(async (cb: (tx: any) => Promise<void>) => {
          await cb({
            delete: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
              }),
            }),
          });
        }),
    },
  };
}
```

**Select 链 Mock**：Drizzle 的 `select().from().where().limit()` 链式调用需要特殊处理——让 `where()` 返回一个既可以被 `await`（作为链的终点）又带有 `.limit()` 和 `.orderBy()` 方法（作为链的中间步骤）的对象：

```ts
function selectMock(result: unknown) {
  const whereFn = vi.fn().mockImplementation(() =>
    Object.assign(Promise.resolve(result), {
      limit: vi.fn().mockResolvedValue(result),
      orderBy: vi.fn().mockResolvedValue(result),
    }),
  );
  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: whereFn,
      orderBy: vi.fn().mockResolvedValue(result),
      innerJoin: vi.fn().mockReturnThis(),
    }),
    innerJoin: vi.fn().mockReturnThis(),
  });
}
```

**使用方式**：解构后传入 `{ db }` 包装对象给 Service 构造器：

```ts
const { db } = mockDb();
db.select = selectMock([{ id: 1, name: '测试' }]);
const service = new UsersService({ db } as any);
```

## 环境变量

由 `AppConfigService` 通过 Zod schema 校验：

| 变量名               |  必填  | 默认值                  | 说明                                   |
| -------------------- | :----: | ----------------------- | -------------------------------------- |
| `NODE_ENV`           |   否   | `development`           | `development` / `test` / `production`  |
| `PORT`               |   否   | `3000`                  | 服务端口                               |
| `API_PREFIX`         |   否   | `api/v1`                | API 前缀                               |
| `DATABASE_URL`       | **是** | —                       | MySQL 连接串                           |
| `REDIS_URL`          |   否   | —                       | Redis 连接串（可选）                   |
| `JWT_ISSUER`         | **是** | —                       | JWT 签发者                             |
| `JWT_AUDIENCE`       | **是** | —                       | JWT 受众                               |
| `JWT_ACCESS_SECRET`  | **是** | —                       | 访问令牌密钥（最少 32 个字符）         |
| `JWT_REFRESH_SECRET` | **是** | —                       | 刷新令牌密钥（最少 32 个字符）         |
| `JWT_ACCESS_TTL`     |   否   | `15m`                   | 访问令牌有效期，格式 `\d+(s\|m\|h\|d)` |
| `JWT_REFRESH_TTL`    |   否   | `7d`                    | 刷新令牌有效期，格式 `\d+(s\|m\|h\|d)` |
| `CORS_ORIGINS`       |   否   | `http://localhost:5173` | 允许的跨域来源，逗号分隔               |
| `UPLOAD_DIR`         |   否   | `uploads`               | 文件上传目录                           |
| `SWAGGER_ENABLED`    |   否   | `true`                  | 是否启用 Swagger（`true`/`false`）     |
| `SWAGGER_PATH`       |   否   | `docs`                  | Swagger 文档路径                       |

## 代码生成器

`/generator` 模块通过查询 `information_schema` 为任意已存在的数据库表生成 NestJS 模块脚手架（schema、service、controller、module）。输出到 `src/modules/generated/<目录>/`，该目录已被 **gitignore**。

接口：

- `GET /generator/tables` — 列出所有表
- `GET /generator/tables/:table/columns` — 获取表字段元数据
- `POST /generator/preview` — 预览生成的文件
- `POST /generator/generate` — 写入文件到磁盘

## 注意事项

1. **所有导入必须加 `.js` 后缀**：TypeScript 配置使用 `moduleResolution: NodeNext`，每个模块导入必须以 `.js` 结尾（即使源文件是 `.ts`）。
2. **Schema 单文件管理**：所有表定义和关联都在 `src/database/schema/index.ts` 中。新增表时直接加到这个文件，然后用 `drizzle-kit generate` 生成迁移。
3. **软删除 + 审计模式**：每张实体表都用 `deletedAt` 软删除、`created_by`/`updated_by` 记录操作人。Controller 传 `request.user.id` 作为操作人 ID。
4. **测试完全隔离**：测试绝不访问真实数据库，完全 mock `DatabaseService.db`。Service 通过 `new Service(mock as any)` 实例化。
5. **提交前过 lint**：`bun run lint` 和 `bun run format:check` 必须零错误通过。Lint 工具是 `oxlint`，不是 ESLint。
6. **Lockfile 策略**：规范 lockfile 是 `bun.lock`。如果用 pnpm 安装了新依赖，也需要执行 `bun install` 更新 `bun.lock`。
