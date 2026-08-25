import { BadRequestException, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, Res } from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { FilesService } from './files.service.js';

type UploadRequest = { file: () => Promise<MultipartFile | undefined>; user?: { id: number } };
type DownloadReply = { header(name: string, value: string): unknown; send(payload: unknown): unknown };

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}
  @Post('upload') @RequirePermissions('system:file:upload')
  async upload(@Req() request: UploadRequest) { const file = await request.file(); if (!file) throw new BadRequestException('No file uploaded'); return this.files.save(file, request.user?.id); }
  @Get() @RequirePermissions('system:file:list')
  list(@Query('page') rawPage?: string, @Query('pageSize') rawPageSize?: string) { const page = Math.max(Number(rawPage) || 1, 1); const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100); return this.files.list(page, pageSize); }
  @Get(':id/download') @RequirePermissions('system:file:list')
  async download(@Param('id', ParseIntPipe) id: number, @Res() reply: DownloadReply) { const { stream, mime, originalName } = await this.files.open(id); reply.header('Content-Type', mime); reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`); reply.send(stream); }
  @Get(':id') @RequirePermissions('system:file:list') detail(@Param('id', ParseIntPipe) id: number) { return this.files.detail(id); }
  @Delete(':id') @RequirePermissions('system:file:delete') remove(@Param('id', ParseIntPipe) id: number) { return this.files.remove(id); }
}
