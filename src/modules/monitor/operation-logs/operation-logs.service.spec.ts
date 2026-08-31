import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { OperationLogsService } from './operation-logs.service';

function mockDb() {
  return { db: { select: vi.fn(), delete: vi.fn() } };
}

function selectChain(result: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    // findOne 直接 await limit(...)；list 走 limit(...).offset(...)
    limit: vi.fn().mockImplementation(() =>
      Object.assign(Promise.resolve(result), {
        offset: vi.fn().mockResolvedValue(result),
      }),
    ),
    offset: vi.fn().mockResolvedValue(result),
  };
  return vi.fn().mockReturnValue(chain);
}

describe('OperationLogsService', () => {
  describe('list', () => {
    it('returns paginated operation logs', async () => {
      const { db } = mockDb();
      db.select = selectChain([
        { id: 1, title: 'Test', status: 'success', durationMs: 10 },
      ]);
      const service = new OperationLogsService({ db } as any);
      const result = await service.list(1, 20);
      expect(result.items).toHaveLength(1);
    });

    it('joins users to expose operator username', async () => {
      const { db } = mockDb();
      const select = selectChain([{ id: 1, username: 'admin' }]);
      db.select = select;
      const service = new OperationLogsService({ db } as any);
      await service.list(1, 20);
      expect(select.mock.results[0].value.leftJoin).toHaveBeenCalled();
    });

    it('filters by status, userId and username', async () => {
      const { db } = mockDb();
      db.select = selectChain([]);
      const service = new OperationLogsService({ db } as any);
      await service.list(1, 20, 'success', 1, 'admin');
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a log by id', async () => {
      const { db } = mockDb();
      db.select = selectChain([{ id: 1, title: 'Test', status: 'success' }]);
      const service = new OperationLogsService({ db } as any);
      const result = await service.findOne(1);
      expect(result.title).toBe('Test');
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = selectChain([]);
      const service = new OperationLogsService({ db } as any);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes a log', async () => {
      const { db } = mockDb();
      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      });
      const service = new OperationLogsService({ db } as any);
      await expect(service.remove(1)).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('deletes all logs', async () => {
      const { db } = mockDb();
      db.delete = vi.fn().mockResolvedValue([{ affectedRows: 5 }]);
      const service = new OperationLogsService({ db } as any);
      await expect(service.clear()).resolves.toBeUndefined();
    });
  });
});
