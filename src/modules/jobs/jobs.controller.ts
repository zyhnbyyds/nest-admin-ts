import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { JobsService } from './jobs.service.js';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  handler: z.string().min(1).max(255),
  cron: z.string().min(1).max(100),
  status: z.enum(['active', 'disabled']).optional(),
  concurrent: z.boolean().optional(),
  remark: z.string().max(500).optional(),
});
const updateSchema = createSchema
  .partial()
  .extend({ remark: z.string().max(500).nullable().optional() });
type AuthRequest = { user: { id: number } };

@ApiTags('定时任务管理')
@Controller('system/jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}
  @Get()
  @RequirePermissions('system:job:list')
  @ApiOperation({ summary: '获取任务列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  list(
    @Query('page') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
  ) {
    const page = Math.max(Number(rawPage) || 1, 1);
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100);
    return this.jobs.list(page, pageSize);
  }
  @Get(':id/logs')
  @RequirePermissions('system:job:list')
  @ApiOperation({ summary: '获取任务执行日志' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  logs(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
  ) {
    const page = Math.max(Number(rawPage) || 1, 1);
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100);
    return this.jobs.listLogs(id, page, pageSize);
  }
  @Get(':id')
  @RequirePermissions('system:job:list')
  @ApiOperation({ summary: '获取任务详情' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobs.findOne(id);
  }
  @Post()
  @RequirePermissions('system:job:create')
  @ApiOperation({ summary: '新增任务' })
  @ApiBody({ description: '任务信息' })
  @ApiResponse({ status: 201, description: '成功' })
  @ApiBearerAuth('access-token')
  create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.jobs.create(createSchema.parse(body), request.user.id);
  }
  @Post(':id/run')
  @RequirePermissions('system:job:run')
  @ApiOperation({ summary: '手动执行任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  run(@Param('id', ParseIntPipe) id: number) {
    return this.jobs.runNow(id);
  }
  @Patch(':id')
  @RequirePermissions('system:job:update')
  @ApiOperation({ summary: '修改任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiBody({ description: '任务信息' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.jobs.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete('logs')
  @RequirePermissions('system:job:delete')
  @ApiOperation({ summary: '清空任务日志' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  clearLogs() {
    return this.jobs.clearLogs();
  }
  @Delete(':id')
  @RequirePermissions('system:job:delete')
  @ApiOperation({ summary: '删除任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.jobs.remove(id, request.user.id);
  }
}
