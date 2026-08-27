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
  name: z.string().min(1).max(50).openapi({ example: '前端工程师', description: '岗位名称' }),
  key: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9:_-]+$/)
    .openapi({ example: 'fe_engineer', description: '岗位标识' }),
  sort: z.number().int().min(0).optional().openapi({ example: 1, description: '排序' }),
  status: z.enum(['active', 'disabled']).optional().openapi({ example: 'active', description: '状态' }),
  remark: z.string().max(500).optional().openapi({ example: '负责前端开发', description: '备注' }),
});
const updateSchema = createSchema
  .partial()
  .extend({ remark: z.string().max(500).nullable().optional().openapi({ example: '负责前端开发', description: '备注' }) });

registerComponent('CreatePostRequest', createSchema);
registerComponent('UpdatePostRequest', updateSchema);

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
  @ApiBody({ schema: { $ref: '#/components/schemas/CreatePostRequest' } })
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
  @ApiBody({ schema: { $ref: '#/components/schemas/UpdatePostRequest' } })
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
