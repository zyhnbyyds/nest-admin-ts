import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { GeneratorService } from './generator.service.js';

const previewSchema = z.object({ table: z.string().min(1).max(64) });
const generateSchema = z.object({ table: z.string().min(1).max(64), directory: z.string().min(1).max(100) });

@Controller('generator')
export class GeneratorController {
  constructor(private readonly generator: GeneratorService) {}
  @Get('tables') @RequirePermissions('system:generator:list') listTables() { return this.generator.listTables(); }
  @Get('tables/:table/columns') @RequirePermissions('system:generator:list') getColumns(@Param('table') table: string) { return this.generator.getColumns(table); }
  @Post('preview') @RequirePermissions('system:generator:list') preview(@Body() body: unknown) { return this.generator.preview(previewSchema.parse(body).table); }
  @Post('generate') @RequirePermissions('system:generator:generate') generate(@Body() body: unknown) { const input = generateSchema.parse(body); return this.generator.generate(input.table, input.directory); }
}
