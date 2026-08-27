import { describe, expect, it, vi } from 'vitest';
import { JobsController } from './jobs.controller.js';
import type { JobsService } from './jobs.service.js';

function mockService(): Partial<JobsService> {
  return {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
    findOne: vi.fn().mockResolvedValue({ id: 1, name: 'Test', handler: 'noop', cron: '0 0 * * *' }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    runNow: vi.fn().mockResolvedValue({ success: true }),
    listLogs: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
    clearLogs: vi.fn().mockResolvedValue(undefined),
  };
}

describe('JobsController', () => {
  it('list returns paginated jobs', async () => {
    const s = mockService();
    const c = new JobsController(s as JobsService);
    await c.list('1', '20');
    expect(s.list).toHaveBeenCalledWith(1, 20);
  });

  it('findOne returns a job', async () => {
    const s = mockService();
    const c = new JobsController(s as JobsService);
    const r = await c.findOne(1);
    expect(r).toHaveProperty('name', 'Test');
  });

  it('create creates a job', async () => {
    const s = mockService();
    const c = new JobsController(s as JobsService);
    await c.create({ name: 'Test', handler: 'noop', cron: '0 0 * * *' }, { user: { id: 1 } });
    expect(s.create).toHaveBeenCalled();
  });

  it('update updates a job', async () => {
    const s = mockService();
    const c = new JobsController(s as JobsService);
    await c.update(1, { name: 'Updated' }, { user: { id: 1 } });
    expect(s.update).toHaveBeenCalledWith(1, { name: 'Updated' }, 1);
  });

  it('remove deletes a job', async () => {
    const s = mockService();
    const c = new JobsController(s as JobsService);
    await c.remove(1, { user: { id: 1 } });
    expect(s.remove).toHaveBeenCalledWith(1, 1);
  });

  it('runNow executes a job', async () => {
    const s = mockService();
    const c = new JobsController(s as JobsService);
    await c.run(1);
    expect(s.runNow).toHaveBeenCalledWith(1);
  });

  it('logs returns job logs', async () => {
    const s = mockService();
    const c = new JobsController(s as JobsService);
    await c.logs(1, '1', '20');
    expect(s.listLogs).toHaveBeenCalledWith(1, 1, 20);
  });

  it('clearLogs clears all logs', async () => {
    const s = mockService();
    const c = new JobsController(s as JobsService);
    await c.clearLogs();
    expect(s.clearLogs).toHaveBeenCalledOnce();
  });
});