import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { OperationLogsService } from './operation-logs.service';

function mockDb() {
  return { db: { select: vi.fn(), delete: vi.fn() } };
}

function selectChain(result: unknown) {
  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(result),
          }),
        }),
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
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

    it('filters by status and userId', async () => {
      const { db } = mockDb();
      db.select = selectChain([]);
      const service = new OperationLogsService({ db } as any);
      await service.list(1, 20, 'success', 1);
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
      db.delete = vi
        .fn()
        .mockReturnValue({
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
