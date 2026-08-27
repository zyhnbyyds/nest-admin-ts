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
import { DictTypesService } from './dict-types.service.js';

const createSchema = z.object({
  name: z.string().min(1).max(100).openapi({ example: '用户性别', description: '字典类型名称' }),
  type: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9:_-]+$/)
    .openapi({ example: 'user_gender', description: '字典类型标识' }),
  status: z.enum(['active', 'disabled']).optional().openapi({ example: 'active', description: '状态' }),
  remark: z.string().max(500).optional().openapi({ example: '用户性别字典', description: '备注' }),
});
const updateSchema = createSchema
  .partial()
  .extend({ remark: z.string().max(500).nullable().optional().openapi({ example: '用户性别字典', description: '备注' }) });

registerComponent('CreateDictTypeRequest', createSchema);
registerComponent('UpdateDictTypeRequest', updateSchema);

type AuthRequest = { user: { id: number } };

@ApiTags('字典类型管理')
@Controller('system/dict-types')
export class DictTypesController {
  constructor(private readonly dictTypes: DictTypesService) {}
  @Get()
  @RequirePermissions('system:dict:list')
  @ApiOperation({ summary: '获取字典类型列表' })
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
    return this.dictTypes.list(page, pageSize);
  }
  @Get(':id')
  @RequirePermissions('system:dict:list')
  @ApiOperation({ summary: '获取字典类型详情' })
  @ApiParam({ name: 'id', description: '字典类型ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dictTypes.findOne(id);
  }
  @Post()
  @RequirePermissions('system:dict:create')
  @ApiOperation({ summary: '新增字典类型' })
  @ApiBody({ schema: { $ref: '#/components/schemas/CreateDictTypeRequest' } })
  @ApiResponse({ status: 201, description: '成功' })
  @ApiBearerAuth('access-token')
  create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.dictTypes.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id')
  @RequirePermissions('system:dict:update')
  @ApiOperation({ summary: '修改字典类型' })
  @ApiParam({ name: 'id', description: '字典类型ID' })
  @ApiBody({ schema: { $ref: '#/components/schemas/UpdateDictTypeRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.dictTypes.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id')
  @RequirePermissions('system:dict:delete')
  @ApiOperation({ summary: '删除字典类型' })
  @ApiParam({ name: 'id', description: '字典类型ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.dictTypes.remove(id, request.user.id);
  }
}
