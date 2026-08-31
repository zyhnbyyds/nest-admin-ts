import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { roles, userRoles, users } from '../../../database/schema/index';

export type CreateUserInput = {
  username: string;
  displayName: string;
  password: string;
  email?: string | undefined;
  phone?: string | undefined;
  deptId?: number | undefined;
  roleIds?: number[] | undefined;
};
export type UpdateUserInput = {
  displayName?: string | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  deptId?: number | null | undefined;
  status?: 'active' | 'disabled' | undefined;
  password?: string | undefined;
  roleIds?: number[] | undefined;
};

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}
  async list(page: number, pageSize: number) {
    const items = await this.database.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        phone: users.phone,
        status: users.status,
        deptId: users.deptId,
        createdAt: users.createdAt,
        loginAt: users.loginAt,
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const roleMap = await this.fetchRoleMap(items.map((item) => item.id));
    return {
      items: items.map((item) => ({
        ...item,
        roleIds: roleMap.get(item.id)?.map((r) => r.id) ?? [],
        roleNames: roleMap.get(item.id)?.map((r) => r.name) ?? [],
      })),
      page,
      pageSize,
    };
  }
  async create(input: CreateUserInput, actorId: number) {
    const [existing] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, input.username))
      .limit(1);
    if (existing) throw new ConflictException('用户名已存在');
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });
    const { password: _password, roleIds = [], ...fields } = input;
    const result = await this.database.db.insert(users).values({
      ...withoutUndefined(fields),
      passwordHash,
      createdBy: actorId,
      updatedBy: actorId,
    });
    const userId = Number(result[0].insertId);
    if (roleIds.length) await this.assignRoles(userId, roleIds);
    return { id: userId };
  }
  async update(id: number, input: UpdateUserInput, actorId: number) {
    const { password, roleIds, ...rest } = input;
    const patch: Record<string, unknown> = { ...withoutUndefined(rest) };
    if (password) {
      patch.passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
      });
      patch.passwordChangedAt = new Date();
    }
    if (roleIds) await this.replaceRoles(id, roleIds);
    const result = await this.database.db
      .update(users)
      .set({ ...patch, updatedBy: actorId })
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
    if (!result[0].affectedRows) throw new NotFoundException('用户不存在');
    return { id, success: true };
  }
  async remove(id: number, actorId: number) {
    const result = await this.database.db
      .update(users)
      .set({ deletedAt: new Date(), updatedBy: actorId })
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
    if (!result[0].affectedRows) throw new NotFoundException('用户不存在');
  }
  async assignRole(userId: number, roleId: number) {
    await this.assignRoles(userId, [roleId]);
  }

  /** 查询一批用户的所有角色（id + name） */
  private async fetchRoleMap(
    userIds: number[],
  ): Promise<Map<number, { id: number; name: string }[]>> {
    if (!userIds.length) return new Map();
    const rows = await this.database.db
      .select({ userId: userRoles.userId, id: roles.id, name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(inArray(userRoles.userId, userIds), isNull(roles.deletedAt)));
    const map = new Map<number, { id: number; name: string }[]>();
    for (const row of rows) {
      const list = map.get(row.userId) ?? [];
      list.push({ id: row.id, name: row.name });
      map.set(row.userId, list);
    }
    return map;
  }

  /** 为单个用户分配多个角色（已存在的跳过，校验角色存在） */
  private async assignRoles(userId: number, roleIds: number[]): Promise<void> {
    if (!roleIds.length) return;
    const existing = await this.database.db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    const existingSet = new Set(existing.map((r) => r.roleId));
    const toAdd = [...new Set(roleIds)].filter((id) => !existingSet.has(id));
    if (!toAdd.length) return;
    const validRoles = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(inArray(roles.id, toAdd), isNull(roles.deletedAt)));
    const validIds = new Set(validRoles.map((r) => r.id));
    const values = toAdd
      .filter((id) => validIds.has(id))
      .map((roleId) => ({ userId, roleId }));
    if (values.length) {
      await this.database.db.insert(userRoles).values(values);
    }
  }

  /** 全量替换用户角色（先删后增） */
  private async replaceRoles(userId: number, roleIds: number[]): Promise<void> {
    await this.database.db
      .delete(userRoles)
      .where(eq(userRoles.userId, userId));
    if (roleIds.length) await this.assignRoles(userId, roleIds);
  }
}
function withoutUndefined<T extends object>(
  value: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as { [K in keyof T]: Exclude<T[K], undefined> };
}
