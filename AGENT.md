# AGENT.md — RuoYi Nest Admin

## Overview

**ruoyi-nest-admin** is a backend administration API inspired by the RuoYi framework. It uses NestJS + Fastify as the HTTP layer, Drizzle ORM for database access, and Zod for validation. Features include JWT-based authentication (access + refresh tokens), role-based access control with permission strings, department/menu/post/dictionary management, scheduled jobs, file uploads, operation auditing, online session tracking, and a code generator.

- **Package manager**: `bun@1.4.0` (lockfiles exist for both bun and pnpm; `bun install` is canonical)
- **Node engine**: `>=24`
- **Database**: MySQL, accessed via `mysql2` + `drizzle-orm@1.0.0-rc.3`
- **Cache**: `ioredis` (optional — all Redis call sites degrade gracefully when `REDIS_URL` is unset)

## Tech Stack

| Area               | Choice                                                      |
| ------------------ | ----------------------------------------------------------- |
| Runtime / pkg mgr  | Bun / pnpm                                                  |
| Web framework      | NestJS 11, Fastify adapter (not Express)                    |
| ORM                | Drizzle ORM 1.0.0-rc.3 (MySQL dialect)                     |
| Validation         | Zod 4 (controllers parse incoming bodies; env schema in `AppConfigService`) |
| Auth               | JWT via `jose` (HS256); password hashing via `argon2`        |
| Password hash      | `argon2id` only                                             |
| Scheduler          | `@nestjs/schedule` + `cron`                                 |
| API docs           | `@nestjs/swagger` (`/api/v1/docs` when enabled)              |
| Logger             | `pino` (Fastify built-in)                                   |
| Testing            | `vitest` 4.x, `@vitest/coverage-v8`                          |
| Linting / Format   | `oxlint`, `oxfmt` (no ESLint / Prettier)                    |
| Language           | TypeScript 5.9, `moduleResolution: NodeNext`, ESM `.js` extensions in imports |

## Scripts

```bash
bun dev                    # nest start --watch
bun run dev:bun            # bun --watch src/main.ts
bun run build              # nest build
bun run typecheck          # tsc --noEmit
bun run lint               # oxlint .
bun run lint:fix           # oxlint . --fix
bun run format             # oxfmt --write .
bun run test               # vitest run --config vitest.config.ts
bun run test:watch         # vitest --config vitest.config.ts
bun run db:generate        # drizzle-kit generate
bun run db:migrate         # tsx src/database/migrate.ts
bun run db:seed            # tsx src/database/seed/index.ts
bun run db:studio          # drizzle-kit studio
```

## Project Structure

```
src/
  main.ts                         # bootstrap: Fastify + Swagger + middlewares
  app.module.ts                   # root module — imports ALL feature modules
  config/
    app-config.module.ts
    app-config.service.ts         # typed env via Zod schema (PORT, JWT_*, DATABASE_URL, …)
    app-config.service.spec.ts    # env validation test
  database/
    schema/index.ts               # ALL Drizzle table definitions + relations (single file)
      tables: users, roles, menus, departments, posts, userRoles, roleMenus,
              userPosts, refreshTokens, dictionaries, dictTypes, configs,
              operationLogs, loginLogs, jobs, jobLogs, files
    database.module.ts
    database.service.ts           # DrizzleMySql pool + db (wraps mysql2 pool)
    migrate.ts                    # standalone migration runner
    seed/index.ts                 # seeds admin role + admin user
    migrations/                   # drizzle-kit output
  common/
    auth/
      access-token.guard.ts       # global APP_GUARD — validates JWT, sets req.user, checks permissions
      access-token.guard.spec.ts
      permissions.decorator.ts    # @RequirePermissions('system:user:list')
      public.decorator.ts         # @Public() — skips auth
    cache/
      redis.module.ts
      redis.service.ts            # ioredis wrapper (get/set/del/keys/getJson/setJson/ping)
      redis.service.spec.ts
      cache-keys.ts               # online session prefix + key helper
    logging/
      operation-log.interceptor.ts # global APP_INTERCEPTOR — logs mutating requests to sys_operation_log
      operation-log.interceptor.spec.ts
    common.dto.ts                 # SearchQuery (pagination base)
  modules/
    auth/
      auth.module.ts
      auth.controller.ts          # POST /auth/login, /auth/refresh, /auth/logout
      auth.service.ts             # login, refresh, logout, token issuance, claims resolution
      auth.controller.spec.ts
      auth.service.spec.ts
      jwt.strategy.ts             # (placeholder, not actively used — AccessTokenGuard handles JWT)
    system/
      users/                      # CRUD + assignRole
      roles/                      # CRUD + setMenus + getMenuIds
      menus/                      # CRUD + tree builder + route tree
      depts/                      # CRUD + tree builder + ancestor management
      posts/                      # CRUD
      dict-types/                 # CRUD
      dict-data/                  # CRUD + byType (get active entries for a type)
      configs/                    # CRUD + byKey (+ protection for builtin entries)
    monitor/
      login-logs/                 # list, findOne, remove, clear
      operation-logs/             # list, findOne, remove, clear
      online/                     # Redis-backed online session tracking (list, forceLogout)
      cache/                      # Redis info endpoint
    jobs/                         # CRUD + runNow + listLogs + clearLogs
    files/                        # file upload (multipart), list, detail, download, remove
    generator/                    # code generator: list tables, get columns, preview, generate
    compat/                       # legacy RuoYi REST controllers (role, menu, user) — wraps new services
    health/                       # GET /health — always public
  generated/                      # (gitignored) output of code generator (user.schema, user.service, …)
```

## Database Schema

All 17 tables are defined in **one file**: `src/database/schema/index.ts`. Every table that supports soft-delete / audit has these columns:
- `created_at`, `updated_at` (timestamp)
- `deleted_at` (datetime, nullable)
- `created_by`, `updated_by` (unsigned int, nullable)

Drizzle relations are also defined in that file (via `defineRelations`).

**Key tables:**
- `sys_user` — `username` unique, `password_hash`, `status` (active/disabled), `dept_id` FK, soft-delete
- `sys_role` — `role_key` unique, `is_system` flag, `data_scope`, soft-delete
- `sys_menu` — tree via `parent_id`, `type` (M/C/F = directory/menu/button), `permission` string, soft-delete
- `sys_user_role` / `sys_role_menu` — junction tables
- `sys_dept` — tree via `parent_id` + `ancestors` column (materialized path)
- `sys_job` — `handler` string maps to registered handler name; scheduled via `@nestjs/schedule`

## Authentication & Authorization

1. **Login**: `POST /auth/login` returns `{ accessToken, refreshToken, tokenType, expiresIn }`.
2. **Access token**: HS256 JWT, configurable TTL (default `15m`). Contains `sub`, `username`, `permissions[]`, `roles[]`.
3. **Refresh token**: HS256 JWT, configurable TTL (default `7d`). Stored in `sys_refresh_token` table as SHA-256 hash. Rotated on each use.
4. **Guard**: `AccessTokenGuard` is registered as global `APP_GUARD`. It:
   - Skips routes decorated with `@Public()`.
   - Extracts and verifies the `Bearer` token from `Authorization` header.
   - Populates `request.user` with `{ id, username, permissions[], roles[] }`.
   - Checks `@RequirePermissions(...)` metadata; users with `*:*:*` (super‑admin) pass all checks.
5. **Super admin**: Any user assigned a role with `isSystem: true` or `key: 'admin'` gets the wildcard `*:*:*` permission.

## Conventions

### ESM-style imports
All `.ts` files use `.js` extension in imports (matching `moduleResolution: NodeNext`).
```ts
import { UsersService } from './users.service.js';
```

### Controller patterns
- Route prefixes follow RuoYi conventions: `system/users`, `system/roles`, `monitor/login-logs`, etc.
- Every protected route is decorated with `@RequirePermissions('module:resource:action')`.
- Controllers parse request bodies through Zod schemas defined in the controller file.
- Controllers are thin — they call into the service layer and return the result directly.

### Service patterns
- Services depend on `DatabaseService` (provides `db` — the Drizzle instance) and/or `RedisService`.
- Paginated `list` methods accept `page` and `pageSize`, clamp them, and return `{ items, page, pageSize }`.
- Soft‑deletes set `deletedAt = new Date()` instead of deleting rows.
- Unique‑key checks throw `ConflictException`.
- Missing‑entity checks throw `NotFoundException`.

### Naming conventions
- File names: `kebab-case.service.ts`, `kebab-case.controller.ts`, `kebab-case.spec.ts`.
- Class names: `PascalCase` (`UsersService`, `UsersController`).
- Table names: `snake_case` in DB, `camelCase` in Drizzle definitions (`sys_dept` → `departments` variable).
- Permissions: colon‑delimited strings like `system:user:list`, `monitor:loginlog:delete`.

## Testing

### Run tests
```bash
bun run test          # single run
bun run test:watch    # watch mode
```

### Test structure
- Test files live beside their source: `src/modules/system/users/users.service.spec.ts`.
- Tests use `vitest` with `describe` / `it` / `expect` / `vi`.
- All 229 tests run in complete isolation — each service test mocks `DatabaseService` (and optionally `RedisService`, `AppConfigService`, `SchedulerRegistry`).
- Coverage: `vitest.config.ts` enables `@vitest/coverage-v8` (providers: `text` and `lcov`).

### Mock patterns
The DB mock pattern follows this convention:

```ts
import { describe, expect, it, vi } from 'vitest';

function mockDb() {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 1 }]) }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }),
      }),
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }),
      transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<void>) => {
        await cb({
          delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }),
          }),
        });
      }),
    },
  };
}
```

**Select chain mock**: The Drizzle select chain (`select().from().where().limit()`) is mocked by making `where()` return a `Promise.resolve(data)` augmented with `.limit()` and `.orderBy()` properties so it works both as a terminal `await where()` and a chained `where().limit()`:

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

Pass the mock to the service constructor wrapped as `{ db } as any`:
```ts
const { db } = mockDb();
db.select = selectMock([{ id: 1 }]);
const service = new UsersService({ db } as any);
```

## Environment Variables

Validated by `AppConfigService` (Zod schema):

| Variable              | Required | Default                 | Notes                            |
| --------------------- | -------- | ----------------------- | -------------------------------- |
| `NODE_ENV`            | No       | `development`           | `development` / `test` / `production` |
| `PORT`                | No       | `3000`                  |                                  |
| `API_PREFIX`          | No       | `api/v1`                |                                  |
| `DATABASE_URL`        | **Yes**  | —                       | MySQL connection string          |
| `REDIS_URL`           | No       | —                       | Optional Redis connection        |
| `JWT_ISSUER`          | **Yes**  | —                       |                                  |
| `JWT_AUDIENCE`        | **Yes**  | —                       |                                  |
| `JWT_ACCESS_SECRET`   | **Yes**  | —                       | Min 32 chars                     |
| `JWT_REFRESH_SECRET`  | **Yes**  | —                       | Min 32 chars                     |
| `JWT_ACCESS_TTL`      | No       | `15m`                   | Format: `\d+(s\|m\|h\|d)`            |
| `JWT_REFRESH_TTL`     | No       | `7d`                    | Format: `\d+(s\|m\|h\|d)`            |
| `CORS_ORIGINS`        | No       | `http://localhost:9527` | Comma-separated                  |
| `UPLOAD_DIR`          | No       | `uploads`               |                                  |
| `SWAGGER_ENABLED`     | No       | `true`                  | `true` or `false`                |
| `SWAGGER_PATH`        | No       | `docs`                  |                                  |

## Code Generator

The `/generator` module introspects `information_schema` and generates NestJS module scaffolding (schema, service, controller, module) for any existing database table. Output lands in `src/modules/generated/<directory>/` which is **gitignored**.

Endpoints:
- `GET /generator/tables` — list tables
- `GET /generator/tables/:table/columns` — column metadata
- `POST /generator/preview` — preview generated files
- `POST /generator/generate` — write files to disk

## Important Notes

1. **All `.js` extension imports**: TypeScript is configured with `moduleResolution: NodeNext`. Every module import must end with `.js` (even though the source is `.ts`).
2. **Single schema file**: All table definitions and relations live in `src/database/schema/index.ts`. When adding a new table, add it there and use `drizzle-kit generate` for migrations.
3. **Soft‑delete + audit pattern**: Every entity tables uses `deletedAt` for soft‑delete and `created_by`/`updated_by` for audit. Controllers pass `request.user.id` as the actor ID.
4. **Testing isolation**: Tests never touch a real database. They mock `DatabaseService.db` completely. Services are instantiated with `new Service(mock as any)`.
5. **Lint before commit**: `bun run lint` and `bun run format:check` should pass with zero errors. The linter is `oxlint`, not ESLint.
6. **bun lockfile**: The canonical lockfile is `bun.lock`. If you add dependencies with `pnpm`, also run `bun install` to update `bun.lock`.