#!/usr/bin/env node
/**
 * Vercel 部署构建脚本（vercel.json 中的 buildCommand）。
 *
 * 采用 Vercel Bun 运行时（/api 模型，Beta）后，后端无需本地编译：
 * Vercel 会在部署时用 Bun 直接编译并打包 `api/server.ts`（连同其 import 的
 * src/** 源码），本脚本只负责构建前端静态资源：
 *
 *   bun install --frozen-lockfile   （web/ 目录，基于 web/bun.lock）
 *   bun run build                   （vue-tsc + vite build → web/dist）
 *
 * web/dist 通过 vercel.json 的 "outputDirectory" 发布为静态资源，
 * /api/* 通过 rewrites 转发给 /api/server（Bun 运行时函数）。
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(root, 'web');
const webDist = path.join(webDir, 'dist');

function run(cmd, cwd = root, env = process.env) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env });
}

function fail(message) {
  console.error(`\n[vercel-build] 构建失败: ${message}`);
  process.exit(1);
}

// ---------- 0. 预检 ----------
for (const [name, file] of [
  ['前端目录', webDir],
  ['前端 bun lockfile', path.join(webDir, 'bun.lock')],
  ['后端函数入口', path.join(root, 'api', 'server.ts')],
]) {
  if (!existsSync(file)) fail(`缺少 ${name}: ${file}`);
}

// 本机运行（如本地 vercel build / 手跑 build:vercel）时，把 bun 的安装缓存放进
// 工作区，避免写入用户目录时遇到权限问题；Vercel 云端构建（VERCEL=1）不需要。
const isVercel = Boolean(process.env.VERCEL);
const buildEnv = { ...process.env };
if (!isVercel) {
  buildEnv.BUN_INSTALL_CACHE_DIR = path.join(root, '.vercel-build', 'bun-cache');
}

// ---------- 1. 构建前端（bun + vite build → web/dist） ----------
// web/.env.production 已提交 VITE_API_BASE_URL=/api/v1（同源），无需额外注入。
// web/ 使用 bun.lock，安装与构建全程走 bun，无需 pnpm / npm / node。
run('bun install --frozen-lockfile', webDir, buildEnv);
run('bun run build', webDir, buildEnv);

if (!existsSync(path.join(webDist, 'index.html'))) {
  fail('web/dist/index.html 未生成，前端构建失败');
}

console.log('\n✅ 前端构建完成: web/dist/');
console.log('   后端由 Vercel Bun 运行时在部署时编译 api/server.ts。');