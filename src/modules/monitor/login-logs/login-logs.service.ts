import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, like } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service.js';
import { loginLogs } from '../../../database/schema/index.js';

@Injectable()
export class LoginLogsService {
  constructor(private readonly database: DatabaseService) {}

  async list(
    page: number,
    pageSize: number,
    username?: string,
    status?: string,
  ) {
    const conditions = [
      username ? like(loginLogs.username, `%${username}%`) : undefined,
      status === 'success' || status === 'failure'
        ? eq(loginLogs.status, status)
        : undefined,
    ].filter(
      (item): item is Exclude<typeof item, undefined> => item !== undefined,
    );
    const items = await this.database.db
      .select()
      .from(loginLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(loginLogs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { items, page, pageSize };
  }

  async findOne(id: number) {
    const [item] = await this.database.db
      .select()
      .from(loginLogs)
      .where(eq(loginLogs.id, id))
      .limit(1);
    if (!item) throw new NotFoundException('Login log not found');
    return item;
  }

  async remove(id: number): Promise<void> {
    const result = await this.database.db
      .delete(loginLogs)
      .where(eq(loginLogs.id, id));
    if (!result[0].affectedRows)
      throw new NotFoundException('Login log not found');
  }

  async clear(): Promise<void> {
    await this.database.db.delete(loginLogs);
  }
}
