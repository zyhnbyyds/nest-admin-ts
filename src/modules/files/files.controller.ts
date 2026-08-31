import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { Public } from '../../common/auth/public.decorator';
import { FilesService } from './files.service';

type UploadRequest = {
  file: () => Promise<MultipartFile | undefined>;
  user?: { id: number };
};
type DownloadReply = {
  header(name: string, value: string): unknown;
  send(payload: unknown): unknown;
};

@ApiTags('文件管理')
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}
  // 上传仅需登录（用户自定义头像需要普通用户也能上传，不限定 system:file:upload）
  @Post('upload')
  @ApiOperation({ summary: '上传文件' })
  @ApiResponse({ status: 201, description: '成功' })
  @ApiBearerAuth('access-token')
  async upload(@Req() request: UploadRequest) {
    const file = await request.file();
    if (!file) throw new BadRequestException('未选择文件');
    return this.files.save(file, request.user?.id);
  }
  @Get()
  @RequirePermissions('system:file:list')
  @ApiOperation({ summary: '获取文件列表' })
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
    return this.files.list(page, pageSize);
  }
  @Get(':id/download')
  // 公开下载：头像 <img> 无法携带 Authorization，且文件名是随机 UUID 不可枚举
  // （对齐若依静态上传资源公开访问的设计）
  @Public()
  @ApiOperation({ summary: '下载文件' })
  @ApiParam({ name: 'id', description: '文件ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res() reply: DownloadReply,
  ) {
    const { stream, mime, originalName } = await this.files.open(id);
    reply.header('Content-Type', mime);
    reply.header(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`,
    );
    reply.send(stream);
  }
  @Get(':id')
  @RequirePermissions('system:file:list')
  @ApiOperation({ summary: '获取文件详情' })
  @ApiParam({ name: 'id', description: '文件ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.files.detail(id);
  }
  @Delete(':id')
  @RequirePermissions('system:file:delete')
  @ApiOperation({ summary: '删除文件' })
  @ApiParam({ name: 'id', description: '文件ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.files.remove(id);
  }
}
