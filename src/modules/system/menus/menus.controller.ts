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
import { MenusService } from './menus.service.js';
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
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  type: z.enum(['M', 'C', 'F']),
  path: z.string().max(255).optional(),
  component: z.string().max(255).optional(),
  permission: z.string().max(255).optional(),
  icon: z.string().max(100).optional(),
  sort: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
  cacheable: z.boolean().optional(),
  external: z.boolean().optional(),
  status: z.enum(['active', 'disabled']).optional(),
});
const updateSchema = createSchema.partial().extend({
  path: z.string().max(255).nullable().optional(),
  component: z.string().max(255).nullable().optional(),
  permission: z.string().max(255).nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
});
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
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.menus.findOne(id);
  }
  @Post()
  @RequirePermissions('system:menu:create')
  @ApiOperation({ summary: '新增菜单' })
  @ApiBody({
    description: '菜单创建参数',
    schema: {
      type: 'object',
      required: ['name', 'title', 'type'],
      properties: {
        parentId: { type: 'integer', description: '父菜单ID', example: 0 },
        name: { type: 'string', description: '菜单名称', example: 'system' },
        title: { type: 'string', description: '菜单标题', example: '系统管理' },
        type: { type: 'string', description: '菜单类型（M目录 C菜单 F按钮）', enum: ['M', 'C', 'F'], example: 'M' },
        path: { type: 'string', description: '路由路径', example: '/system' },
        component: { type: 'string', description: '组件路径', example: 'system/index' },
        permission: { type: 'string', description: '权限标识', example: 'system:list' },
        icon: { type: 'string', description: '图标', example: 'setting' },
        sort: { type: 'integer', description: '排序', example: 0 },
        visible: { type: 'boolean', description: '是否可见', example: true },
        cacheable: { type: 'boolean', description: '是否缓存', example: false },
        external: { type: 'boolean', description: '是否外链', example: false },
        status: { type: 'string', description: '状态', enum: ['active', 'disabled'], example: 'active' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '成功' })
  create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.menus.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id')
  @RequirePermissions('system:menu:update')
  @ApiOperation({ summary: '修改菜单' })
  @ApiParam({ name: 'id', description: '菜单ID' })
  @ApiBody({
    description: '菜单更新参数',
    schema: {
      type: 'object',
      properties: {
        parentId: { type: 'integer', description: '父菜单ID', example: 0 },
        name: { type: 'string', description: '菜单名称', example: 'system' },
        title: { type: 'string', description: '菜单标题', example: '系统管理' },
        type: { type: 'string', description: '菜单类型（M目录 C菜单 F按钮）', enum: ['M', 'C', 'F'], example: 'M' },
        path: { type: 'string', description: '路由路径', nullable: true, example: '/system' },
        component: { type: 'string', description: '组件路径', nullable: true, example: 'system/index' },
        permission: { type: 'string', description: '权限标识', nullable: true, example: 'system:list' },
        icon: { type: 'string', description: '图标', nullable: true, example: 'setting' },
        sort: { type: 'integer', description: '排序', example: 0 },
        visible: { type: 'boolean', description: '是否可见', example: true },
        cacheable: { type: 'boolean', description: '是否缓存', example: false },
        external: { type: 'boolean', description: '是否外链', example: false },
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
    return this.menus.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id')
  @RequirePermissions('system:menu:delete')
  @ApiOperation({ summary: '删除菜单' })
  @ApiParam({ name: 'id', description: '菜单ID' })
  @ApiResponse({ status: 200, description: '成功' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.menus.remove(id, request.user.id);
  }
}
