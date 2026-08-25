import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service.js';
import { menus, roleMenus, roles } from '../../../database/schema/index.js';

export type CreateRoleInput = { name: string; key: string; sort?: number | undefined; dataScope?: 'all' | 'custom' | 'dept' | 'dept_and_children' | 'self' | undefined; menuIds?: number[] | undefined };

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
}
