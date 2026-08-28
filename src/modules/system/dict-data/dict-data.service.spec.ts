import { describe, expect, it, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DictDataService } from './dict-data.service';

function mockDb() {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 8 }]),
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

describe('DictDataService', () => {
  describe('list', () => {
    it('returns paginated dict data', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([
        {
          id: 1,
          type: 'sys_status',
          label: 'Active',
          value: '1',
          sort: 0,
          status: 'active',
          cssClass: null,
          listClass: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
        },
      ]);
      const service = new DictDataService({ db } as any);
      const result = await service.list(1, 20);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('byType', () => {
    it('returns active dict data for a type', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([
        {
          label: 'Active',
          value: '1',
          cssClass: null,
          listClass: null,
          sort: 0,
        },
      ]);
      const service = new DictDataService({ db } as any);
      const result = await service.byType('sys_status');
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns dict data by id', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([
        {
          id: 1,
          type: 'sys_status',
          label: 'Active',
          value: '1',
          sort: 0,
          status: 'active',
          cssClass: null,
          listClass: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
        },
      ]);
      const service = new DictDataService({ db } as any);
      const result = await service.findOne(1);
      expect(result.label).toBe('Active');
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new DictDataService({ db } as any);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates dict data', async () => {
      const { db } = mockDb();
      // Two async queries: assertTypeExists, assertValueUnique
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ id: 1 }])
              .mockResolvedValueOnce([]),
          }),
        }),
      });
      const service = new DictDataService({ db } as any);
      const result = await service.create(
        { type: 'sys_status', label: 'Active', value: '1' },
        1,
      );
      expect(result).toEqual({ id: 8 });
    });

    it('throws BadRequestException when type does not exist', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new DictDataService({ db } as any);
      await expect(
        service.create(
          { type: 'nonexistent', label: 'Test', value: 'test' },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates dict data', async () => {
      const { db } = mockDb();
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                {
                  id: 1,
                  type: 'sys_status',
                  label: 'Active',
                  value: '1',
                  sort: 0,
                  status: 'active',
                  cssClass: null,
                  listClass: null,
                  deletedAt: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  createdBy: null,
                  updatedBy: null,
                },
              ])
              .mockResolvedValueOnce([{ id: 1 }]) // type exists
              .mockResolvedValueOnce([]), // value unique
          }),
        }),
      });
      const service = new DictDataService({ db } as any);
      await expect(
        service.update(1, { label: 'Inactive' }, 1),
      ).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('soft-deletes dict data', async () => {
      const { db } = mockDb();
      const service = new DictDataService({ db } as any);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ affectedRows: 0 }]),
        }),
      });
      const service = new DictDataService({ db } as any);
      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
