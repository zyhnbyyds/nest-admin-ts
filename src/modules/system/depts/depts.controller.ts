import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { DeptsService } from './depts.service.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const createSchema = z.object({
  parentId: z.number().int().min(0).optional(),
  name: z.string().min(1).max(50),
  sort: z.number().int().min(0).optional(),
  leaderUserId: z.number().int().positive().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'disabled']).optional(),
});
const updateSchema = createSchema.partial().extend({
  leaderUserId: z.number().int().positive().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
});
type AuthRequest = { user: { id: number } };

@ApiTags('部门管理')
@ApiBearerAuth('access-token')
@Controller('system/depts')
export class DeptsController {
  constructor(private readonly depts: DeptsService) {}
  @Get()
  @RequirePermissions('system:dept:list')
  @ApiOperation({ summary: '获取部门树' })
  @ApiResponse({ status: 200, description: '成功' })
  list() {
    return this.depts.list();
  }
  @Get(':id')
  @RequirePermissions('system:dept:list')
  @ApiOperation({ summary: '获取部门详情' })
  @ApiParam({ name: 'id', description: '部门ID' })
  @ApiResponse({ status: 200, description: '成功' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.depts.findOne(id);
  }
  @Post()
  @RequirePermissions('system:dept:create')
  @ApiOperation({ summary: '新增部门' })
  @ApiBody({ description: '部门创建参数' })
  @ApiResponse({ status: 200, description: '成功' })
  create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.depts.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id')
  @RequirePermissions('system:dept:update')
  @ApiOperation({ summary: '修改部门' })
  @ApiParam({ name: 'id', description: '部门ID' })
  @ApiBody({ description: '部门更新参数' })
  @ApiResponse({ status: 200, description: '成功' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.depts.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id')
  @RequirePermissions('system:dept:delete')
  @ApiOperation({ summary: '删除部门' })
  @ApiParam({ name: 'id', description: '部门ID' })
  @ApiResponse({ status: 200, description: '成功' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.depts.remove(id, request.user.id);
  }
}
