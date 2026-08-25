import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service.js';
import { operationLogs } from '../../../database/schema/index.js';

@Injectable()
export class OperationLogsService {
  constructor(private readonly database: DatabaseService) {}

  async list(page: number, pageSize: number, status?: string, userId?: number) {
    const conditions = [status === 'success' || status === 'failure' ? eq(operationLogs.status, status) : undefined, userId !== undefined ? eq(operationLogs.userId, userId) : undefined].filter((item): item is Exclude<typeof item, undefined> => item !== undefined);
    const items = await this.database.db.select().from(operationLogs).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(operationLogs.id)).limit(pageSize).offset((page - 1) * pageSize);
    return { items, page, pageSize };
  }

  async findOne(id: number) {
    const [item] = await this.database.db.select().from(operationLogs).where(eq(operationLogs.id, id)).limit(1);
    if (!item) throw new NotFoundException('Operation log not found');
    return item;
  }

  async remove(id: number): Promise<void> {
    const result = await this.database.db.delete(operationLogs).where(eq(operationLogs.id, id));
    if (!result[0].affectedRows) throw new NotFoundException('Operation log not found');
  }

  async clear(): Promise<void> {
    await this.database.db.delete(operationLogs);
  }
}
