import { describe, expect, it, vi } from 'vitest';
import { LoginLogsController } from './login-logs.controller';
import type { LoginLogsService } from './login-logs.service';

function mockService(): Partial<LoginLogsService> {
  return {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
    findOne: vi.fn().mockResolvedValue({ id: 1, username: 'admin' }),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

describe('LoginLogsController', () => {
  it('list returns paginated logs', async () => {
    const s = mockService();
    const c = new LoginLogsController(s as LoginLogsService);
    await c.list('1', '20', 'admin', 'success');
    expect(s.list).toHaveBeenCalledWith(1, 20, 'admin', 'success');
  });

  it('findOne returns a log', async () => {
    const s = mockService();
    const c = new LoginLogsController(s as LoginLogsService);
    const r = await c.findOne(1);
    expect(r).toHaveProperty('username', 'admin');
  });

  it('remove deletes a log', async () => {
    const s = mockService();
    const c = new LoginLogsController(s as LoginLogsService);
    await c.remove(1);
    expect(s.remove).toHaveBeenCalledWith(1);
  });

  it('clear deletes all logs', async () => {
    const s = mockService();
    const c = new LoginLogsController(s as LoginLogsService);
    await c.clear();
    expect(s.clear).toHaveBeenCalledOnce();
  });
});
