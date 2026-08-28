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
import { registerComponent } from '../../../common/swagger/zod-schema.helper';
import { RequirePermissions } from '../../../common/auth/permissions.decorator';
import { RolesService } from './roles.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const createSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .openapi({ example: '管理员', description: '角色名称' }),
  key: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9:_-]+$/)
    .openapi({ example: 'admin', description: '角色标识' }),
  sort: z
    .number()
    .int()
    .min(0)
    .optional()
    .openapi({ example: 1, description: '排序' }),
  dataScope: z
    .enum(['all', 'custom', 'dept', 'dept_and_children', 'self'])
    .optional()
    .openapi({ example: 'all', description: '数据权限范围' }),
  menuIds: z
    .array(z.number().int().positive())
    .max(500)
    .optional()
    .openapi({ example: [1, 2, 3], description: '菜单ID集合' }),
});
const menuSchema = z.object({
  menuIds: z
    .array(z.number().int().positive())
    .max(500)
    .openapi({ example: [1, 2, 3], description: '菜单ID集合' }),
});

registerComponent('CreateRoleRequest', createSchema);
registerComponent('SetRoleMenusRequest', menuSchema);
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
  @ApiBody({ schema: { $ref: '#/components/schemas/CreateRoleRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  create(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.roles.create(createSchema.parse(body), request.user.id);
  }
  @Post(':id/menus')
  @RequirePermissions('system:role:update')
  @ApiOperation({ summary: '设置角色菜单权限' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiBody({ schema: { $ref: '#/components/schemas/SetRoleMenusRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  setMenus(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.roles.setMenus(id, menuSchema.parse(body).menuIds);
  }
}
