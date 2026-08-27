import { describe, expect, it, vi } from 'vitest';
import { LegacyUserController } from './legacy-user.controller.js';
import type { UsersService } from '../system/users/users.service.js';

function mockService(): Partial<UsersService> {
  return { list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }), create: vi.fn().mockResolvedValue({ id: 1 }), update: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) };
}

describe('LegacyUserController', () => {
  it('list returns legacy-wrapped users', async () => {
    const s = mockService();
    const c = new LegacyUserController(s as UsersService);
    const result = await c.list('1', '20');
    expect(result).toHaveProperty('code', 200);
  });

  it('create returns legacy-wrapped result', async () => {
    const s = mockService();
    const c = new LegacyUserController(s as UsersService);
    const result = await c.create({ username: 'test', displayName: 'Test', password: 'password123456' }, { user: { id: 1 } });
    expect(result).toHaveProperty('code', 200);
  });
});