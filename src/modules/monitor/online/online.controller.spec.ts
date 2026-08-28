import { describe, expect, it, vi } from 'vitest';
import { OnlineController } from './online.controller';
import type { OnlineService } from './online.service';

function mockService(): Partial<OnlineService> {
  return {
    list: vi.fn().mockResolvedValue([]),
    forceLogout: vi.fn().mockResolvedValue(undefined),
  };
}

describe('OnlineController', () => {
  it('list returns online sessions', async () => {
    const s = mockService();
    const c = new OnlineController(s as OnlineService);
    await c.list();
    expect(s.list).toHaveBeenCalledOnce();
  });

  it('forceLogout removes a user session', async () => {
    const s = mockService();
    const c = new OnlineController(s as OnlineService);
    await c.forceLogout(1);
    expect(s.forceLogout).toHaveBeenCalledWith(1);
  });
});
