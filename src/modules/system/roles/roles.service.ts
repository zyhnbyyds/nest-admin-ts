import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, isNull, ne } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import {
  departments,
  menus,
  roleDepts,
  roleMenus,
  roles,
  userRoles,
} from '../../../database/schema/index';

export type CreateRoleInput = {
  name: string;
  key: string;
  sort?: number | undefined;
  dataScope?:
    | 'all'
    | 'custom'
    | 'dept'
    | 'dept_and_children'
    | 'self'
    | undefined;
  menuIds?: number[] | undefined;
  /** 自定义数据范围（dataScope=custom）时可见的部门ID集合 */
  deptIds?: number[] | undefined;
};
export type UpdateRoleInput = {
  name?: string | undefined;
  key?: string | undefined;
  sort?: number | undefined;
  dataScope?:
    | 'all'
    | 'custom'
    | 'dept'
    | 'dept_and_children'
    | 'self'
    | undefined;
  status?: 'active' | 'disabled' | undefined;
  remark?: string | null | undefined;
  deptIds?: number[] | undefined;
};

@Injectable()
export class RolesService {
  constructor(private readonly database: DatabaseService) {}
  async list() {
    const rows = await this.database.db
      .select()
      .from(roles)
      .where(isNull(roles.deletedAt))
      .orderBy(asc(roles.sort), asc(roles.id));
    const deptMap = await this.fetchDeptMap(rows.map((row) => row.id));
    return rows.map((row) => ({
      ...row,
      deptIds: deptMap.get(row.id) ?? [],
    }));
  }
  async create(input: CreateRoleInput, actorId: number) {
    const [exists] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, input.key))
      .limit(1);
    if (exists) throw new ConflictException('角色标识已存在');
    const { deptIds = [], menuIds = [], ...role } = input;
    const result = await this.database.db
      .insert(roles)
      .values({ ...role, createdBy: actorId, updatedBy: actorId });
    const roleId = Number(result[0].insertId);
    if (menuIds.length) await this.setMenus(roleId, menuIds);
    if (deptIds.length) await this.setDepts(roleId, deptIds);
    return { id: roleId };
  }
  async setMenus(roleId: number, menuIds: number[]) {
    const [role] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.id, roleId), isNull(roles.deletedAt)))
      .limit(1);
    if (!role) throw new NotFoundException('角色不存在');
    const uniqueIds = [...new Set(menuIds)];
    if (uniqueIds.length) {
      const found = await this.database.db
        .select({ id: menus.id })
        .from(menus)
        .where(inArray(menus.id, uniqueIds));
      if (found.length !== uniqueIds.length)
        throw new NotFoundException('部分菜单不存在');
    }
    await this.database.db.transaction(async (tx) => {
      await tx.delete(roleMenus).where(eq(roleMenus.roleId, roleId));
      if (uniqueIds.length)
        await tx
          .insert(roleMenus)
          .values(uniqueIds.map((menuId) => ({ roleId, menuId })));
    });
  }
  async getMenuIds(roleId: number): Promise<number[]> {
    const rows = await this.database.db
      .select({ menuId: roleMenus.menuId })
      .from(roleMenus)
      .where(eq(roleMenus.roleId, roleId));
    return rows.map((row) => row.menuId);
  }
  /** 设置角色自定义数据范围的部门集合（dataScope=custom） */
  async setDepts(roleId: number, deptIds: number[]) {
    const [role] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.id, roleId), isNull(roles.deletedAt)))
      .limit(1);
    if (!role) throw new NotFoundException('角色不存在');
    const uniqueIds = [...new Set(deptIds)];
    if (uniqueIds.length) {
      const found = await this.database.db
        .select({ id: departments.id })
        .from(departments)
        .where(inArray(departments.id, uniqueIds));
      if (found.length !== uniqueIds.length)
        throw new NotFoundException('部分部门不存在');
    }
    await this.database.db.transaction(async (tx) => {
      await tx.delete(roleDepts).where(eq(roleDepts.roleId, roleId));
      if (uniqueIds.length)
        await tx
          .insert(roleDepts)
          .values(uniqueIds.map((deptId) => ({ roleId, deptId })));
    });
  }
  /** 一次查询所有角色已配置的 custom 部门，按角色分组 */
  private async fetchDeptMap(
    roleIds: number[],
  ): Promise<Map<number, number[]>> {
    const map = new Map<number, number[]>();
    if (!roleIds.length) return map;
    const rows = await this.database.db
      .select({ roleId: roleDepts.roleId, deptId: roleDepts.deptId })
      .from(roleDepts)
      .where(inArray(roleDepts.roleId, roleIds));
    for (const row of rows) {
      const list = map.get(row.roleId) ?? [];
      list.push(row.deptId);
      map.set(row.roleId, list);
    }
    return map;
  }
  async update(
    id: number,
    input: UpdateRoleInput,
    actorId: number,
  ): Promise<void> {
    const [role] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
      .limit(1);
    if (!role) throw new NotFoundException('角色不存在');
    const { deptIds, ...rest } = input;
    const patch = withoutUndefined(rest);
    if (patch.key) {
      const [duplicate] = await this.database.db
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(
            eq(roles.key, patch.key),
            isNull(roles.deletedAt),
            ne(roles.id, id),
          ),
        )
        .limit(1);
      if (duplicate) throw new ConflictException('角色标识已存在');
    }
    await this.database.db
      .update(roles)
      .set({ ...patch, updatedBy: actorId })
      .where(and(eq(roles.id, id), isNull(roles.deletedAt)));
    // 显式传 deptIds 时整体替换自定义数据范围部门（仅 dataScope=custom 时有意义）
    if (deptIds) await this.setDepts(id, deptIds);
  }
  async remove(id: number, actorId: number): Promise<void> {
    const [role] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
      .limit(1);
    if (!role) throw new NotFoundException('角色不存在');
    await this.database.db.transaction(async (tx) => {
      await tx.delete(roleMenus).where(eq(roleMenus.roleId, id));
      await tx.delete(userRoles).where(eq(userRoles.roleId, id));
      await tx
        .update(roles)
        .set({ deletedAt: new Date(), updatedBy: actorId })
        .where(and(eq(roles.id, id), isNull(roles.deletedAt)));
    });
  }
}
function withoutUndefined<T extends object>(
  value: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as { [K in keyof T]: Exclude<T[K], undefined> };
}
