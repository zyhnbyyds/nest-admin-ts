import { describe, expect, it, vi } from 'vitest';
import { RolesController } from './roles.controller';
import type { RolesService } from './roles.service';

function mockRolesService(): Partial<RolesService> {
  return {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(undefined),
    setMenus: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe('RolesController', () => {
  describe('list', () => {
    it('returns all roles', async () => {
      const service = mockRolesService();
      const controller = new RolesController(service as RolesService);
      await controller.list();
      expect(service.list).toHaveBeenCalledOnce();
    });
  });

  describe('create', () => {
    it('creates a role', async () => {
      const service = mockRolesService();
      const controller = new RolesController(service as RolesService);
      const result = await controller.create(
        { name: 'Editor', key: 'editor' },
        { user: { id: 1 } },
      );
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('setMenus', () => {
    it('sets menus for a role', async () => {
      const service = mockRolesService();
      const controller = new RolesController(service as RolesService);
      await controller.setMenus(1, { menuIds: [10, 20, 30] });
      expect(service.setMenus).toHaveBeenCalledWith(1, [10, 20, 30]);
    });
  });

  describe('update', () => {
    it('updates a role', async () => {
      const service = mockRolesService();
      const controller = new RolesController(service as RolesService);
      await controller.update(
        1,
        { name: '编辑角色', remark: '备注' },
        { user: { id: 1 } },
      );
      expect(service.update).toHaveBeenCalledWith(
        1,
        { name: '编辑角色', remark: '备注' },
        1,
      );
    });
  });

  describe('remove', () => {
    it('removes a role', async () => {
      const service = mockRolesService();
      const controller = new RolesController(service as RolesService);
      await controller.remove(1, { user: { id: 1 } });
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
