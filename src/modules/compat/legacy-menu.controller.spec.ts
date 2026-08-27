import { describe, expect, it, vi } from 'vitest';
import { LegacyMenuController } from './legacy-menu.controller.js';
import type { MenusService } from '../system/menus/menus.service.js';

function mockService(): Partial<MenusService> {
  return { list: vi.fn().mockResolvedValue([]), findOne: vi.fn().mockResolvedValue({ id: 1, name: 'Test', title: 'Test', type: 'M' }), create: vi.fn().mockResolvedValue({ id: 1 }) };
}

describe('LegacyMenuController', () => {
  it('list returns wrapped menus', async () => {
    const s = mockService();
    const c = new LegacyMenuController(s as MenusService);
    const result = await c.list();
    expect(result).toHaveProperty('code', 200);
  });

  it('findOne returns wrapped menu', async () => {
    const s = mockService();
    const c = new LegacyMenuController(s as MenusService);
    const result = await c.findOne(1);
    expect(result).toHaveProperty('code', 200);
  });
});