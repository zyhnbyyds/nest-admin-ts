import { describe, expect, it, vi } from 'vitest';
import { ConfigsController } from './configs.controller';
import type { ConfigsService } from './configs.service';

function mockService(): Partial<ConfigsService> {
  return {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
    byKey: vi
      .fn()
      .mockResolvedValue({ id: 1, key: 'site.name', value: 'My App' }),
    findOne: vi
      .fn()
      .mockResolvedValue({ id: 1, key: 'site.name', value: 'My App' }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ConfigsController', () => {
  it('list returns paginated configs', async () => {
    const s = mockService();
    const c = new ConfigsController(s as ConfigsService);
    await c.list('1', '20');
    expect(s.list).toHaveBeenCalledWith(1, 20);
  });

  it('byKey returns a config', async () => {
    const s = mockService();
    const c = new ConfigsController(s as ConfigsService);
    const r = await c.byKey('site.name');
    expect(r).toHaveProperty('value', 'My App');
  });

  it('findOne returns a config', async () => {
    const s = mockService();
    const c = new ConfigsController(s as ConfigsService);
    const r = await c.findOne(1);
    expect(r).toHaveProperty('key', 'site.name');
  });

  it('create creates a config', async () => {
    const s = mockService();
    const c = new ConfigsController(s as ConfigsService);
    await c.create(
      { name: 'Test', key: 'test.key', value: 'val' },
      { user: { id: 1 } },
    );
    expect(s.create).toHaveBeenCalled();
  });

  it('update updates a config', async () => {
    const s = mockService();
    const c = new ConfigsController(s as ConfigsService);
    await c.update(1, { value: 'new' }, { user: { id: 1 } });
    expect(s.update).toHaveBeenCalledWith(1, { value: 'new' }, 1);
  });

  it('remove deletes a config', async () => {
    const s = mockService();
    const c = new ConfigsController(s as ConfigsService);
    await c.remove(1, { user: { id: 1 } });
    expect(s.remove).toHaveBeenCalledWith(1, 1);
  });
});
