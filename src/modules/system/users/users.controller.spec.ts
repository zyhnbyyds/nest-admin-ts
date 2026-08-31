import { describe, expect, it, vi } from 'vitest';
// Controller 经 UsersService 间接引入 argon2 原生绑定；单测已整体 mock Service，这里屏蔽原生模块以保证隔离
vi.mock('argon2', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed'),
    verify: vi.fn().mockResolvedValue(true),
    argon2id: 2,
  },
}));
import { UsersController } from './users.controller';
import type { UsersService } from './users.service';

function mockUsersService(): Partial<UsersService> {
  return {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe('UsersController', () => {
  describe('list', () => {
    it('returns paginated users', async () => {
      const service = mockUsersService();
      const controller = new UsersController(service as UsersService);
      await controller.list('1', '20');
      expect(service.list).toHaveBeenCalledWith(1, 20);
    });

    it('uses defaults when pagination params are missing', async () => {
      const service = mockUsersService();
      const controller = new UsersController(service as UsersService);
      await controller.list(undefined, undefined);
      expect(service.list).toHaveBeenCalledWith(1, 20);
    });

    it('clamps page and pageSize to valid ranges', async () => {
      const service = mockUsersService();
      const controller = new UsersController(service as UsersService);
      await controller.list('0', '200');
      expect(service.list).toHaveBeenCalledWith(1, 100);
    });
  });

  describe('create', () => {
    it('creates a user', async () => {
      const service = mockUsersService();
      const controller = new UsersController(service as UsersService);
      const result = await controller.create(
        { username: 'newuser', displayName: 'New', password: 'password123456' },
        { user: { id: 1 } },
      );
      expect(result).toEqual({ id: 1 });
      expect(service.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates a user', async () => {
      const service = mockUsersService();
      const controller = new UsersController(service as UsersService);
      await controller.update(
        1,
        { displayName: 'Updated' },
        { user: { id: 1 } },
      );
      expect(service.update).toHaveBeenCalledWith(
        1,
        { displayName: 'Updated' },
        1,
      );
    });
  });

  describe('remove', () => {
    it('removes a user', async () => {
      const service = mockUsersService();
      const controller = new UsersController(service as UsersService);
      await controller.remove(1, { user: { id: 1 } });
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
