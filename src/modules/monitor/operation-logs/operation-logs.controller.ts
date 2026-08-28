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
import { OperationLogsService } from './operation-logs.service';

@ApiTags('操作日志')
@Controller('monitor/operation-logs')
export class OperationLogsController {
  constructor(private readonly operationLogs: OperationLogsService) {}
  @Get()
  @RequirePermissions('monitor:operlog:list')
  @ApiOperation({ summary: '获取操作日志列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiQuery({ name: 'status', required: false, description: '操作状态' })
  @ApiQuery({ name: 'userId', required: false, description: '操作用户ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  list(
    @Query('page') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
    @Query('status') status?: string,
    @Query('userId') rawUserId?: string,
  ) {
    const page = Math.max(Number(rawPage) || 1, 1);
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100);
    const userId =
      rawUserId === undefined || rawUserId === ''
        ? undefined
        : Number(rawUserId);
    return this.operationLogs.list(
      page,
      pageSize,
      status,
      Number.isNaN(userId) ? undefined : userId,
    );
  }
  @Get(':id')
  @RequirePermissions('monitor:operlog:list')
  @ApiOperation({ summary: '获取操作日志详情' })
  @ApiParam({ name: 'id', description: '操作日志ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.operationLogs.findOne(id);
  }
  @Delete(':id')
  @RequirePermissions('monitor:operlog:delete')
  @ApiOperation({ summary: '删除指定操作日志' })
  @ApiParam({ name: 'id', description: '操作日志ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.operationLogs.remove(id);
  }
  @Delete()
  @RequirePermissions('monitor:operlog:delete')
  @ApiOperation({ summary: '清空所有操作日志' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  clear() {
    return this.operationLogs.clear();
  }
}
