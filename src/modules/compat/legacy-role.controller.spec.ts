import { describe, expect, it, vi } from 'vitest';
import { LegacyRoleController } from './legacy-role.controller.js';
import type { RolesService } from '../system/roles/roles.service.js';

function mockService(): Partial<RolesService> {
  return { list: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: 1 }) };
}

describe('LegacyRoleController', () => {
  it('list returns wrapped roles', async () => {
    const s = mockService();
    const c = new LegacyRoleController(s as RolesService);
    const result = await c.list();
    expect(result).toHaveProperty('code', 200);
  });

  it('create returns wrapped result', async () => {
    const s = mockService();
    const c = new LegacyRoleController(s as RolesService);
    const result = await c.create({ roleName: 'Test', key: 'test' }, { user: { id: 1 } });
    expect(result).toHaveProperty('code', 200);
  });
});