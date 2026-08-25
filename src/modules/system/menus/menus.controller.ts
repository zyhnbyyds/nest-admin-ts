import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { MenusService } from './menus.service.js';

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

@Controller('system/menus')
export class MenusController {
  constructor(private readonly menus: MenusService) {}
  @Get() @RequirePermissions('system:menu:list') list() { return this.menus.list(); }
  @Get('routes') routes(@Req() request: AuthRequest) { return this.menus.routes(request.user.id); }
  @Get(':id') @RequirePermissions('system:menu:list') findOne(@Param('id', ParseIntPipe) id: number) { return this.menus.findOne(id); }
  @Post() @RequirePermissions('system:menu:create') create(@Body() body: unknown, @Req() request: AuthRequest) { return this.menus.create(createSchema.parse(body), request.user.id); }
  @Patch(':id') @RequirePermissions('system:menu:update') update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown, @Req() request: AuthRequest) { return this.menus.update(id, updateSchema.parse(body), request.user.id); }
  @Delete(':id') @RequirePermissions('system:menu:delete') remove(@Param('id', ParseIntPipe) id: number, @Req() request: AuthRequest) { return this.menus.remove(id, request.user.id); }
}
