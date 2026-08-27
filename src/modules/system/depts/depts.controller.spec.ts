import { describe, expect, it, vi } from 'vitest';
import { DeptsController } from './depts.controller.js';
import type { DeptsService } from './depts.service.js';

function mockDeptsService(): Partial<DeptsService> {
  return {
    list: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({ id: 1, name: 'Dept' }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe('DeptsController', () => {
  it('list returns departments', async () => {
    const service = mockDeptsService();
    const controller = new DeptsController(service as DeptsService);
    await controller.list();
    expect(service.list).toHaveBeenCalledOnce();
  });

  it('findOne returns a department', async () => {
    const service = mockDeptsService();
    const controller = new DeptsController(service as DeptsService);
    const result = await controller.findOne(1);
    expect(result).toHaveProperty('name', 'Dept');
  });

  it('create creates a department', async () => {
    const service = mockDeptsService();
    const controller = new DeptsController(service as DeptsService);
    const result = await controller.create({ name: 'New Dept' }, { user: { id: 1 } });
    expect(result).toEqual({ id: 1 });
  });

  it('update updates a department', async () => {
    const service = mockDeptsService();
    const controller = new DeptsController(service as DeptsService);
    await controller.update(1, { name: 'Updated' }, { user: { id: 1 } });
    expect(service.update).toHaveBeenCalledWith(1, { name: 'Updated' }, 1);
  });

  it('remove deletes a department', async () => {
    const service = mockDeptsService();
    const controller = new DeptsController(service as DeptsService);
    await controller.remove(1, { user: { id: 1 } });
    expect(service.remove).toHaveBeenCalledWith(1, 1);
  });
});