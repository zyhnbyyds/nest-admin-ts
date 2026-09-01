import 'reflect-metadata';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { InjectOptions } from 'fastify';
import { z } from 'zod';
import { zhCN } from 'zod/v4/locales';
import { createApp } from '../src/app-bootstrap';

// 全局启用 zod 中文校验提示（需在任意 schema 解析前生效）
z.config(zhCN());

let app: NestFastifyApplication | null = null;

async function getApp(): Promise<NestFastifyApplication> {
  if (!app) {
    app = await createApp();
    await app.init();
  }
  return app;
}

/**
 * Vercel Bun 运行时函数（/api 模型，Beta）。
 *
 * 文档：https://vercel.com/docs/functions/runtimes/bun
 * - vercel.json 中声明 "bunVersion"，本文件在模块启动时调用一次 Bun.serve()，
 *   Vercel 检测到后把 /api/server 的请求全部路由进来；
 * - 请求是标准 Web Request，body 以原始字节读取后通过 fastify.inject() 喂给
 *   NestJS/Fastify 内部路由，因此 JSON / urlencoded / multipart 均可正常解析；
 * - 冷启动时惰性创建 Nest 应用实例并缓存，后续请求复用。
 */
Bun.serve({
  async fetch(request: Request): Promise<Response> {
    try {
      const fastifyApp = await getApp();
      const url = new URL(request.url);

      // /api 模型的函数地址是 /api/server：请求可能带该前缀，剥掉后交给 Nest 路由
      let pathname = url.pathname;
      if (pathname.startsWith('/api/server')) {
        pathname = pathname.slice('/api/server'.length) || '/';
      }

      const dispatch: InjectOptions = {
        method: request.method as NonNullable<InjectOptions['method']>,
        url: pathname + url.search,
        headers: Object.fromEntries(request.headers.entries()),
      };
      if (request.body !== null) {
        dispatch.payload = Buffer.from(await request.arrayBuffer());
      }

      const result = await fastifyApp.inject(dispatch);

      const headers = new Headers();
      for (const [key, value] of Object.entries(result.headers)) {
        if (value === undefined) continue;
        // 逐跳头由平台处理，不转发；content-length 由 Response 自动设置
        if (['connection', 'keep-alive', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
          continue;
        }
        if (Array.isArray(value)) {
          for (const item of value) headers.append(key, item);
        } else {
          headers.set(key, String(value));
        }
      }
      return new Response(result.payload as BodyInit, {
        status: result.statusCode,
        headers,
      });
    } catch (error) {
      // 兜底：避免函数无响应
      console.error('[bun:server] handler error:', error);
      return Response.json(
        { statusCode: 500, message: 'Internal Server Error' },
        { status: 500 },
      );
    }
  },
});