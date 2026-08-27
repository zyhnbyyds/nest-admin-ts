import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { LoginLogsService } from './login-logs.service.js';

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

describe('LoginLogsService', () => {
  describe('list', () => {
    it('returns paginated login logs', async () => {
      const { db } = mockDb();
      db.select = selectChain([{ id: 1, username: 'admin', ip: '127.0.0.1', userAgent: null, status: 'success', message: null, userId: null, createdAt: new Date() }]);
      const service = new LoginLogsService({ db } as any);
      const result = await service.list(1, 20);
      expect(result.items).toHaveLength(1);
    });

    it('filters by username', async () => {
      const { db } = mockDb();
      db.select = selectChain([]);
      const service = new LoginLogsService({ db } as any);
      await service.list(1, 20, 'admin');
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a log by id', async () => {
      const { db } = mockDb();
      db.select = selectChain([{ id: 1, username: 'admin' }]);
      const service = new LoginLogsService({ db } as any);
      const result = await service.findOne(1);
      expect(result.username).toBe('admin');
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = selectChain([]);
      const service = new LoginLogsService({ db } as any);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes a log by id', async () => {
      const { db } = mockDb();
      db.delete = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) });
      const service = new LoginLogsService({ db } as any);
      await expect(service.remove(1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.delete = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 0 }]) });
      const service = new LoginLogsService({ db } as any);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('clear', () => {
    it('deletes all logs', async () => {
      const { db } = mockDb();
      db.delete = vi.fn().mockResolvedValue([{ affectedRows: 5 }]);
      const service = new LoginLogsService({ db } as any);
      await expect(service.clear()).resolves.toBeUndefined();
    });
  });
});