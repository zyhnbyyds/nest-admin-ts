import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DictTypesService } from './dict-types.service';

function mockDb() {
  return {
    db: {
      select: vi.fn(),
      insert: vi
        .fn()
        .mockReturnValue({
          values: vi.fn().mockResolvedValue([{ insertId: 4 }]),
        }),
      update: vi
        .fn()
        .mockReturnValue({
          set: vi
            .fn()
            .mockReturnValue({
              where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            }),
        }),
      transaction: vi.fn().mockImplementation(async (cb: any) => {
        await cb({
          update: vi
            .fn()
            .mockReturnValue({
              set: vi
                .fn()
                .mockReturnValue({
                  where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
                }),
            }),
        });
      }),
    },
  };
}

function selectWithLimit(result: unknown) {
  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi
        .fn()
        .mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
          orderBy: vi
            .fn()
            .mockReturnValue({
              limit: vi
                .fn()
                .mockReturnValue({ offset: vi.fn().mockResolvedValue(result) }),
            }),
        }),
      orderBy: vi
        .fn()
        .mockReturnValue({
          limit: vi
            .fn()
            .mockReturnValue({ offset: vi.fn().mockResolvedValue(result) }),
        }),
    }),
  });
}

describe('DictTypesService', () => {
  describe('list', () => {
    it('returns paginated dict types', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([
        {
          id: 1,
          name: 'Status',
          type: 'sys_status',
          status: 'active',
          remark: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
        },
      ]);
      const service = new DictTypesService({ db } as any);
      const result = await service.list(1, 20);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns a dict type', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([
        {
          id: 1,
          name: 'Status',
          type: 'sys_status',
          status: 'active',
          remark: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
        },
      ]);
      const service = new DictTypesService({ db } as any);
      const result = await service.findOne(1);
      expect(result.name).toBe('Status');
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new DictTypesService({ db } as any);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a dict type', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new DictTypesService({ db } as any);
      const result = await service.create(
        { name: 'Status', type: 'sys_status' },
        1,
      );
      expect(result).toEqual({ id: 4 });
    });

    it('throws ConflictException when type exists', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1 }]);
      const service = new DictTypesService({ db } as any);
      await expect(
        service.create({ name: 'Status', type: 'sys_status' }, 1),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates a dict type', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1 }]);
      const service = new DictTypesService({ db } as any);
      await expect(
        service.update(1, { name: 'Updated' }, 1),
      ).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('soft-deletes a dict type and its data', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([
        {
          id: 1,
          name: 'Status',
          type: 'sys_status',
          status: 'active',
          remark: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
        },
      ]);
      const service = new DictTypesService({ db } as any);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });
  });
});
