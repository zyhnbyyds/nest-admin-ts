# RuoYi Nest Admin

RuoYi-inspired administration API, rebuilt with NestJS 11, Fastify, Drizzle ORM and MySQL.

## Runtime

- Node.js 24 or newer is the production baseline.
- Bun 1.4 or newer is supported for installation, development and test execution.
- MySQL 8 is required. Redis is required when the cache, session and job modules are enabled.

## Quick start

```bash
cp .env.example .env
bun install
bun run db:migrate
SEED_ADMIN_PASSWORD=change-me-now bun run db:seed
bun run dev
```

The API health endpoint is `GET /api/v1/health`.

## Database workflow

Schema definitions live in `src/database/schema`. Never use automatic schema synchronization.

```bash
bun run db:generate
bun run db:migrate
bun run db:seed
```

`db:push` is intentionally absent: production schema changes must be reviewed SQL migrations.
