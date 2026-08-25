import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { OperationLogsService } from './operation-logs.service.js';

@Controller('monitor/operation-logs')
export class OperationLogsController {
  constructor(private readonly operationLogs: OperationLogsService) {}
  @Get()
  @RequirePermissions('monitor:operlog:list')
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
  @Get(':id') @RequirePermissions('monitor:operlog:list') findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.operationLogs.findOne(id);
  }
  @Delete(':id') @RequirePermissions('monitor:operlog:delete') remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.operationLogs.remove(id);
  }
  @Delete() @RequirePermissions('monitor:operlog:delete') clear() {
    return this.operationLogs.clear();
  }
}
