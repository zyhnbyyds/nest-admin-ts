import { Module } from '@nestjs/common';
import { LoginLogsController } from './login-logs.controller';
import { LoginLogsService } from './login-logs.service';
@Module({ controllers: [LoginLogsController], providers: [LoginLogsService] })
export class LoginLogsModule {}
