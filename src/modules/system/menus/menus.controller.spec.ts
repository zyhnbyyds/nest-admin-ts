import { describe, expect, it, vi } from 'vitest';
import { MenusController } from './menus.controller';
import type { MenusService } from './menus.service';

function mockMenusService(): Partial<MenusService> {
  return {
    list: vi.fn().mockResolvedValue([]),
    findOne: vi
      .fn()
      .mockResolvedValue({ id: 1, name: 'Menu', title: 'Menu', type: 'M' }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    routes: vi.fn().mockResolvedValue([]),
  };
}

describe('MenusController', () => {
  describe('list', () => {
    it('returns menu tree', async () => {
      const service = mockMenusService();
      const controller = new MenusController(service as MenusService);
      await controller.list();
      expect(service.list).toHaveBeenCalledOnce();
    });
  });

  describe('routes', () => {
    it('returns routes for current user', async () => {
      const service = mockMenusService();
      const controller = new MenusController(service as MenusService);
      await controller.routes({ user: { id: 1 } });
      expect(service.routes).toHaveBeenCalledWith(1);
    });
  });

  describe('findOne', () => {
    it('returns a menu by id', async () => {
      const service = mockMenusService();
      const controller = new MenusController(service as MenusService);
      const result = await controller.findOne(1);
      expect(result).toHaveProperty('id', 1);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('creates a menu', async () => {
      const service = mockMenusService();
      const controller = new MenusController(service as MenusService);
      const result = await controller.create(
        { name: 'Test', title: 'Test', type: 'M', path: '/test' },
        { user: { id: 1 } },
      );
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('update', () => {
    it('updates a menu', async () => {
      const service = mockMenusService();
      const controller = new MenusController(service as MenusService);
      await controller.update(1, { name: 'Updated' }, { user: { id: 1 } });
      expect(service.update).toHaveBeenCalledWith(1, { name: 'Updated' }, 1);
    });
  });

  describe('remove', () => {
    it('deletes a menu', async () => {
      const service = mockMenusService();
      const controller = new MenusController(service as MenusService);
      await controller.remove(1, { user: { id: 1 } });
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
