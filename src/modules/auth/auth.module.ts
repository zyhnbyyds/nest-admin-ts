import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OnlineModule } from '../monitor/online/online.module.js';
@Module({ imports: [OnlineModule], controllers: [AuthController], providers: [AuthService], exports: [AuthService] })
export class AuthModule {}
