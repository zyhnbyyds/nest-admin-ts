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
  @ApiBody({ description: '菜单创建参数' })
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
  @ApiBody({ description: '菜单更新参数' })
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
