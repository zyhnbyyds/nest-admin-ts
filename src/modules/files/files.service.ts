import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { and, desc, eq } from 'drizzle-orm';
import { AppConfigService } from '../../config/app-config.service';
import { DatabaseService } from '../../database/database.service';
import { files } from '../../database/schema/index';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.zip',
  '.mp3',
  '.mp4',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type FileRow = typeof files.$inferSelect;
export type FileDto = {
  id: number;
  name: string;
  originalName: string;
  url: string;
  mime: string;
  ext: string;
  size: number;
  createdAt: Date;
};

@Injectable()
export class FilesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: AppConfigService,
  ) {}

  async list(page: number, pageSize: number) {
    const rows = await this.database.db
      .select()
      .from(files)
      .orderBy(desc(files.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { items: rows.map((row) => this.toDto(row)), page, pageSize };
  }

  async detail(id: number): Promise<FileDto> {
    return this.toDto(await this.findOne(id));
  }

  async save(
    part: MultipartFile,
    actorId: number | undefined,
  ): Promise<FileDto> {
    const originalName = sanitizeFilename(decodeFilename(part.filename));
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext))
      throw new BadRequestException('不允许的文件类型');
    const buffer = await part.toBuffer();
    if (buffer.length === 0) throw new BadRequestException('文件内容为空');
    if (buffer.length > MAX_FILE_SIZE)
      throw new PayloadTooLargeException('文件超过允许的最大大小');
    const name = `${randomUUID()}${ext}`;
    const dir = path.resolve(this.config.uploadDir);
    await mkdir(dir, { recursive: true });
    const absolutePath = path.join(dir, name);
    await writeFile(absolutePath, buffer);
    const result = await this.database.db.insert(files).values({
      name,
      originalName,
      path: absolutePath,
      mime: part.mimetype || 'application/octet-stream',
      ext,
      size: buffer.length,
      createdBy: actorId ?? null,
    });
    const id = Number(result[0].insertId);
    return this.toDto({
      id,
      name,
      originalName,
      path: absolutePath,
      mime: part.mimetype || 'application/octet-stream',
      ext,
      size: buffer.length,
      createdBy: actorId ?? null,
      createdAt: new Date(),
    });
  }

  async open(id: number): Promise<{
    stream: ReturnType<typeof createReadStream>;
    mime: string;
    originalName: string;
  }> {
    const file = await this.findOne(id);
    return {
      stream: createReadStream(file.path),
      mime: file.mime,
      originalName: file.originalName,
    };
  }

  async remove(id: number): Promise<void> {
    const file = await this.findOne(id);
    await this.database.db.delete(files).where(eq(files.id, id));
    try {
      await unlink(file.path);
    } catch {
      /* the file may already be gone */
    }
  }

  private async findOne(id: number): Promise<FileRow> {
    const [file] = await this.database.db
      .select()
      .from(files)
      .where(and(eq(files.id, id)))
      .limit(1);
    if (!file) throw new NotFoundException('文件不存在');
    return file;
  }

  private toDto(row: FileRow): FileDto {
    return {
      id: row.id,
      name: row.name,
      originalName: row.originalName,
      url: `/${this.config.apiPrefix}/files/${row.id}/download`,
      mime: row.mime,
      ext: row.ext,
      size: row.size,
      createdAt: row.createdAt,
    };
  }
}

/**
 * 纠正 multipart 文件名编码。
 * busboy 将 Content-Disposition 的 filename 按 latin1 解码，浏览器发送的中文名
 * （原始 UTF-8 字节）会被解成乱码；这里按 latin1 回编码再按 UTF-8 解码还原。
 * 若还原结果含 U+FFFD 替换符，说明原本就是合法 UTF-8 字符串，保持原样。
 */
function decodeFilename(filename: string): string {
  const corrected = Buffer.from(filename, 'latin1').toString('utf8');
  return corrected.includes('\uFFFD') ? filename : corrected;
}

function sanitizeFilename(name: string): string {
  const base = path
    .basename(name)
    // 保留任意语言的字母/数字、下划线、连字符、点与空格，其余字符替换为下划线
    .replace(/[^\p{L}\p{N}._\- ]/gu, '_')
    .slice(0, 255);
  return base || 'file';
}
