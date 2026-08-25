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
import { DeptsService } from './depts.service.js';

const createSchema = z.object({
  parentId: z.number().int().min(0).optional(),
  name: z.string().min(1).max(50),
  sort: z.number().int().min(0).optional(),
  leaderUserId: z.number().int().positive().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'disabled']).optional(),
});
const updateSchema = createSchema.partial().extend({
  leaderUserId: z.number().int().positive().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
});
type AuthRequest = { user: { id: number } };

@Controller('system/depts')
export class DeptsController {
  constructor(private readonly depts: DeptsService) {}
  @Get() @RequirePermissions('system:dept:list') list() {
    return this.depts.list();
  }
  @Get(':id') @RequirePermissions('system:dept:list') findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.depts.findOne(id);
  }
  @Post() @RequirePermissions('system:dept:create') create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.depts.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id') @RequirePermissions('system:dept:update') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.depts.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id') @RequirePermissions('system:dept:delete') remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.depts.remove(id, request.user.id);
  }
}
