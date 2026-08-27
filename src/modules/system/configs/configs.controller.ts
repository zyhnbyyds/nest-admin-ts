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
import { registerComponent } from '../../../common/swagger/zod-schema.helper.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { ConfigsService } from './configs.service.js';

const createSchema = z.object({
  name: z.string().min(1).max(100).openapi({ example: '系统名称', description: '参数名称' }),
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9._:-]+$/)
    .openapi({ example: 'sys.name', description: '参数键名' }),
  value: z.string().min(1).max(500).openapi({ example: 'Nest Admin', description: '参数值' }),
  builtin: z.boolean().optional().openapi({ example: true, description: '是否内置' }),
  remark: z.string().max(500).optional().openapi({ example: '系统参数', description: '备注' }),
});
const updateSchema = createSchema
  .partial()
  .extend({ remark: z.string().max(500).nullable().optional().openapi({ example: '系统参数', description: '备注' }) });

registerComponent('CreateConfigRequest', createSchema);
registerComponent('UpdateConfigRequest', updateSchema);

type AuthRequest = { user: { id: number } };

@ApiTags('参数管理')
@Controller('system/configs')
export class ConfigsController {
  constructor(private readonly configs: ConfigsService) {}
  @Get()
  @RequirePermissions('system:config:list')
  @ApiOperation({ summary: '获取参数列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  list(
    @Query('page') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
  ) {
    const page = Math.max(Number(rawPage) || 1, 1);
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100);
    return this.configs.list(page, pageSize);
  }
  @Get('key/:key')
  @RequirePermissions('system:config:list')
  @ApiOperation({ summary: '按键查询参数' })
  @ApiParam({ name: 'key', description: '参数键名' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  byKey(@Param('key') key: string) {
    return this.configs.byKey(key);
  }
  @Get(':id')
  @RequirePermissions('system:config:list')
  @ApiOperation({ summary: '获取参数详情' })
  @ApiParam({ name: 'id', description: '参数ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.configs.findOne(id);
  }
  @Post()
  @RequirePermissions('system:config:create')
  @ApiOperation({ summary: '新增参数' })
  @ApiBody({ schema: { $ref: '#/components/schemas/CreateConfigRequest' } })
  @ApiResponse({ status: 201, description: '成功' })
  @ApiBearerAuth('access-token')
  create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.configs.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id')
  @RequirePermissions('system:config:update')
  @ApiOperation({ summary: '修改参数' })
  @ApiParam({ name: 'id', description: '参数ID' })
  @ApiBody({ schema: { $ref: '#/components/schemas/UpdateConfigRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.configs.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id')
  @RequirePermissions('system:config:delete')
  @ApiOperation({ summary: '删除参数' })
  @ApiParam({ name: 'id', description: '参数ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.configs.remove(id, request.user.id);
  }
}
