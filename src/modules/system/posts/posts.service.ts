import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service.js';
import { posts, userPosts } from '../../../database/schema/index.js';

export type CreatePostInput = {
  name: string;
  key: string;
  sort?: number | undefined;
  status?: 'active' | 'disabled' | undefined;
  remark?: string | undefined;
};

export type UpdatePostInput = {
  name?: string | undefined;
  key?: string | undefined;
  sort?: number | undefined;
  status?: 'active' | 'disabled' | undefined;
  remark?: string | null | undefined;
};

@Injectable()
export class PostsService {
  constructor(private readonly database: DatabaseService) {}

  async list(page: number, pageSize: number) {
    const items = await this.database.db.select().from(posts).where(isNull(posts.deletedAt)).orderBy(asc(posts.sort), asc(posts.id)).limit(pageSize).offset((page - 1) * pageSize);
    return { items, page, pageSize };
  }

  async findOne(id: number) {
    const [post] = await this.database.db.select().from(posts).where(and(eq(posts.id, id), isNull(posts.deletedAt))).limit(1);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(input: CreatePostInput, actorId: number): Promise<{ id: number }> {
    await this.assertKeyUnique(input.key);
    const result = await this.database.db.insert(posts).values({ ...withoutUndefined(input), createdBy: actorId, updatedBy: actorId });
    return { id: Number(result[0].insertId) };
  }

  async update(id: number, input: UpdatePostInput, actorId: number): Promise<void> {
    await this.findOne(id);
    const patch = withoutUndefined(input);
    if (patch.key) await this.assertKeyUnique(patch.key, id);
    const result = await this.database.db.update(posts).set({ ...patch, updatedBy: actorId }).where(and(eq(posts.id, id), isNull(posts.deletedAt)));
    if (!result[0].affectedRows) throw new NotFoundException('Post not found');
  }

  async remove(id: number, actorId: number): Promise<void> {
    await this.findOne(id);
    await this.database.db.transaction(async (tx) => {
      await tx.delete(userPosts).where(eq(userPosts.postId, id));
      await tx.update(posts).set({ deletedAt: new Date(), updatedBy: actorId }).where(and(eq(posts.id, id), isNull(posts.deletedAt)));
    });
  }

  private async assertKeyUnique(key: string, excludeId?: number): Promise<void> {
    const conditions = [eq(posts.key, key), isNull(posts.deletedAt)];
    if (excludeId !== undefined) conditions.push(ne(posts.id, excludeId));
    const [duplicate] = await this.database.db.select({ id: posts.id }).from(posts).where(and(...conditions)).limit(1);
    if (duplicate) throw new ConflictException('Post key already exists');
  }
}

function withoutUndefined<T extends object>(value: T): { [K in keyof T]: Exclude<T[K], undefined> } { return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> }; }
