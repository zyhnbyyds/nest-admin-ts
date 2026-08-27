import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { registerComponent } from '../../common/swagger/zod-schema.helper.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { GeneratorService } from './generator.service.js';

const previewSchema = z.object({
  table: z.string().min(1).max(64).openapi({ example: 'sys_user', description: '表名' }),
});
const generateSchema = z.object({
  table: z.string().min(1).max(64).openapi({ example: 'sys_user', description: '表名' }),
  directory: z.string().min(1).max(100).openapi({ example: 'src/modules/system/users', description: '目录' }),
});

registerComponent('PreviewCodeRequest', previewSchema);
registerComponent('GenerateCodeRequest', generateSchema);

@ApiTags('代码生成')
@Controller('generator')
export class GeneratorController {
  constructor(private readonly generator: GeneratorService) {}
  @Get('tables')
  @RequirePermissions('system:generator:list')
  @ApiOperation({ summary: '获取数据库表列表' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  listTables() {
    return this.generator.listTables();
  }
  @Get('tables/:table/columns')
  @RequirePermissions('system:generator:list')
  @ApiOperation({ summary: '获取表字段信息' })
  @ApiParam({ name: 'table', description: '表名' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  getColumns(@Param('table') table: string) {
    return this.generator.getColumns(table);
  }
  @Post('preview')
  @RequirePermissions('system:generator:list')
  @ApiOperation({ summary: '预览生成代码' })
  @ApiBody({ schema: { $ref: '#/components/schemas/PreviewCodeRequest' } })
  @ApiResponse({ status: 201, description: '成功' })
  @ApiBearerAuth('access-token')
  preview(@Body() body: unknown) {
    return this.generator.preview(previewSchema.parse(body).table);
  }
  @Post('generate')
  @RequirePermissions('system:generator:generate')
  @ApiOperation({ summary: '生成代码文件' })
  @ApiBody({ schema: { $ref: '#/components/schemas/GenerateCodeRequest' } })
  @ApiResponse({ status: 201, description: '成功' })
  @ApiBearerAuth('access-token')
  generate(@Body() body: unknown) {
    const input = generateSchema.parse(body);
    return this.generator.generate(input.table, input.directory);
  }
}
