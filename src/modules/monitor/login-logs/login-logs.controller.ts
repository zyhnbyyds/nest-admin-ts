import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { LoginLogsService } from './login-logs.service.js';

@Controller('monitor/login-logs')
export class LoginLogsController {
  constructor(private readonly loginLogs: LoginLogsService) {}
  @Get()
  @RequirePermissions('monitor:loginlog:list')
  list(
    @Query('page') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
    @Query('username') username?: string,
    @Query('status') status?: string,
  ) {
    const page = Math.max(Number(rawPage) || 1, 1);
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100);
    return this.loginLogs.list(page, pageSize, username, status);
  }
  @Get(':id') @RequirePermissions('monitor:loginlog:list') findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.loginLogs.findOne(id);
  }
  @Delete(':id') @RequirePermissions('monitor:loginlog:delete') remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.loginLogs.remove(id);
  }
  @Delete() @RequirePermissions('monitor:loginlog:delete') clear() {
    return this.loginLogs.clear();
  }
}
