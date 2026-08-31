import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, like, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { loginLogs, users } from '../../../database/schema/index';
import {
  resolveDataScope,
  type RequestActor,
} from '../../../common/data-scope/data-scope';

@Injectable()
export class LoginLogsService {
  constructor(private readonly database: DatabaseService) {}

  async list(
    page: number,
    pageSize: number,
    username?: string,
    status?: string,
    actor?: RequestActor,
  ) {
    const conditions: unknown[] = [
      username ? like(loginLogs.username, `%${username}%`) : undefined,
      status === 'success' || status === 'failure'
        ? eq(loginLogs.status, status)
        : undefined,
    ];
    if (actor) {
      const scope = await resolveDataScope(this.database.db, actor);
      if (scope.kind === 'self') {
        conditions.push(eq(loginLogs.userId, actor.id));
      } else if (scope.kind === 'deptIds') {
        conditions.push(
          scope.ids.length
            ? inArray(
                loginLogs.userId,
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
      .select()
      .from(loginLogs)
      .where(conditions.length ? and(...(conditions as never[])) : undefined)
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
    if (!item) throw new NotFoundException('登录日志不存在');
    return item;
  }

  async remove(id: number): Promise<void> {
    const result = await this.database.db
      .delete(loginLogs)
      .where(eq(loginLogs.id, id));
    if (!result[0].affectedRows)
      throw new NotFoundException('登录日志不存在');
  }

  async clear(): Promise<void> {
    await this.database.db.delete(loginLogs);
  }
}
