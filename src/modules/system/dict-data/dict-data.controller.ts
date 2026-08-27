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

@ApiTags('字典数据管理')
@Controller('system/dict-data')
export class DictDataController {
  constructor(private readonly dictData: DictDataService) {}
  @Get()
  @RequirePermissions('system:dict:list')
  @ApiOperation({ summary: '获取字典数据列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiQuery({ name: 'type', required: false, description: '字典类型标识' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  list(
    @Query('page') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
    @Query('type') type?: string,
  ) {
    const page = Math.max(Number(rawPage) || 1, 1);
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100);
    return this.dictData.list(page, pageSize, type);
  }
  @Get('type/:type')
  @RequirePermissions('system:dict:list')
  @ApiOperation({ summary: '按类型获取字典数据' })
  @ApiParam({ name: 'type', description: '字典类型标识' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  byType(@Param('type') type: string) {
    return this.dictData.byType(type);
  }
  @Get(':id')
  @RequirePermissions('system:dict:list')
  @ApiOperation({ summary: '获取字典数据详情' })
  @ApiParam({ name: 'id', description: '字典数据ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dictData.findOne(id);
  }
  @Post()
  @RequirePermissions('system:dict:create')
  @ApiOperation({ summary: '新增字典数据' })
  @ApiBody({
    description: '字典数据信息',
    schema: {
      type: 'object',
      required: ['type', 'label', 'value'],
      properties: {
        type: { type: 'string', description: '字典类型标识', example: 'sys_user_status' },
        label: { type: 'string', description: '字典标签', example: '正常' },
        value: { type: 'string', description: '字典键值', example: 'active' },
        sort: { type: 'integer', description: '排序', example: 0 },
        status: { type: 'string', description: '状态', enum: ['active', 'disabled'], example: 'active' },
        cssClass: { type: 'string', description: '样式类名', example: '' },
        listClass: { type: 'string', description: '列表样式', example: 'default' },
      },
    },
  })
  @ApiResponse({ status: 201, description: '成功' })
  @ApiBearerAuth('access-token')
  create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.dictData.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id')
  @RequirePermissions('system:dict:update')
  @ApiOperation({ summary: '修改字典数据' })
  @ApiParam({ name: 'id', description: '字典数据ID' })
  @ApiBody({
    description: '字典数据信息',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '字典类型标识', example: 'sys_user_status' },
        label: { type: 'string', description: '字典标签', example: '正常' },
        value: { type: 'string', description: '字典键值', example: 'active' },
        sort: { type: 'integer', description: '排序', example: 0 },
        status: { type: 'string', description: '状态', enum: ['active', 'disabled'], example: 'active' },
        cssClass: { type: 'string', description: '样式类名', nullable: true, example: '' },
        listClass: { type: 'string', description: '列表样式', nullable: true, example: 'default' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.dictData.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id')
  @RequirePermissions('system:dict:delete')
  @ApiOperation({ summary: '删除字典数据' })
  @ApiParam({ name: 'id', description: '字典数据ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.dictData.remove(id, request.user.id);
  }
}
