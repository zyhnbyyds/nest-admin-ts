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
import { registerComponent } from '../../../common/swagger/zod-schema.helper';
import { RequirePermissions } from '../../../common/auth/permissions.decorator';
import { UsersService } from './users.service';
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
  username: z
    .string()
    .min(3)
    .max(64)
    .openapi({ example: 'zhangsan', description: '用户名' }),
  displayName: z
    .string()
    .min(1)
    .max(64)
    .openapi({ example: '张三', description: '显示名称' }),
  password: z
    .string()
    .min(12)
    .max(128)
    .openapi({ example: 'password123456', description: '密码（最少12位）' }),
  email: z
    .string()
    .email()
    .optional()
    .openapi({ example: 'zhangsan@example.com', description: '邮箱' }),
  phone: z
    .string()
    .max(20)
    .optional()
    .openapi({ example: '13800138000', description: '手机号' }),
  deptId: z
    .number()
    .int()
    .positive()
    .optional()
    .openapi({ example: 1, description: '部门ID' }),
});
const updateSchema = createSchema
  .omit({ username: true, password: true })
  .partial()
  .extend({
    email: z
      .string()
      .email()
      .nullable()
      .optional()
      .openapi({ example: 'zhangsan@example.com', description: '邮箱' }),
    phone: z
      .string()
      .max(20)
      .nullable()
      .optional()
      .openapi({ example: '13800138000', description: '手机号' }),
    deptId: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional()
      .openapi({ example: 1, description: '部门ID' }),
    status: z
      .enum(['active', 'disabled'])
      .optional()
      .openapi({ example: 'active', description: '状态' }),
  });

registerComponent('CreateUserRequest', createSchema);
registerComponent('UpdateUserRequest', updateSchema);

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
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: '每页条数',
    example: 20,
  })
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
  @ApiBody({ schema: { $ref: '#/components/schemas/CreateUserRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  create(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.users.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id')
  @RequirePermissions('system:user:update')
  @ApiOperation({ summary: '修改用户' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiBody({ schema: { $ref: '#/components/schemas/UpdateUserRequest' } })
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
