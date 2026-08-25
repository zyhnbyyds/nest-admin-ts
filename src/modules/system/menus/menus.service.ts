import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, ne } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service.js';
import { menus, roleMenus, roles, userRoles } from '../../../database/schema/index.js';

export type CreateMenuInput = {
  parentId?: number | undefined;
  name: string;
  title: string;
  type: 'M' | 'C' | 'F';
  path?: string | undefined;
  component?: string | undefined;
  permission?: string | undefined;
  icon?: string | undefined;
  sort?: number | undefined;
  visible?: boolean | undefined;
  cacheable?: boolean | undefined;
  external?: boolean | undefined;
  status?: 'active' | 'disabled' | undefined;
};

export type UpdateMenuInput = {
  parentId?: number | undefined;
  name?: string | undefined;
  title?: string | undefined;
  type?: 'M' | 'C' | 'F' | undefined;
  path?: string | null | undefined;
  component?: string | null | undefined;
  permission?: string | null | undefined;
  icon?: string | null | undefined;
  sort?: number | undefined;
  visible?: boolean | undefined;
  cacheable?: boolean | undefined;
  external?: boolean | undefined;
  status?: 'active' | 'disabled' | undefined;
};

type MenuRow = typeof menus.$inferSelect;
type TreeNode<T> = T & { children: TreeNode<T>[] };

type RouteMenu = {
  id: number;
  parentId: number;
  name: string;
  title: string;
  type: 'M' | 'C' | 'F';
  path: string | null;
  component: string | null;
  permission: string | null;
  icon: string | null;
  sort: number;
  visible: boolean;
  cacheable: boolean;
  external: boolean;
};

export type RouteNode = {
  id: number;
  parentId: number;
  name: string;
  path: string | null;
  component: string | null;
  permission: string | null;
  type: 'M' | 'C' | 'F';
  meta: { title: string; icon: string | null; sort: number; cacheable: boolean; external: boolean; visible: boolean };
  children: RouteNode[];
};

const routeColumns = {
  id: menus.id,
  parentId: menus.parentId,
  name: menus.name,
  title: menus.title,
  type: menus.type,
  path: menus.path,
  component: menus.component,
  permission: menus.permission,
  icon: menus.icon,
  sort: menus.sort,
  visible: menus.visible,
  cacheable: menus.cacheable,
  external: menus.external,
};

@Injectable()
export class MenusService {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<TreeNode<MenuRow>[]> {
    const rows = await this.database.db.select().from(menus).where(isNull(menus.deletedAt)).orderBy(asc(menus.sort), asc(menus.id));
    return buildTree(rows);
  }

  async findOne(id: number): Promise<MenuRow> {
    const [menu] = await this.database.db.select().from(menus).where(and(eq(menus.id, id), isNull(menus.deletedAt))).limit(1);
    if (!menu) throw new NotFoundException('Menu not found');
    return menu;
  }

  async create(input: CreateMenuInput, actorId: number): Promise<{ id: number }> {
    const values = { ...withoutUndefined(input), parentId: input.parentId ?? 0 };
    this.validate(values);
    if (values.parentId !== 0) await this.assertParentExists(values.parentId);
    if (values.permission) await this.assertPermissionUnique(values.permission);
    const result = await this.database.db.insert(menus).values({ ...values, createdBy: actorId, updatedBy: actorId });
    return { id: Number(result[0].insertId) };
  }

  async update(id: number, input: UpdateMenuInput, actorId: number): Promise<void> {
    const existing = await this.findOne(id);
    const patch = withoutUndefined(input);
    const merged = { ...existing, ...patch };
    this.validate(merged);
    if (merged.parentId !== 0 && merged.parentId !== id) {
      await this.assertParentExists(merged.parentId);
      const descendants = await this.descendantIds(id);
      if (descendants.includes(merged.parentId)) throw new BadRequestException('Cannot move a menu under its own descendant');
    }
    if (patch.permission) await this.assertPermissionUnique(patch.permission, id);
    await this.database.db.update(menus).set({ ...patch, updatedBy: actorId }).where(and(eq(menus.id, id), isNull(menus.deletedAt)));
  }

  async remove(id: number, actorId: number): Promise<void> {
    await this.findOne(id);
    const [child] = await this.database.db.select({ id: menus.id }).from(menus).where(and(eq(menus.parentId, id), isNull(menus.deletedAt))).limit(1);
    if (child) throw new BadRequestException('Menu has children and cannot be deleted');
    await this.database.db.transaction(async (tx) => {
      await tx.delete(roleMenus).where(eq(roleMenus.menuId, id));
      await tx.update(menus).set({ deletedAt: new Date(), updatedBy: actorId }).where(and(eq(menus.id, id), isNull(menus.deletedAt)));
    });
  }

  async routes(userId: number): Promise<RouteNode[]> {
    const assignments = await this.database.db.select({ roleId: userRoles.roleId, isSystem: roles.isSystem }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, userId));
    const isSuperAdmin = assignments.some((item) => item.isSystem);
    const conditions = [isNull(menus.deletedAt), eq(menus.status, 'active'), inArray(menus.type, ['M', 'C'])];
    const base = this.database.db.select(routeColumns).from(menus);
    let rows: RouteMenu[];
    if (isSuperAdmin) {
      rows = await base.where(and(...conditions)).orderBy(asc(menus.sort), asc(menus.id));
    } else {
      const roleIds = [...new Set(assignments.map((item) => item.roleId))];
      if (!roleIds.length) return [];
      rows = await base.innerJoin(roleMenus, eq(menus.id, roleMenus.menuId)).where(and(inArray(roleMenus.roleId, roleIds), ...conditions)).orderBy(asc(menus.sort), asc(menus.id));
    }
    return buildTree(dedupeById(rows)).map(toRouteNode);
  }

  private async assertParentExists(parentId: number): Promise<void> {
    const [parent] = await this.database.db.select({ id: menus.id }).from(menus).where(and(eq(menus.id, parentId), isNull(menus.deletedAt))).limit(1);
    if (!parent) throw new NotFoundException('Parent menu not found');
  }

  private async assertPermissionUnique(permission: string, excludeId?: number): Promise<void> {
    const conditions = [eq(menus.permission, permission), isNull(menus.deletedAt)];
    if (excludeId !== undefined) conditions.push(ne(menus.id, excludeId));
    const [duplicate] = await this.database.db.select({ id: menus.id }).from(menus).where(and(...conditions)).limit(1);
    if (duplicate) throw new ConflictException('Menu permission already exists');
  }

  private async descendantIds(id: number): Promise<number[]> {
    const rows = await this.database.db.select({ id: menus.id, parentId: menus.parentId }).from(menus).where(isNull(menus.deletedAt));
    const children = new Map<number, number[]>();
    for (const row of rows) {
      const list = children.get(row.parentId) ?? [];
      list.push(row.id);
      children.set(row.parentId, list);
    }
    const result: number[] = [];
    const stack = [id];
    while (stack.length) {
      const current = stack.pop() as number;
      for (const child of children.get(current) ?? []) {
        result.push(child);
        stack.push(child);
      }
    }
    return result;
  }

  private validate(input: { type: 'M' | 'C' | 'F'; path?: string | null | undefined; component?: string | null | undefined; permission?: string | null | undefined }): void {
    if (input.type !== 'F' && !input.path) throw new BadRequestException('Path is required for directories and menus');
    if (input.type === 'C' && !input.component) throw new BadRequestException('Component is required for menus');
    if (input.type === 'F' && !input.permission) throw new BadRequestException('Permission is required for buttons');
  }
}

function withoutUndefined<T extends object>(value: T): { [K in keyof T]: Exclude<T[K], undefined> } { return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> }; }

function dedupeById<T extends { id: number }>(rows: T[]): T[] {
  const seen = new Map<number, T>();
  for (const row of rows) if (!seen.has(row.id)) seen.set(row.id, row);
  return [...seen.values()];
}

function buildTree<T extends { id: number; parentId: number }>(rows: T[]): TreeNode<T>[] {
  const nodes = new Map<number, TreeNode<T>>();
  for (const row of rows) nodes.set(row.id, { ...row, children: [] });
  const roots: TreeNode<T>[] = [];
  for (const node of nodes.values()) {
    if (node.parentId !== 0) {
      const parent = nodes.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else roots.push(node);
  }
  return roots;
}

function toRouteNode(node: TreeNode<RouteMenu>): RouteNode {
  return {
    id: node.id,
    parentId: node.parentId,
    name: node.name,
    path: node.path,
    component: node.component,
    permission: node.permission,
    type: node.type,
    meta: { title: node.title, icon: node.icon, sort: node.sort, cacheable: node.cacheable, external: node.external, visible: node.visible },
    children: node.children.map(toRouteNode),
  };
}
