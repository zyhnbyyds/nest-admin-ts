import { Module } from '@nestjs/common';
import { LoginLogsController } from './login-logs.controller.js';
import { LoginLogsService } from './login-logs.service.js';
@Module({ controllers: [LoginLogsController], providers: [LoginLogsService] })
export class LoginLogsModule {}
