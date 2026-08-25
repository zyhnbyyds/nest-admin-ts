import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { ConfigsService } from './configs.service.js';

const createSchema = z.object({ name: z.string().min(1).max(100), key: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._:-]+$/), value: z.string().min(1).max(500), builtin: z.boolean().optional(), remark: z.string().max(500).optional() });
const updateSchema = createSchema.partial().extend({ remark: z.string().max(500).nullable().optional() });
type AuthRequest = { user: { id: number } };

@Controller('system/configs')
export class ConfigsController {
  constructor(private readonly configs: ConfigsService) {}
  @Get() @RequirePermissions('system:config:list')
  list(@Query('page') rawPage?: string, @Query('pageSize') rawPageSize?: string) { const page = Math.max(Number(rawPage) || 1, 1); const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100); return this.configs.list(page, pageSize); }
  @Get('key/:key') @RequirePermissions('system:config:list') byKey(@Param('key') key: string) { return this.configs.byKey(key); }
  @Get(':id') @RequirePermissions('system:config:list') findOne(@Param('id', ParseIntPipe) id: number) { return this.configs.findOne(id); }
  @Post() @RequirePermissions('system:config:create') create(@Body() body: unknown, @Req() request: AuthRequest) { return this.configs.create(createSchema.parse(body), request.user.id); }
  @Patch(':id') @RequirePermissions('system:config:update') update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown, @Req() request: AuthRequest) { return this.configs.update(id, updateSchema.parse(body), request.user.id); }
  @Delete(':id') @RequirePermissions('system:config:delete') remove(@Param('id', ParseIntPipe) id: number, @Req() request: AuthRequest) { return this.configs.remove(id, request.user.id); }
}
