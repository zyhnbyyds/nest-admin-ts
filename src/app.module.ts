import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './modules/health/health.module';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/cache/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccessTokenGuard } from './common/auth/access-token.guard';
import { OperationLogInterceptor } from './common/logging/operation-log.interceptor';
import { UsersModule } from './modules/system/users/users.module';
import { RolesModule } from './modules/system/roles/roles.module';
import { MenusModule } from './modules/system/menus/menus.module';
import { DeptsModule } from './modules/system/depts/depts.module';
import { PostsModule } from './modules/system/posts/posts.module';
import { DictTypesModule } from './modules/system/dict-types/dict-types.module';
import { DictDataModule } from './modules/system/dict-data/dict-data.module';
import { ConfigsModule } from './modules/system/configs/configs.module';
import { LoginLogsModule } from './modules/monitor/login-logs/login-logs.module';
import { OperationLogsModule } from './modules/monitor/operation-logs/operation-logs.module';
import { OnlineModule } from './modules/monitor/online/online.module';
import { CacheModule } from './modules/monitor/cache/cache.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { FilesModule } from './modules/files/files.module';
import { GeneratorModule } from './modules/generator/generator.module';
import { CompatModule } from './modules/compat/compat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    MenusModule,
    DeptsModule,
    PostsModule,
    DictTypesModule,
    DictDataModule,
    ConfigsModule,
    LoginLogsModule,
    OperationLogsModule,
    OnlineModule,
    CacheModule,
    JobsModule,
    FilesModule,
    GeneratorModule,
    CompatModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_INTERCEPTOR, useClass: OperationLogInterceptor },
  ],
})
export class AppModule {}
