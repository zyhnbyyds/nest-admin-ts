import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service.js';

function mockDb() {
  return { db: { select: vi.fn(), insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 7 }]) }), update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) }), delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }), transaction: vi.fn().mockImplementation(async (cb: any) => { await cb({ delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }), update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) }) }); }) } };
}

function selectWithLimit(result: unknown) {
  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(result), orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue(result) }) }) }),
      orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue(result) }) }),
    }),
  });
}

describe('PostsService', () => {
  describe('list', () => {
    it('returns paginated posts', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1, name: 'Engineer', key: 'engineer', sort: 0, status: 'active', remark: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }]);
      const service = new PostsService({ db } as any);
      const result = await service.list(1, 20);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns a post by id', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1, name: 'Engineer', key: 'engineer', sort: 0, status: 'active', remark: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }]);
      const service = new PostsService({ db } as any);
      const result = await service.findOne(1);
      expect(result.name).toBe('Engineer');
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new PostsService({ db } as any);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a post successfully', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new PostsService({ db } as any);
      const result = await service.create({ name: 'Engineer', key: 'engineer' }, 1);
      expect(result).toEqual({ id: 7 });
    });

    it('throws ConflictException when key exists', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1 }]);
      const service = new PostsService({ db } as any);
      await expect(service.create({ name: 'Engineer', key: 'engineer' }, 1)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates a post', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1 }]);
      const service = new PostsService({ db } as any);
      await expect(service.update(1, { name: 'Updated' }, 1)).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('soft-deletes a post', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1 }]);
      const service = new PostsService({ db } as any);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new PostsService({ db } as any);
      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});