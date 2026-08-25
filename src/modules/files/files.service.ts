import { BadRequestException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { and, desc, eq } from 'drizzle-orm';
import { AppConfigService } from '../../config/app-config.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { files } from '../../database/schema/index.js';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.json', '.zip', '.mp3', '.mp4']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type FileRow = typeof files.$inferSelect;
export type FileDto = { id: number; name: string; originalName: string; url: string; mime: string; ext: string; size: number; createdAt: Date };

@Injectable()
export class FilesService {
  constructor(private readonly database: DatabaseService, private readonly config: AppConfigService) {}

  async list(page: number, pageSize: number) {
    const rows = await this.database.db.select().from(files).orderBy(desc(files.id)).limit(pageSize).offset((page - 1) * pageSize);
    return { items: rows.map((row) => this.toDto(row)), page, pageSize };
  }

  async detail(id: number): Promise<FileDto> {
    return this.toDto(await this.findOne(id));
  }

  async save(part: MultipartFile, actorId: number | undefined): Promise<FileDto> {
    const originalName = sanitizeFilename(part.filename);
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) throw new BadRequestException('File type is not allowed');
    const buffer = await part.toBuffer();
    if (buffer.length === 0) throw new BadRequestException('File is empty');
    if (buffer.length > MAX_FILE_SIZE) throw new PayloadTooLargeException('File exceeds the maximum allowed size');
    const name = `${randomUUID()}${ext}`;
    const dir = path.resolve(this.config.uploadDir);
    await mkdir(dir, { recursive: true });
    const absolutePath = path.join(dir, name);
    await writeFile(absolutePath, buffer);
    const result = await this.database.db.insert(files).values({ name, originalName, path: absolutePath, mime: part.mimetype || 'application/octet-stream', ext, size: buffer.length, createdBy: actorId ?? null });
    const id = Number(result[0].insertId);
    return this.toDto({ id, name, originalName, path: absolutePath, mime: part.mimetype || 'application/octet-stream', ext, size: buffer.length, createdBy: actorId ?? null, createdAt: new Date() });
  }

  async open(id: number): Promise<{ stream: ReturnType<typeof createReadStream>; mime: string; originalName: string }> {
    const file = await this.findOne(id);
    return { stream: createReadStream(file.path), mime: file.mime, originalName: file.originalName };
  }

  async remove(id: number): Promise<void> {
    const file = await this.findOne(id);
    await this.database.db.delete(files).where(eq(files.id, id));
    try { await unlink(file.path); } catch { /* the file may already be gone */ }
  }

  private async findOne(id: number): Promise<FileRow> {
    const [file] = await this.database.db.select().from(files).where(and(eq(files.id, id))).limit(1);
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  private toDto(row: FileRow): FileDto {
    return { id: row.id, name: row.name, originalName: row.originalName, url: `/${this.config.apiPrefix}/files/${row.id}/download`, mime: row.mime, ext: row.ext, size: row.size, createdAt: row.createdAt };
  }
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ]/g, '_').slice(0, 255);
  return base || 'file';
}
