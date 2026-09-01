import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { zhCN } from 'zod/v4/locales';
import { createApp } from './app-bootstrap';
import { AppConfigService } from './config/app-config.service';

// 全局启用 zod 中文校验提示（需在任意 schema 解析前生效）
z.config(zhCN());

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(AppConfigService);
  await app.listen({ port: config.port, host: '0.0.0.0' });
  Logger.log(`API listening on ${config.port}`, 'Bootstrap');
}

void bootstrap();