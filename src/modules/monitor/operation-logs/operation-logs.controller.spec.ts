import { describe, expect, it, vi } from 'vitest';
import { OperationLogsController } from './operation-logs.controller.js';
import type { OperationLogsService } from './operation-logs.service.js';

function mockService(): Partial<OperationLogsService> {
  return {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
    findOne: vi.fn().mockResolvedValue({ id: 1, title: 'Test' }),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

describe('OperationLogsController', () => {
  it('list returns paginated logs', async () => {
    const s = mockService();
    const c = new OperationLogsController(s as OperationLogsService);
    await c.list('1', '20', 'success', '1');
    expect(s.list).toHaveBeenCalledWith(1, 20, 'success', 1);
  });

  it('list handles undefined userId', async () => {
    const s = mockService();
    const c = new OperationLogsController(s as OperationLogsService);
    await c.list('1', '20', undefined, '');
    expect(s.list).toHaveBeenCalledWith(1, 20, undefined, undefined);
  });

  it('findOne returns a log', async () => {
    const s = mockService();
    const c = new OperationLogsController(s as OperationLogsService);
    const r = await c.findOne(1);
    expect(r).toHaveProperty('title', 'Test');
  });

  it('remove deletes a log', async () => {
    const s = mockService();
    const c = new OperationLogsController(s as OperationLogsService);
    await c.remove(1);
    expect(s.remove).toHaveBeenCalledWith(1);
  });

  it('clear deletes all logs', async () => {
    const s = mockService();
    const c = new OperationLogsController(s as OperationLogsService);
    await c.clear();
    expect(s.clear).toHaveBeenCalledOnce();
  });
});