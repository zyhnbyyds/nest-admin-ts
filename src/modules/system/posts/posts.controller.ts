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
import { PostsService } from './posts.service.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const createSchema = z.object({
  name: z.string().min(1).max(50),
  key: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9:_-]+$/),
  sort: z.number().int().min(0).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().max(500).optional(),
});
const updateSchema = createSchema
  .partial()
  .extend({ remark: z.string().max(500).nullable().optional() });
type AuthRequest = { user: { id: number } };

@ApiTags('岗位管理')
@ApiBearerAuth('access-token')
@Controller('system/posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}
  @Get()
  @RequirePermissions('system:post:list')
  @ApiOperation({ summary: '获取岗位列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数', example: 20 })
  @ApiResponse({ status: 200, description: '成功' })
  list(
    @Query('page') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
  ) {
    const page = Math.max(Number(rawPage) || 1, 1);
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100);
    return this.posts.list(page, pageSize);
  }
  @Get(':id')
  @RequirePermissions('system:post:list')
  @ApiOperation({ summary: '获取岗位详情' })
  @ApiParam({ name: 'id', description: '岗位ID' })
  @ApiResponse({ status: 200, description: '成功' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.posts.findOne(id);
  }
  @Post()
  @RequirePermissions('system:post:create')
  @ApiOperation({ summary: '新增岗位' })
  @ApiBody({
    description: '岗位创建参数',
    schema: {
      type: 'object',
      required: ['name', 'key'],
      properties: {
        name: { type: 'string', description: '岗位名称', example: '高级工程师' },
        key: { type: 'string', description: '岗位标识', example: 'senior_engineer' },
        sort: { type: 'integer', description: '排序', example: 0 },
        status: { type: 'string', description: '状态', enum: ['active', 'disabled'], example: 'active' },
        remark: { type: 'string', description: '备注', example: '负责核心业务开发' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '成功' })
  create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.posts.create(createSchema.parse(body), request.user.id);
  }
  @Patch(':id')
  @RequirePermissions('system:post:update')
  @ApiOperation({ summary: '修改岗位' })
  @ApiParam({ name: 'id', description: '岗位ID' })
  @ApiBody({
    description: '岗位更新参数',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '岗位名称', example: '高级工程师' },
        key: { type: 'string', description: '岗位标识', example: 'senior_engineer' },
        sort: { type: 'integer', description: '排序', example: 0 },
        status: { type: 'string', description: '状态', enum: ['active', 'disabled'], example: 'active' },
        remark: { type: 'string', description: '备注', nullable: true, example: '负责核心业务开发' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '成功' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.posts.update(id, updateSchema.parse(body), request.user.id);
  }
  @Delete(':id')
  @RequirePermissions('system:post:delete')
  @ApiOperation({ summary: '删除岗位' })
  @ApiParam({ name: 'id', description: '岗位ID' })
  @ApiResponse({ status: 200, description: '成功' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.posts.remove(id, request.user.id);
  }
}
