import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service.js';
import { departments, users } from '../../../database/schema/index.js';

export type CreateDeptInput = {
  parentId?: number | undefined;
  name: string;
  sort?: number | undefined;
  leaderUserId?: number | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  status?: 'active' | 'disabled' | undefined;
};

export type UpdateDeptInput = {
  parentId?: number | undefined;
  name?: string | undefined;
  sort?: number | undefined;
  leaderUserId?: number | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  status?: 'active' | 'disabled' | undefined;
};

type DeptRow = typeof departments.$inferSelect;
type TreeNode<T> = T & { children: TreeNode<T>[] };

@Injectable()
export class DeptsService {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<TreeNode<DeptRow>[]> {
    const rows = await this.database.db.select().from(departments).where(isNull(departments.deletedAt)).orderBy(asc(departments.sort), asc(departments.id));
    return buildTree(rows);
  }

  async findOne(id: number): Promise<DeptRow> {
    const [dept] = await this.database.db.select().from(departments).where(and(eq(departments.id, id), isNull(departments.deletedAt))).limit(1);
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(input: CreateDeptInput, actorId: number): Promise<{ id: number }> {
    const parentId = input.parentId ?? 0;
    const ancestors = await this.resolveAncestors(parentId);
    const result = await this.database.db.insert(departments).values({ ...withoutUndefined(input), parentId, ancestors, createdBy: actorId, updatedBy: actorId });
    return { id: Number(result[0].insertId) };
  }

  async update(id: number, input: UpdateDeptInput, actorId: number): Promise<void> {
    const existing = await this.findOne(id);
    const patch = withoutUndefined(input);
    const parentId = patch.parentId ?? existing.parentId;
    if (parentId !== 0) {
      if (parentId === id) throw new BadRequestException('Cannot set a department as its own parent');
      await this.assertParentExists(parentId);
      const descendants = await this.descendantIds(id);
      if (descendants.includes(parentId)) throw new BadRequestException('Cannot move a department under its own descendant');
    }
    await this.database.db.update(departments).set({ ...patch, updatedBy: actorId }).where(and(eq(departments.id, id), isNull(departments.deletedAt)));
    if (parentId !== existing.parentId) await this.recomputeAncestors(id);
  }

  async remove(id: number, actorId: number): Promise<void> {
    await this.findOne(id);
    const [child] = await this.database.db.select({ id: departments.id }).from(departments).where(and(eq(departments.parentId, id), isNull(departments.deletedAt))).limit(1);
    if (child) throw new BadRequestException('Department has children and cannot be deleted');
    const [assigned] = await this.database.db.select({ id: users.id }).from(users).where(and(eq(users.deptId, id), isNull(users.deletedAt))).limit(1);
    if (assigned) throw new BadRequestException('Department has assigned users and cannot be deleted');
    await this.database.db.update(departments).set({ deletedAt: new Date(), updatedBy: actorId }).where(and(eq(departments.id, id), isNull(departments.deletedAt)));
  }

  private async resolveAncestors(parentId: number): Promise<string> {
    if (parentId === 0) return '0';
    const [parent] = await this.database.db.select({ ancestors: departments.ancestors }).from(departments).where(and(eq(departments.id, parentId), isNull(departments.deletedAt))).limit(1);
    if (!parent) throw new NotFoundException('Parent department not found');
    return `${parent.ancestors},${parentId}`;
  }

  private async assertParentExists(parentId: number): Promise<void> {
    const [parent] = await this.database.db.select({ id: departments.id }).from(departments).where(and(eq(departments.id, parentId), isNull(departments.deletedAt))).limit(1);
    if (!parent) throw new NotFoundException('Parent department not found');
  }

  private async descendantIds(id: number): Promise<number[]> {
    const rows = await this.database.db.select({ id: departments.id, parentId: departments.parentId }).from(departments).where(isNull(departments.deletedAt));
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

  private async recomputeAncestors(id: number): Promise<void> {
    const [node] = await this.database.db.select().from(departments).where(and(eq(departments.id, id), isNull(departments.deletedAt))).limit(1);
    if (!node) return;
    const ancestors = await this.resolveAncestors(node.parentId);
    await this.database.db.update(departments).set({ ancestors }).where(eq(departments.id, id));
    const children = await this.database.db.select({ id: departments.id }).from(departments).where(and(eq(departments.parentId, id), isNull(departments.deletedAt)));
    for (const child of children) await this.recomputeAncestors(child.id);
  }
}

function withoutUndefined<T extends object>(value: T): { [K in keyof T]: Exclude<T[K], undefined> } { return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> }; }

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
