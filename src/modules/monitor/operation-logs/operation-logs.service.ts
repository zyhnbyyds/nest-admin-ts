import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, like, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { operationLogs, users } from '../../../database/schema/index';
import {
  resolveDataScope,
  type RequestActor,
} from '../../../common/data-scope/data-scope';

/** 操作日志列表/详情的完整字段（联查操作人用户名） */
const logColumns = {
  id: operationLogs.id,
  userId: operationLogs.userId,
  username: users.username,
  title: operationLogs.title,
  businessType: operationLogs.businessType,
  method: operationLogs.method,
  requestMethod: operationLogs.requestMethod,
  url: operationLogs.url,
  ip: operationLogs.ip,
  requestBody: operationLogs.requestBody,
  responseBody: operationLogs.responseBody,
  status: operationLogs.status,
  errorMessage: operationLogs.errorMessage,
  durationMs: operationLogs.durationMs,
  createdAt: operationLogs.createdAt,
};

@Injectable()
export class OperationLogsService {
  constructor(private readonly database: DatabaseService) {}

  async list(
    page: number,
    pageSize: number,
    status?: string,
    userId?: number,
    username?: string,
    actor?: RequestActor,
  ) {
    const conditions: unknown[] = [
      status === 'success' || status === 'failure'
        ? eq(operationLogs.status, status)
        : undefined,
      userId !== undefined ? eq(operationLogs.userId, userId) : undefined,
      username ? like(users.username, `%${username}%`) : undefined,
    ];
    if (actor) {
      const scope = await resolveDataScope(this.database.db, actor);
      if (scope.kind === 'self') {
        conditions.push(eq(operationLogs.userId, actor.id));
      } else if (scope.kind === 'deptIds') {
        conditions.push(
          scope.ids.length
            ? inArray(
                operationLogs.userId,
                this.database.db
                  .select({ id: users.id })
                  .from(users)
                  .where(
                    and(
                      inArray(users.deptId, scope.ids),
                      isNull(users.deletedAt),
                    ),
                  ),
              )
            : sql`1 = 0`,
        );
      }
    }
    const items = await this.database.db
      .select(logColumns)
      .from(operationLogs)
      .leftJoin(users, eq(operationLogs.userId, users.id))
      .where(
        conditions.length ? and(...(conditions as never[])) : undefined,
      )
      .orderBy(desc(operationLogs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { items, page, pageSize };
  }

  async findOne(id: number) {
    const [item] = await this.database.db
      .select(logColumns)
      .from(operationLogs)
      .leftJoin(users, eq(operationLogs.userId, users.id))
      .where(eq(operationLogs.id, id))
      .limit(1);
    if (!item) throw new NotFoundException('操作日志不存在');
    return item;
  }

  async remove(id: number): Promise<void> {
    const result = await this.database.db
      .delete(operationLogs)
      .where(eq(operationLogs.id, id));
    if (!result[0].affectedRows)
      throw new NotFoundException('操作日志不存在');
  }

  async clear(): Promise<void> {
    await this.database.db.delete(operationLogs);
  }
}
