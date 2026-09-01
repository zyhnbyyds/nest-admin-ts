import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

/**
 * 创建并完成全部初始化的 NestJS 应用（不含 listen）。
 *
 * - 本地/服务器：main.ts 拿到实例后调用 app.listen()
 * - Vercel Bun 运行时：api/server.ts 拿到实例后通过 fastify.inject() 分发请求
 *
 * 两个入口共用同一套初始化逻辑，保证行为一致。
 */
export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  const config = app.get(AppConfigService);
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(multipart, {
    limits: { files: 1, fileSize: 10 * 1024 * 1024 },
  });
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.setGlobalPrefix(config.apiPrefix);
  app.enableShutdownHooks();

  if (config.swagger.SWAGGER_ENABLED) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(config.swagger.SWAGGER_TITLE)
      .setDescription(config.swagger.SWAGGER_DESCRIPTION)
      .setVersion(config.swagger.SWAGGER_VERSION)
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    // Merge zod-to-openapi registry schemas into the NestJS-generated document
    const { getComponentSchemas } =
      await import('./common/swagger/zod-schema.helper');
    const zodSchemas = getComponentSchemas();
    if (document.components) {
      document.components.schemas = {
        ...document.components.schemas,
        ...zodSchemas,
      };
    }

    SwaggerModule.setup(config.swagger.SWAGGER_PATH, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    Logger.log(
      `Swagger docs available at /${config.apiPrefix}/${config.swagger.SWAGGER_PATH}`,
      'Bootstrap',
    );
  }

  return app;
}