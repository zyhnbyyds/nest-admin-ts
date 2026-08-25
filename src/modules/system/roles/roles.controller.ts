import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { RolesService } from './roles.service.js';

const createSchema = z.object({ name: z.string().min(1).max(50), key: z.string().min(2).max(100).regex(/^[a-z0-9:_-]+$/), sort: z.number().int().min(0).optional(), dataScope: z.enum(['all', 'custom', 'dept', 'dept_and_children', 'self']).optional(), menuIds: z.array(z.number().int().positive()).max(500).optional() });
const menuSchema = z.object({ menuIds: z.array(z.number().int().positive()).max(500) });
type AuthRequest = { user: { id: number } };

@Controller('system/roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}
  @Get() @RequirePermissions('system:role:list') list() { return this.roles.list(); }
  @Post() @RequirePermissions('system:role:create') create(@Body() body: unknown, @Req() request: AuthRequest) { return this.roles.create(createSchema.parse(body), request.user.id); }
  @Post(':id/menus') @RequirePermissions('system:role:update') setMenus(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) { return this.roles.setMenus(id, menuSchema.parse(body).menuIds); }
}
