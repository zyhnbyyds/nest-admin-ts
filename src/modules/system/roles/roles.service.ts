import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, ne } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service.js';
import { menus, roleMenus, roles, userRoles } from '../../../database/schema/index.js';

export type CreateRoleInput = { name: string; key: string; sort?: number | undefined; dataScope?: 'all' | 'custom' | 'dept' | 'dept_and_children' | 'self' | undefined; menuIds?: number[] | undefined };
export type UpdateRoleInput = { name?: string | undefined; key?: string | undefined; sort?: number | undefined; dataScope?: 'all' | 'custom' | 'dept' | 'dept_and_children' | 'self' | undefined; status?: 'active' | 'disabled' | undefined; remark?: string | null | undefined };

@Injectable()
export class RolesService {
  constructor(private readonly database: DatabaseService) {}
  async list() { return this.database.db.select().from(roles).where(isNull(roles.deletedAt)).orderBy(asc(roles.sort), asc(roles.id)); }
  async create(input: CreateRoleInput, actorId: number) {
    const [exists] = await this.database.db.select({ id: roles.id }).from(roles).where(eq(roles.key, input.key)).limit(1);
    if (exists) throw new ConflictException('Role key already exists');
    const { menuIds = [], ...role } = input;
    const result = await this.database.db.insert(roles).values({ ...role, createdBy: actorId, updatedBy: actorId });
    const roleId = Number(result[0].insertId);
    if (menuIds.length) await this.setMenus(roleId, menuIds);
    return { id: roleId };
  }
  async setMenus(roleId: number, menuIds: number[]) {
    const [role] = await this.database.db.select({ id: roles.id }).from(roles).where(and(eq(roles.id, roleId), isNull(roles.deletedAt))).limit(1);
    if (!role) throw new NotFoundException('Role not found');
    const uniqueIds = [...new Set(menuIds)];
    if (uniqueIds.length) {
      const found = await this.database.db.select({ id: menus.id }).from(menus).where(inArray(menus.id, uniqueIds));
      if (found.length !== uniqueIds.length) throw new NotFoundException('One or more menus were not found');
    }
    await this.database.db.transaction(async (tx) => {
      await tx.delete(roleMenus).where(eq(roleMenus.roleId, roleId));
      if (uniqueIds.length) await tx.insert(roleMenus).values(uniqueIds.map((menuId) => ({ roleId, menuId })));
    });
  }
  async getMenuIds(roleId: number): Promise<number[]> {
    const rows = await this.database.db.select({ menuId: roleMenus.menuId }).from(roleMenus).where(eq(roleMenus.roleId, roleId));
    return rows.map((row) => row.menuId);
  }
  async update(id: number, input: UpdateRoleInput, actorId: number): Promise<void> {
    const [role] = await this.database.db.select({ id: roles.id }).from(roles).where(and(eq(roles.id, id), isNull(roles.deletedAt))).limit(1);
    if (!role) throw new NotFoundException('Role not found');
    const patch = withoutUndefined(input);
    if (patch.key) {
      const [duplicate] = await this.database.db.select({ id: roles.id }).from(roles).where(and(eq(roles.key, patch.key), isNull(roles.deletedAt), ne(roles.id, id))).limit(1);
      if (duplicate) throw new ConflictException('Role key already exists');
    }
    await this.database.db.update(roles).set({ ...patch, updatedBy: actorId }).where(and(eq(roles.id, id), isNull(roles.deletedAt)));
  }
  async remove(id: number, actorId: number): Promise<void> {
    const [role] = await this.database.db.select({ id: roles.id }).from(roles).where(and(eq(roles.id, id), isNull(roles.deletedAt))).limit(1);
    if (!role) throw new NotFoundException('Role not found');
    await this.database.db.transaction(async (tx) => {
      await tx.delete(roleMenus).where(eq(roleMenus.roleId, id));
      await tx.delete(userRoles).where(eq(userRoles.roleId, id));
      await tx.update(roles).set({ deletedAt: new Date(), updatedBy: actorId }).where(and(eq(roles.id, id), isNull(roles.deletedAt)));
    });
  }
}
function withoutUndefined<T extends object>(value: T): { [K in keyof T]: Exclude<T[K], undefined> } { return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> }; }
