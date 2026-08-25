import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AccessTokenGuard } from './common/auth/access-token.guard.js';
import { UsersModule } from './modules/system/users/users.module.js';
import { RolesModule } from './modules/system/roles/roles.module.js';
import { MenusModule } from './modules/system/menus/menus.module.js';
import { DeptsModule } from './modules/system/depts/depts.module.js';
import { PostsModule } from './modules/system/posts/posts.module.js';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), AppConfigModule, DatabaseModule, HealthModule, AuthModule, UsersModule, RolesModule, MenusModule, DeptsModule, PostsModule], providers: [{ provide: APP_GUARD, useClass: AccessTokenGuard }] })
export class AppModule {}
