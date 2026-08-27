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
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { UsersService } from './users.service.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const createSchema = z.object({
  username: z.string().min(3).max(64),
  displayName: z.string().min(1).max(64),
  password: z.string().min(12).max(128),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  deptId: z.number().int().positive().optional(),
});
const updateSchema = createSchema
  .omit({ username: true, password: true })
  .partial()
  .extend({
    email: z.string().email().nullable().optional(),
    phone: z.string().max(20).nullable().optional(),
    deptId: z.number().int().positive().nullable().optional(),
    status: z.enum(['active', 'disabled']).optional(),
  });
type AuthRequest = { user: { id: number } };

@ApiTags('用户管理')
@ApiBearerAuth('access-token')
@Controller('system/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get()
  @RequirePermissions('system:user:list')
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数', example: 20 })
  @ApiResponse({ status: 200, description: '成功' })
  list(
    @Query('page') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
  ) {
    const page = Math.max(Number(rawPage) || 1, 1);
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100);
    return this.users.list(page, pageSize);
  }
  @Post()
  @RequirePermissions('system:user:create')
  @ApiOperation({ summary: '新增用户' })
  @ApiBody({
    description: '用户创建参数',
    schema: {
      type: 'object',
      required: ['username', 'displayName', 'password'],
      properties: {
        username: { type: 'string', description: '用户名', example: 'admin' },
        displayName: { type: 'string', description: '显示名称', example: '管理员' },
        password: { type: 'string', description: '密码（最少12位）', example: 'abc123456789' },
        email: { type: 'string', description: '邮箱', example: 'admin@example.com' },
        phone: { type: 'string', description: '手机号', example: '13800138000' },
        deptId: { type: 'integer', description: '部门ID', example: 1 },
      },
    },
  })
  @ApiResponse({ status: 200, description: '成功' })
  create(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.users.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id')
  @RequirePermissions('system:user:update')
  @ApiOperation({ summary: '修改用户' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiBody({
    description: '用户更新参数',
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', description: '显示名称', example: '管理员' },
        email: { type: 'string', description: '邮箱', nullable: true, example: 'admin@example.com' },
        phone: { type: 'string', description: '手机号', nullable: true, example: '13800138000' },
        deptId: { type: 'integer', description: '部门ID', nullable: true, example: 1 },
        status: { type: 'string', description: '状态', enum: ['active', 'disabled'], example: 'active' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '成功' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.users.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id')
  @RequirePermissions('system:user:delete')
  @ApiOperation({ summary: '删除用户' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: AuthRequest) {
    return this.users.remove(id, request.user.id);
  }
}
