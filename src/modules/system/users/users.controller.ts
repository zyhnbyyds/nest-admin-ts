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
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { UsersService } from './users.service.js';

const createSchema = z.object({
  username: z.string().min(3).max(64),
  displayName: z.string().min(1).max(64),
  password: z.string().min(12).max(128),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  deptId: z.number().int().positive().optional(),
});
const updateSchema = createSchema
  .omit({ username: true, password: true })
  .partial()
  .extend({
    email: z.string().email().nullable().optional(),
    phone: z.string().max(20).nullable().optional(),
    deptId: z.number().int().positive().nullable().optional(),
    status: z.enum(['active', 'disabled']).optional(),
  });
type AuthRequest = { user: { id: number } };

@Controller('system/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get()
  @RequirePermissions('system:user:list')
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
  create(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.users.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id')
  @RequirePermissions('system:user:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.users.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id')
  @RequirePermissions('system:user:delete')
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: AuthRequest) {
    return this.users.remove(id, request.user.id);
  }
}
