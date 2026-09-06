# nest-admin-ts

**English** | [简体中文](./README.zh-CN.md)

A backend admin API built on **NestJS 12 + Fastify + Drizzle ORM + MySQL**, paired with a **Vue 3 + Vite** web admin frontend.

A complete solution for building admin systems: RBAC permissions, departments/posts/dicts/configs, operation & login auditing, scheduled jobs, file management, code generator, Redis monitoring, and a modern, out-of-the-box frontend.

[![Bun](https://img.shields.io/badge/bun-%3E%3D1.4-orange)](https://bun.sh)
[![NestJS](https://img.shields.io/badge/nestjs-12-red)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)](https://www.typescriptlang.org)
[![Vue](https://img.shields.io/badge/vue-3.5-green)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/vite-8-purple)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## Table of Contents

- [Screenshots](#screenshots)
- [Web Frontend](#web-frontend)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Commands](#commands)
- [Testing](#testing)
- [License](#license)

## Screenshots

<img src="docs/screenshots/login.png" alt="Login page" />
<img src="docs/screenshots/dashboard.png" alt="Dashboard" />

## Web Frontend

The admin frontend lives in [`web/`](./web). It is a standalone **Vue 3 + Vite** single-page app, deployed separately from the backend and integrated with it through the `/api` proxy.

### Tech Stack

| Category   | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Vue 3.5 + Vite 8 + TypeScript 5.9                   |
| Router     | Vue Router 5                                        |
| State      | Pinia 3                                             |
| UI         | lew-ui                                              |
| Styling    | UnoCSS (atomic CSS, on-demand)                      |
| Charts     | ECharts 6 (login trend / status distribution / dashboard) |
| HTTP       | axios (JWT auto-refresh + concurrent refresh queue) |
| Utilities  | dayjs, lucide-vue-next, @vueuse/core                |
| Build      | unplugin-auto-import + unplugin-vue-components      |

### Core Features

- **Login & tokens**: JWT dual-token; the access token auto-refreshes and replays a request on 401, concurrent requests queue during refresh, and multiple tabs stay time-safe.
- **Permission-driven**: the frontend `permission` directive + route guard; button-level permissions are controlled by permission codes returned from the backend.
- **Dark theme**: dark/light switching based on the `lew-dark` class, with charts auto-adapting to the theme.
- **Dynamic routes**: menu/button permissions generate frontend routes level-by-level from the backend `menus/routes`.
- **Dashboard**: aggregates user/department/role/menu/post statistics on the home page, plus login trend and status distribution charts.
- **Unified full-screen tables**: a `useTable` composable unifies pagination, query, toggles, and delete confirmation.
- **Route tabs**: multi-level tabs, closable (dashboard is fixed), with right-click "Close current/others/all" and horizontal scrolling.

### Pages

| Module       | Path                     | Description                                |
| ------------ | ------------------------ | ------------------------------------------ |
| Login        | `/login`                 | Sign in                                    |
| Dashboard    | `/dashboard`             | Stats, login trend, recent logins          |
| Users        | `/system/users`          | CRUD, role assignment, status, soft delete |
| Roles        | `/system/roles`          | CRUD, menu permissions, data scope         |
| Menus        | `/system/menus`          | Tree menus, button permissions, frontend routes |
| Departments  | `/system/depts`          | Tree departments                           |
| Posts        | `/system/posts`          | Post CRUD, user association                |
| Dicts        | `/system/dicts`          | Dict types / dict data                     |
| Configs      | `/system/configs`        | System configs, protected built-ins        |
| Jobs         | `/system/jobs`           | Cron scheduling, manual run, execution logs |
| Files        | `/files`                 | Upload / preview / download                |
| Login Logs   | `/monitor/login-logs`    | Query, delete, clear                       |
| Operation Logs | `/monitor/operation-logs` | Audit of create/update/delete operations |
| Online Users | `/monitor/online`        | Redis sessions, force logout               |
| Cache Monitor | `/monitor/cache`         | Redis info                                 |
| Generator    | `/generator`             | Read table schema and generate scaffolding  |
| Profile      | `/profile`               | Profile, avatar, change password           |

### Frontend Structure

```
web/
├── src/
│   ├── api/                        # API wrappers (system / monitor / jobs / files / dashboard)
│   ├── views/                      # Pages
│   │   ├── dashboard/              # Dashboard
│   │   ├── login/                  # Login
│   │   ├── system/                 # Users/roles/menus/depts/posts/dicts/configs
│   │   ├── monitor/                # Login/operation logs, online users, cache
│   │   ├── jobs/                   # Scheduled jobs
│   │   ├── files/                  # File management
│   │   ├── generator/              # Code generator
│   │   └── profile/                # Profile
│   ├── layouts/                    # Layouts (sidebar, header, tab bar, theme panel)
│   ├── components/                 # Shared components
│   ├── composables/                # useTable / useDict / useFormat
│   ├── store/                      # Pinia (user / settings / permission)
│   ├── router/                     # Routes + guards
│   ├── request.ts                  # axios wrapper (refresh queue)
│   └── types/                      # Type definitions
├── vite.config.ts                  # Port 5173, /api proxied to 3000
└── package.json
```

## Features

| Module          | Description                                                              |
| --------------- | ------------------------------------------------------------------------ |
| **Authentication** | JWT dual tokens (access + refresh), HS256 signing, Bun.password argon2id hashing |
| **Users**       | User CRUD, role assignment, status management, soft delete               |
| **Roles**       | Role CRUD, menu permission assignment, data-scope ranges                 |
| **Menus**       | Tree menu CRUD, button permission flags, frontend route data             |
| **Departments** | Tree department CRUD, ancestor path maintenance                          |
| **Posts**       | Post CRUD, user–post association                                         |
| **Dicts**       | Dict type / dict data CRUD, enabled items by type                        |
| **Configs**     | System config item CRUD, query by key, built-in protection               |
| **Dashboard**   | Aggregated user/department/role/menu/post stats, login trend & status    |
| **Login Logs**  | Login record query, delete, clear                                        |
| **Operation Logs** | Automatic audit of create/update/delete operations via interceptor    |
| **Online Users** | Redis session tracking, force logout                                    |
| **Scheduled Jobs** | Cron scheduling, manual run, execution logs                            |
| **File Management** | Upload (multipart), download, type/size validation                    |
| **Code Generator** | Reads `information_schema` to auto-generate module scaffolding          |
| **Health Check** | `GET /health`, no auth required                                         |
| **Swagger**     | Auto-enabled in dev, path `/api/v1/docs`                                 |

## Tech Stack

### Backend

- **Framework**: NestJS 12 + Fastify
- **ORM**: Drizzle ORM 1.0 (MySQL 8)
- **Validation**: Zod 4
- **Auth**: jose (JWT) + Bun.password (argon2id password hashing)
- **Cache**: Bun.RedisClient (optional, auto-degrades if not configured)
- **Scheduler**: @nestjs/schedule + cron
- **Docs**: @nestjs/swagger
- **Testing**: vitest + @vitest/coverage-v8
- **Lint**: oxlint + oxfmt

### Frontend

- **Framework**: Vue 3.5 + Vite 8 + TypeScript
- **State**: Pinia 3 · **Router**: Vue Router 5
- **UI**: lew-ui + UnoCSS
- **HTTP**: axios · **Charts**: ECharts 6

## Quick Start

### Prerequisites

- Bun >= 1.4 (single runtime for the backend: app, migrations, seed, and tests all run on Bun)
- MySQL 8
- Redis (optional; cache/online-user/jobs modules auto-degrade if not configured)
- Node.js + pnpm (optional, for the web frontend)

### Backend

```bash
# 1. Clone the project
git clone <repo-url>
cd nest-admin

# 2. Configure environment variables
cp .env.example .env
# Edit .env with the database connection and other required fields

# 3. Install dependencies
bun install

# 4. Run database migrations
bun run db:migrate

# 5. Initialize the admin user
SEED_ADMIN_PASSWORD=your-password bun run db:seed

# 6. Start the dev server
bun run dev
```

The backend runs on `http://localhost:3000` by default; Swagger is at `http://localhost:3000/api/v1/docs`.

### Web Frontend

```bash
cd web
bun install        # or pnpm install
bun run dev        # http://localhost:5173
```

The frontend dev server runs on `http://localhost:5173`; `/api` is proxied to the backend at `http://localhost:3000`.

### Default Admin

| Username | Password                       |
| -------- | ------------------------------ |
| `admin`  | The password set during `db:seed` |

## Project Structure

```
.
├── src/                          # Backend source
│   ├── main.ts                   # Entry point
│   ├── app.module.ts             # Root module
│   ├── config/                   # Environment variable config (Zod)
│   ├── database/
│   │   ├── schema/index.ts       # All table definitions + relations (single file)
│   │   ├── database.service.ts   # MySQL connection pool + Drizzle instance
│   │   ├── migrations/           # SQL migration files
│   │   └── seed/index.ts         # Admin initialization script
│   ├── common/
│   │   ├── auth/                 # JWT Guard, permission decorators, public-route decorators
│   │   ├── cache/                # Redis wrapper
│   │   ├── data-scope/           # Data scope (RuoYi data range)
│   │   └── logging/              # Operation log interceptor
│   └── modules/
│       ├── auth/                 # Login / refresh / logout
│       ├── system/               # Users, roles, menus, depts, posts, dicts, configs
│       ├── monitor/              # Login logs, operation logs, online users, cache monitor
│       ├── dashboard/            # Home page aggregated stats
│       ├── jobs/                 # Scheduled jobs
│       ├── files/                # File management
│       ├── generator/            # Code generator
│       ├── health/               # Health check
│       └── generated/            # Code generator output (gitignored)
├── web/                          # Web frontend (Vue 3 + Vite)
├── docs/screenshots/             # Screenshots (placeholders + generation script)
└── uploads/                      # Upload directory
```

## Environment Variables

| Variable             | Required | Default                 | Description                          |
| -------------------- | :------: | ----------------------- | ------------------------------------ |
| `NODE_ENV`           |    No    | `development`           | Runtime environment                  |
| `PORT`               |    No    | `3000`                  | Service port                         |
| `API_PREFIX`         |    No    | `api/v1`                | API prefix                           |
| `DATABASE_URL`       | **Yes**  | —                       | MySQL connection string              |
| `REDIS_URL`          |    No    | —                       | Redis connection (optional)          |
| `JWT_ISSUER`         | **Yes**  | —                       | JWT issuer                           |
| `JWT_AUDIENCE`       | **Yes**  | —                       | JWT audience                         |
| `JWT_ACCESS_SECRET`  | **Yes**  | —                       | Access Token secret (≥32 chars)      |
| `JWT_REFRESH_SECRET` | **Yes**  | —                       | Refresh Token secret (≥32 chars)     |
| `JWT_ACCESS_TTL`     |    No    | `15m`                   | Access Token TTL                     |
| `JWT_REFRESH_TTL`    |    No    | `7d`                    | Refresh Token TTL                    |
| `CORS_ORIGINS`       |    No    | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `UPLOAD_DIR`         |    No    | `uploads`               | Upload directory                     |
| `SWAGGER_ENABLED`    |    No    | `true`                  | Enable Swagger                       |
| `SWAGGER_PATH`       |    No    | `docs`                  | Swagger path                         |

## Commands

```bash
# Backend (root)
bun run dev              # Dev mode
bun run build            # Build
bun run start            # Production start
bun run typecheck        # Type check
bun run lint             # Lint
bun run lint:fix         # Auto-fix
bun run format           # Format
bun run test             # Run tests
bun run test:watch       # Watch mode
bun run db:generate      # Generate migration files
bun run db:migrate       # Run migrations
bun run db:seed          # Initialize admin
bun run db:studio        # Open Drizzle Studio

# Frontend (web/ directory)
bun run dev              # Dev mode (5173)
bun run build            # Type check + build
bun run typecheck        # vue-tsc type check
bun run lint             # oxlint
```

## Testing

```bash
bun run test             # vitest unit tests
bun run test:watch       # Watch mode
```

Vitest unit tests cover every Controller, Service, Guard, Interceptor, and utility function (**295 test cases**). Each test is fully isolated and does not depend on a database.

## License

MIT
