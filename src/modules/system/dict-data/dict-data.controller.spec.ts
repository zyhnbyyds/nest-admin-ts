import { describe, expect, it, vi } from 'vitest';
import { DictDataController } from './dict-data.controller';
import type { DictDataService } from './dict-data.service';

function mockService(): Partial<DictDataService> {
  return {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
    byType: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({
      id: 1,
      type: 'sys_status',
      label: 'Active',
      value: '1',
    }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe('DictDataController', () => {
  it('list returns paginated data', async () => {
    const s = mockService();
    const c = new DictDataController(s as DictDataService);
    await c.list('1', '20');
    expect(s.list).toHaveBeenCalledWith(1, 20, undefined);
  });

  it('list filters by type', async () => {
    const s = mockService();
    const c = new DictDataController(s as DictDataService);
    await c.list('1', '20', 'sys_status');
    expect(s.list).toHaveBeenCalledWith(1, 20, 'sys_status');
  });

  it('byType returns data for type', async () => {
    const s = mockService();
    const c = new DictDataController(s as DictDataService);
    await c.byType('sys_status');
    expect(s.byType).toHaveBeenCalledWith('sys_status');
  });

  it('findOne returns dict data', async () => {
    const s = mockService();
    const c = new DictDataController(s as DictDataService);
    const r = await c.findOne(1);
    expect(r).toHaveProperty('label', 'Active');
  });

  it('create creates dict data', async () => {
    const s = mockService();
    const c = new DictDataController(s as DictDataService);
    await c.create(
      { type: 'sys_status', label: 'Active', value: '1' },
      { user: { id: 1 } },
    );
    expect(s.create).toHaveBeenCalled();
  });

  it('update updates dict data', async () => {
    const s = mockService();
    const c = new DictDataController(s as DictDataService);
    await c.update(1, { label: 'Inactive' }, { user: { id: 1 } });
    expect(s.update).toHaveBeenCalledWith(1, { label: 'Inactive' }, 1);
  });

  it('remove deletes dict data', async () => {
    const s = mockService();
    const c = new DictDataController(s as DictDataService);
    await c.remove(1, { user: { id: 1 } });
    expect(s.remove).toHaveBeenCalledWith(1, 1);
  });
});
