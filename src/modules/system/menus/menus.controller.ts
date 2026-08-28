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
import { registerComponent } from '../../../common/swagger/zod-schema.helper';
import { RequirePermissions } from '../../../common/auth/permissions.decorator';
import { MenusService } from './menus.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const createSchema = z.object({
  parentId: z
    .number()
    .int()
    .min(0)
    .optional()
    .openapi({ example: 0, description: '父菜单ID' }),
  name: z
    .string()
    .min(1)
    .max(100)
    .openapi({ example: 'system', description: '菜单名称' }),
  title: z
    .string()
    .min(1)
    .max(100)
    .openapi({ example: '系统管理', description: '菜单标题' }),
  type: z
    .enum(['M', 'C', 'F'])
    .openapi({ example: 'M', description: '菜单类型（M目录 C菜单 F按钮）' }),
  path: z
    .string()
    .max(255)
    .optional()
    .openapi({ example: '/system', description: '路由路径' }),
  component: z
    .string()
    .max(255)
    .optional()
    .openapi({ example: 'system/index', description: '组件路径' }),
  permission: z
    .string()
    .max(255)
    .optional()
    .openapi({ example: 'system:user:list', description: '权限标识' }),
  icon: z
    .string()
    .max(100)
    .optional()
    .openapi({ example: 'setting', description: '图标' }),
  sort: z
    .number()
    .int()
    .min(0)
    .optional()
    .openapi({ example: 1, description: '排序' }),
  visible: z
    .boolean()
    .optional()
    .openapi({ example: true, description: '是否可见' }),
  cacheable: z
    .boolean()
    .optional()
    .openapi({ example: false, description: '是否缓存' }),
  external: z
    .boolean()
    .optional()
    .openapi({ example: false, description: '是否外链' }),
  status: z
    .enum(['active', 'disabled'])
    .optional()
    .openapi({ example: 'active', description: '状态' }),
});
const updateSchema = createSchema.partial().extend({
  path: z
    .string()
    .max(255)
    .nullable()
    .optional()
    .openapi({ example: '/system', description: '路由路径' }),
  component: z
    .string()
    .max(255)
    .nullable()
    .optional()
    .openapi({ example: 'system/index', description: '组件路径' }),
  permission: z
    .string()
    .max(255)
    .nullable()
    .optional()
    .openapi({ example: 'system:user:list', description: '权限标识' }),
  icon: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .openapi({ example: 'setting', description: '图标' }),
});

registerComponent('CreateMenuRequest', createSchema);
registerComponent('UpdateMenuRequest', updateSchema);

type AuthRequest = { user: { id: number } };

@ApiTags('菜单管理')
@ApiBearerAuth('access-token')
@Controller('system/menus')
export class MenusController {
  constructor(private readonly menus: MenusService) {}
  @Get()
  @RequirePermissions('system:menu:list')
  @ApiOperation({ summary: '获取菜单树' })
  @ApiResponse({ status: 200, description: '成功' })
  list() {
    return this.menus.list();
  }
  @Get('routes')
  @ApiOperation({ summary: '获取当前用户动态路由' })
  @ApiResponse({ status: 200, description: '成功' })
  routes(@Req() request: AuthRequest) {
    return this.menus.routes(request.user.id);
  }
  @Get(':id')
  @RequirePermissions('system:menu:list')
  @ApiOperation({ summary: '获取菜单详情' })
  @ApiParam({ name: 'id', description: '菜单ID' })
  @ApiResponse({ status: 200, description: '成功' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menus.findOne(id);
  }
  @Post()
  @RequirePermissions('system:menu:create')
  @ApiOperation({ summary: '新增菜单' })
  @ApiBody({ schema: { $ref: '#/components/schemas/CreateMenuRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  create(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.menus.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id')
  @RequirePermissions('system:menu:update')
  @ApiOperation({ summary: '修改菜单' })
  @ApiParam({ name: 'id', description: '菜单ID' })
  @ApiBody({ schema: { $ref: '#/components/schemas/UpdateMenuRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.menus.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id')
  @RequirePermissions('system:menu:delete')
  @ApiOperation({ summary: '删除菜单' })
  @ApiParam({ name: 'id', description: '菜单ID' })
  @ApiResponse({ status: 200, description: '成功' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: AuthRequest) {
    return this.menus.remove(id, request.user.id);
  }
}
