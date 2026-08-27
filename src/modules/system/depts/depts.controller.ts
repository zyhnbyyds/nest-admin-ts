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
import { registerComponent } from '../../../common/swagger/zod-schema.helper.js';
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
  parentId: z.number().int().min(0).optional().openapi({ example: 0, description: '父部门ID' }),
  name: z.string().min(1).max(50).openapi({ example: '研发部', description: '部门名称' }),
  sort: z.number().int().min(0).optional().openapi({ example: 1, description: '排序' }),
  leaderUserId: z.number().int().positive().optional().openapi({ example: 1, description: '负责人用户ID' }),
  phone: z.string().max(20).optional().openapi({ example: '13800138000', description: '联系电话' }),
  email: z.string().email().optional().openapi({ example: 'dev@example.com', description: '邮箱' }),
  status: z.enum(['active', 'disabled']).optional().openapi({ example: 'active', description: '状态' }),
});
const updateSchema = createSchema.partial().extend({
  leaderUserId: z.number().int().positive().nullable().optional().openapi({ example: 1, description: '负责人用户ID' }),
  phone: z.string().max(20).nullable().optional().openapi({ example: '13800138000', description: '联系电话' }),
  email: z.string().email().nullable().optional().openapi({ example: 'dev@example.com', description: '邮箱' }),
});

registerComponent('CreateDeptRequest', createSchema);
registerComponent('UpdateDeptRequest', updateSchema);

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
  @ApiBody({ schema: { $ref: '#/components/schemas/CreateDeptRequest' } })
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
  @ApiBody({ schema: { $ref: '#/components/schemas/UpdateDeptRequest' } })
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
