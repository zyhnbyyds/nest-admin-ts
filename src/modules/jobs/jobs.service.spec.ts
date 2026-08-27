import { describe, expect, it, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JobsService } from './jobs.service.js';

vi.mock('@nestjs/schedule', () => ({
  SchedulerRegistry: vi.fn().mockImplementation(() => ({
    addCronJob: vi.fn(),
    getCronJob: vi.fn().mockReturnValue({ stop: vi.fn() }),
    deleteCronJob: vi.fn(),
    doesExist: vi.fn().mockReturnValue(false),
    getCronJobs: vi.fn().mockReturnValue(new Map()),
  })),
}));

function mockDb() {
  return { db: { select: vi.fn(), insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 9 }]) }), update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) }), delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) } };
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

describe('JobsService', () => {
  let scheduler: any;
  scheduler = new (require('@nestjs/schedule').SchedulerRegistry)();

  describe('list', () => {
    it('returns paginated jobs', async () => {
      const { db } = mockDb();
      db.select = selectChain([{ id: 1, name: 'Cleanup', handler: 'cleanExpiredRefreshTokens', cron: '0 0 * * *', status: 'active', concurrent: true, remark: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }]);
      const service = new JobsService({ db } as any, scheduler);
      const result = await service.list(1, 20);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns a job by id', async () => {
      const { db } = mockDb();
      db.select = selectChain([{ id: 1, name: 'Cleanup', handler: 'cleanExpiredRefreshTokens', cron: '0 0 * * *', status: 'active', concurrent: true, remark: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }]);
      const service = new JobsService({ db } as any, scheduler);
      const result = await service.findOne(1);
      expect(result.name).toBe('Cleanup');
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = selectChain([]);
      const service = new JobsService({ db } as any, scheduler);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a job with valid handler and cron', async () => {
      const { db } = mockDb();
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 9, name: 'Test', handler: 'noop', cron: '0 0 * * *', status: 'active', concurrent: true, remark: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }]),
          }),
        }),
      });
      const service = new JobsService({ db } as any, scheduler);
      const result = await service.create({ name: 'Test', handler: 'noop', cron: '0 0 * * *' }, 1);
      expect(result).toEqual({ id: 9 });
    });

    it('throws BadRequestException for unknown handler', async () => {
      const { db } = mockDb();
      const service = new JobsService({ db } as any, scheduler);
      await expect(service.create({ name: 'Test', handler: 'unknown', cron: '0 0 * * *' }, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('runNow', () => {
    it('executes a job handler', async () => {
      const { db } = mockDb();
      db.select = selectChain([{ id: 1, name: 'Test', handler: 'noop', cron: '0 0 * * *', status: 'active', concurrent: true, remark: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }]);
      const service = new JobsService({ db } as any, scheduler);
      const result = await service.runNow(1);
      expect(result).toEqual({ success: true });
    });
  });

  describe('listLogs', () => {
    it('returns paginated job logs', async () => {
      const { db } = mockDb();
      db.select = selectChain([{ id: 1, jobId: 1, jobName: 'Test', handler: 'noop', status: 'success', message: null, startedAt: new Date(), finishedAt: new Date(), durationMs: 100 }]);
      const service = new JobsService({ db } as any, scheduler);
      const result = await service.listLogs(1, 1, 20);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('clearLogs', () => {
    it('deletes all job logs', async () => {
      const { db } = mockDb();
      const service = new JobsService({ db } as any, scheduler);
      await expect(service.clearLogs()).resolves.toBeUndefined();
    });
  });
});