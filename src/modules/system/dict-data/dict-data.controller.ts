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
import { DictDataService } from './dict-data.service.js';

const createSchema = z.object({
  type: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  sort: z.number().int().min(0).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  cssClass: z.string().max(100).optional(),
  listClass: z.string().max(100).optional(),
});
const updateSchema = createSchema.partial().extend({
  cssClass: z.string().max(100).nullable().optional(),
  listClass: z.string().max(100).nullable().optional(),
});
type AuthRequest = { user: { id: number } };

@Controller('system/dict-data')
export class DictDataController {
  constructor(private readonly dictData: DictDataService) {}
  @Get()
  @RequirePermissions('system:dict:list')
  list(
    @Query('page') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
    @Query('type') type?: string,
  ) {
    const page = Math.max(Number(rawPage) || 1, 1);
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100);
    return this.dictData.list(page, pageSize, type);
  }
  @Get('type/:type') @RequirePermissions('system:dict:list') byType(
    @Param('type') type: string,
  ) {
    return this.dictData.byType(type);
  }
  @Get(':id') @RequirePermissions('system:dict:list') findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dictData.findOne(id);
  }
  @Post() @RequirePermissions('system:dict:create') create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.dictData.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id') @RequirePermissions('system:dict:update') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.dictData.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id') @RequirePermissions('system:dict:delete') remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.dictData.remove(id, request.user.id);
  }
}
