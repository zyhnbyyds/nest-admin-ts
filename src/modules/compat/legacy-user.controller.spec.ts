import { describe, expect, it, vi } from 'vitest';
// Controller 经 UsersService 间接引入 argon2 原生绑定；单测已整体 mock Service，这里屏蔽原生模块以保证隔离
vi.mock('argon2', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed'),
    verify: vi.fn().mockResolvedValue(true),
    argon2id: 2,
  },
}));
import { LegacyUserController } from './legacy-user.controller';
import type { UsersService } from '../system/users/users.service';

function mockService(): Partial<UsersService> {
  return {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
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
    const result = await c.create(
      { username: 'test', displayName: 'Test', password: 'password123456' },
      { user: { id: 1 } },
    );
    expect(result).toHaveProperty('code', 200);
  });
});
