import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/auth/permissions.decorator';
import { LoginLogsService } from './login-logs.service';

@ApiTags('登录日志')
@Controller('monitor/login-logs')
export class LoginLogsController {
  constructor(private readonly loginLogs: LoginLogsService) {}
  @Get()
  @RequirePermissions('monitor:loginlog:list')
  @ApiOperation({ summary: '获取登录日志列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiQuery({ name: 'username', required: false, description: '用户名' })
  @ApiQuery({ name: 'status', required: false, description: '登录状态' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
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
  @Get(':id')
  @RequirePermissions('monitor:loginlog:list')
  @ApiOperation({ summary: '获取登录日志详情' })
  @ApiParam({ name: 'id', description: '登录日志ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.loginLogs.findOne(id);
  }
  @Delete(':id')
  @RequirePermissions('monitor:loginlog:delete')
  @ApiOperation({ summary: '删除指定登录日志' })
  @ApiParam({ name: 'id', description: '登录日志ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.loginLogs.remove(id);
  }
  @Delete()
  @RequirePermissions('monitor:loginlog:delete')
  @ApiOperation({ summary: '清空所有登录日志' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  clear() {
    return this.loginLogs.clear();
  }
}
