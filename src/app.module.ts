import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './common/cache/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AccessTokenGuard } from './common/auth/access-token.guard.js';
import { OperationLogInterceptor } from './common/logging/operation-log.interceptor.js';
import { UsersModule } from './modules/system/users/users.module.js';
import { RolesModule } from './modules/system/roles/roles.module.js';
import { MenusModule } from './modules/system/menus/menus.module.js';
import { DeptsModule } from './modules/system/depts/depts.module.js';
import { PostsModule } from './modules/system/posts/posts.module.js';
import { DictTypesModule } from './modules/system/dict-types/dict-types.module.js';
import { DictDataModule } from './modules/system/dict-data/dict-data.module.js';
import { ConfigsModule } from './modules/system/configs/configs.module.js';
import { LoginLogsModule } from './modules/monitor/login-logs/login-logs.module.js';
import { OperationLogsModule } from './modules/monitor/operation-logs/operation-logs.module.js';
import { OnlineModule } from './modules/monitor/online/online.module.js';
import { CacheModule } from './modules/monitor/cache/cache.module.js';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), AppConfigModule, DatabaseModule, RedisModule, HealthModule, AuthModule, UsersModule, RolesModule, MenusModule, DeptsModule, PostsModule, DictTypesModule, DictDataModule, ConfigsModule, LoginLogsModule, OperationLogsModule, OnlineModule, CacheModule], providers: [{ provide: APP_GUARD, useClass: AccessTokenGuard }, { provide: APP_INTERCEPTOR, useClass: OperationLogInterceptor }] })
export class AppModule {}
