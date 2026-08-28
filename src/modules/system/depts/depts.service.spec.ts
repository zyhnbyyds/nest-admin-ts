import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeptsService } from './depts.service';

function mockDb() {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 3 }]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
        }),
      }),
    },
  };
}

function selectWithLimit(result: unknown) {
  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
        orderBy: vi.fn().mockImplementation(() =>
          Object.assign(Promise.resolve(result), {
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(result),
            }),
          }),
        ),
      }),
      orderBy: vi.fn().mockImplementation(() =>
        Object.assign(Promise.resolve(result), {
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(result),
          }),
        }),
      ),
    }),
  });
}

describe('DeptsService', () => {
  describe('list', () => {
    it('returns department tree', async () => {
      const { db } = mockDb();
      const rows = [
        {
          id: 1,
          parentId: 0,
          name: 'HQ',
          ancestors: '0',
          sort: 0,
          leaderUserId: null,
          phone: null,
          email: null,
          status: 'active',
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
        },
        {
          id: 2,
          parentId: 1,
          name: 'IT',
          ancestors: '0,1',
          sort: 1,
          leaderUserId: null,
          phone: null,
          email: null,
          status: 'active',
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
        },
      ];
      db.select = selectWithLimit(rows);
      const service = new DeptsService({ db } as any);
      const result = await service.list();
      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns a department by id', async () => {
      const { db } = mockDb();
      const dept = {
        id: 1,
        parentId: 0,
        name: 'HQ',
        ancestors: '0',
        sort: 0,
        leaderUserId: null,
        phone: null,
        email: null,
        status: 'active',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
      };
      db.select = selectWithLimit([dept]);
      const service = new DeptsService({ db } as any);
      const result = await service.findOne(1);
      expect(result).toEqual(dept);
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new DeptsService({ db } as any);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a top-level department', async () => {
      const { db } = mockDb();
      const service = new DeptsService({ db } as any);
      const result = await service.create({ name: 'New Dept' }, 1);
      expect(result).toEqual({ id: 3 });
    });

    it('creates a child department', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1, ancestors: '0' }]);
      const service = new DeptsService({ db } as any);
      const result = await service.create({ name: 'Child', parentId: 1 }, 1);
      expect(result).toEqual({ id: 3 });
    });
  });

  describe('update', () => {
    it('updates a department', async () => {
      const { db } = mockDb();
      const existing = {
        id: 1,
        parentId: 0,
        name: 'HQ',
        ancestors: '0',
        sort: 0,
        leaderUserId: null,
        phone: null,
        email: null,
        status: 'active',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
      };
      db.select = selectWithLimit([existing]);
      const service = new DeptsService({ db } as any);
      await expect(
        service.update(1, { name: 'Updated HQ' }, 1),
      ).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('throws BadRequestException when department has children', async () => {
      const { db } = mockDb();
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ id: 1 }])
              .mockResolvedValueOnce([{ id: 2 }]),
          }),
        }),
      });
      const service = new DeptsService({ db } as any);
      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('soft-deletes a department with no children and no assigned users', async () => {
      const { db } = mockDb();
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ id: 1 }])
              .mockResolvedValueOnce([])
              .mockResolvedValueOnce([]),
          }),
        }),
      });
      const service = new DeptsService({ db } as any);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });
  });
});
