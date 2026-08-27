import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { RolesService } from './roles.service.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const createSchema = z.object({
  name: z.string().min(1).max(50),
  key: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9:_-]+$/),
  sort: z.number().int().min(0).optional(),
  dataScope: z
    .enum(['all', 'custom', 'dept', 'dept_and_children', 'self'])
    .optional(),
  menuIds: z.array(z.number().int().positive()).max(500).optional(),
});
const menuSchema = z.object({
  menuIds: z.array(z.number().int().positive()).max(500),
});
type AuthRequest = { user: { id: number } };

@ApiTags('角色管理')
@ApiBearerAuth('access-token')
@Controller('system/roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}
  @Get()
  @RequirePermissions('system:role:list')
  @ApiOperation({ summary: '获取角色列表' })
  @ApiResponse({ status: 200, description: '成功' })
  list() {
    return this.roles.list();
  }
  @Post()
  @RequirePermissions('system:role:create')
  @ApiOperation({ summary: '新增角色' })
  @ApiBody({ description: '角色创建参数' })
  @ApiResponse({ status: 200, description: '成功' })
  create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.roles.create(createSchema.parse(body), request.user.id);
  }
  @Post(':id/menus')
  @RequirePermissions('system:role:update')
  @ApiOperation({ summary: '设置角色菜单权限' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiBody({ description: '菜单权限参数' })
  @ApiResponse({ status: 200, description: '成功' })
  setMenus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.roles.setMenus(id, menuSchema.parse(body).menuIds);
  }
}
