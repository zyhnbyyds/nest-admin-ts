import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './intercepts/transform.interceptor';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
// import { addLock, loseLock } from './utils/crypto';

async function loadApp() {
  // 创建app实例
  const app = await NestFactory.create(AppModule, {
    logger: ['log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('server.port');
  // 全局拦截器的使用
  app.useGlobalInterceptors(new TransformInterceptor());
  // 全局过滤器的使用
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);
  console.log(`启动在${port}...`);
}
loadApp();
