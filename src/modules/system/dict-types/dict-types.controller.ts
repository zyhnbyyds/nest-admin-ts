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
import { DictTypesService } from './dict-types.service.js';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9:_-]+$/),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().max(500).optional(),
});
const updateSchema = createSchema
  .partial()
  .extend({ remark: z.string().max(500).nullable().optional() });
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
  @ApiBody({
    description: '字典类型信息',
    schema: {
      type: 'object',
      required: ['name', 'type'],
      properties: {
        name: { type: 'string', description: '字典类型名称', example: '用户状态' },
        type: { type: 'string', description: '字典类型标识', example: 'sys_user_status' },
        status: { type: 'string', description: '状态', enum: ['active', 'disabled'], example: 'active' },
        remark: { type: 'string', description: '备注', example: '用户状态字典' },
      },
    },
  })
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
  @ApiBody({
    description: '字典类型信息',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '字典类型名称', example: '用户状态' },
        type: { type: 'string', description: '字典类型标识', example: 'sys_user_status' },
        status: { type: 'string', description: '状态', enum: ['active', 'disabled'], example: 'active' },
        remark: { type: 'string', description: '备注', nullable: true, example: '用户状态字典' },
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
