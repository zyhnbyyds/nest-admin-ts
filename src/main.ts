import 'reflect-metadata';
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
import { AppModule } from './app.module.js';
import { AppConfigService } from './config/app-config.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );
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
    SwaggerModule.setup(config.swagger.SWAGGER_PATH, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    Logger.log(
      `Swagger docs available at /${config.apiPrefix}/${config.swagger.SWAGGER_PATH}`,
      'Bootstrap',
    );
  }

  await app.listen({ port: config.port, host: '0.0.0.0' });
  Logger.log(`API listening on ${config.port}`, 'Bootstrap');
}

void bootstrap();
