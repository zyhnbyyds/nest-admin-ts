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
  @Post('upload')
  @RequirePermissions('system:file:upload')
  @ApiOperation({ summary: '上传文件' })
  @ApiResponse({ status: 201, description: '成功' })
  @ApiBearerAuth('access-token')
  async upload(@Req() request: UploadRequest) {
    const file = await request.file();
    if (!file) throw new BadRequestException('No file uploaded');
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
  @RequirePermissions('system:file:list')
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
