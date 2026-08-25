import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), AppConfigModule, DatabaseModule, HealthModule, AuthModule] })
export class AppModule {}
