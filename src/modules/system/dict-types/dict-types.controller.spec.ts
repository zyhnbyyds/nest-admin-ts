import { describe, expect, it, vi } from 'vitest';
import { DictTypesController } from './dict-types.controller.js';
import type { DictTypesService } from './dict-types.service.js';

function mockService(): Partial<DictTypesService> {
  return {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
    findOne: vi.fn().mockResolvedValue({ id: 1, name: 'Status', type: 'sys_status' }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe('DictTypesController', () => {
  it('list returns paginated dict types', async () => {
    const s = mockService();
    const c = new DictTypesController(s as DictTypesService);
    await c.list('1', '20');
    expect(s.list).toHaveBeenCalledWith(1, 20);
  });

  it('findOne returns a dict type', async () => {
    const s = mockService();
    const c = new DictTypesController(s as DictTypesService);
    const r = await c.findOne(1);
    expect(r).toHaveProperty('name', 'Status');
  });

  it('create creates a dict type', async () => {
    const s = mockService();
    const c = new DictTypesController(s as DictTypesService);
    await c.create({ name: 'Status', type: 'sys_status' }, { user: { id: 1 } });
    expect(s.create).toHaveBeenCalled();
  });

  it('update updates a dict type', async () => {
    const s = mockService();
    const c = new DictTypesController(s as DictTypesService);
    await c.update(1, { name: 'Updated' }, { user: { id: 1 } });
    expect(s.update).toHaveBeenCalledWith(1, { name: 'Updated' }, 1);
  });

  it('remove deletes a dict type', async () => {
    const s = mockService();
    const c = new DictTypesController(s as DictTypesService);
    await c.remove(1, { user: { id: 1 } });
    expect(s.remove).toHaveBeenCalledWith(1, 1);
  });
});