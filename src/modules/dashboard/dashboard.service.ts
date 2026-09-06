import { Injectable } from '@nestjs/common';
import { and, count, gte, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  departments,
  menus,
  posts,
  roles,
  users,
} from '../../database/schema/index';

/** 东八区（Asia/Shanghai）当前日期的 00:00 对应的 UTC Date，用于“今日新增”等日界统计 */
function startOfTodayEast8(): Date {
  const offsetMs = 8 * 60 * 60 * 1000;
  const shifted = Date.now() + offsetMs;
  const midnightMs = Math.floor(shifted / 86_400_000) * 86_400_000;
  return new Date(midnightMs - offsetMs);
}

/** 统计基数：除指定表外的通用过滤条件（软删除、状态枚举值） */
type StatusCount = { total: number; active: number; disabled: number };

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  /** 按状态统计某启用/禁用表中的记录数 */
  private async countByStatus(table: 'depts' | 'roles' | 'posts') {
    const target =
      table === 'depts' ? departments : table === 'roles' ? roles : posts;
    const rows = await this.database.db
      .select({
        status: target.status,
        count: count(),
      })
      .from(target)
      .where(isNull(target.deletedAt))
      .groupBy(target.status);
    const result: StatusCount = { total: 0, active: 0, disabled: 0 };
    for (const row of rows) {
      result.total += Number(row.count);
      if (row.status === 'active') result.active = Number(row.count);
      if (row.status === 'disabled') result.disabled = Number(row.count);
    }
    return result;
  }

  /** 用户统计：总数/启用/禁用/今日新增 */
  async users() {
    const today = startOfTodayEast8();
    const rows = await this.database.db
      .select({ status: users.status, count: count() })
      .from(users)
      .where(isNull(users.deletedAt))
      .groupBy(users.status);
    const [todayRow] = await this.database.db
      .select({ count: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, today)));
    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
    const active = rows.find((row) => row.status === 'active')?.count ?? 0;
    const disabled = rows.find((row) => row.status === 'disabled')?.count ?? 0;
    return {
      total,
      active: Number(active),
      disabled: Number(disabled),
      todayNew: Number(todayRow?.count ?? 0),
    };
  }

  /** 部门统计 */
  async depts() {
    return this.countByStatus('depts');
  }

  /** 角色统计 */
  async roles() {
    return this.countByStatus('roles');
  }

  /** 菜单统计：总数与目录/菜单/按钮三类 */
  async menus() {
    const rows = await this.database.db
      .select({ type: menus.type, count: count() })
      .from(menus)
      .where(isNull(menus.deletedAt))
      .groupBy(menus.type);
    let total = 0;
    let directory = 0;
    let menu = 0;
    let button = 0;
    for (const row of rows) {
      const value = Number(row.count);
      total += value;
      if (row.type === 'M') directory = value;
      if (row.type === 'C') menu = value;
      if (row.type === 'F') button = value;
    }
    return { total, directory, menu, button };
  }

  /** 岗位统计 */
  async posts() {
    return this.countByStatus('posts');
  }
}
