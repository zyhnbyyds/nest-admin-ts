import { describe, expect, it, vi } from 'vitest';
import { GeneratorController } from './generator.controller';
import type { GeneratorService } from './generator.service';

function mockService(): Partial<GeneratorService> {
  return {
    listTables: vi.fn().mockResolvedValue([]),
    getColumns: vi.fn().mockResolvedValue([]),
    preview: vi.fn().mockResolvedValue({ table: 'test', files: [] }),
    generate: vi.fn().mockResolvedValue({ table: 'test', files: [] }),
  };
}

describe('GeneratorController', () => {
  it('listTables returns tables', async () => {
    const s = mockService();
    const c = new GeneratorController(s as GeneratorService);
    await c.listTables();
    expect(s.listTables).toHaveBeenCalledOnce();
  });

  it('getColumns returns columns', async () => {
    const s = mockService();
    const c = new GeneratorController(s as GeneratorService);
    await c.getColumns('sys_user');
    expect(s.getColumns).toHaveBeenCalledWith('sys_user');
  });

  it('preview generates preview', async () => {
    const s = mockService();
    const c = new GeneratorController(s as GeneratorService);
    const r = await c.preview({ table: 'sys_user' });
    expect(r).toHaveProperty('table', 'test');
  });

  it('generate writes files', async () => {
    const s = mockService();
    const c = new GeneratorController(s as GeneratorService);
    const r = await c.generate({ table: 'sys_user', directory: 'test' });
    expect(r).toHaveProperty('table', 'test');
  });
});
