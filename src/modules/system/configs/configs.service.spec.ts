import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigsService } from './configs.service.js';

function mockDb() {
  return { db: { select: vi.fn(), insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 6 }]) }), update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) }) } };
}

function selectWithLimit(result: unknown) {
  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(result), orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue(result) }) }) }),
      orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue(result) }) }),
    }),
  });
}

describe('ConfigsService', () => {
  describe('list', () => {
    it('returns paginated configs', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1, name: 'Site Name', key: 'site.name', value: 'My App', builtin: false, remark: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }]);
      const service = new ConfigsService({ db } as any);
      const result = await service.list(1, 20);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns a config by id', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1, name: 'Site Name', key: 'site.name', value: 'My App', builtin: false, remark: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }]);
      const service = new ConfigsService({ db } as any);
      const result = await service.findOne(1);
      expect(result.key).toBe('site.name');
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new ConfigsService({ db } as any);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('byKey', () => {
    it('returns a config by key', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1, name: 'Site Name', key: 'site.name', value: 'My App', builtin: false, remark: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }]);
      const service = new ConfigsService({ db } as any);
      const result = await service.byKey('site.name');
      expect(result.value).toBe('My App');
    });
  });

  describe('create', () => {
    it('creates a config', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new ConfigsService({ db } as any);
      const result = await service.create({ name: 'Site Name', key: 'site.name', value: 'My App' }, 1);
      expect(result).toEqual({ id: 6 });
    });

    it('throws ConflictException when key exists', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1 }]);
      const service = new ConfigsService({ db } as any);
      await expect(service.create({ name: 'Site Name', key: 'site.name', value: 'My App' }, 1)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates a config', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1 }]);
      const service = new ConfigsService({ db } as any);
      await expect(service.update(1, { value: 'New Value' }, 1)).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('throws BadRequestException when config is builtin', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1, builtin: true }]);
      const service = new ConfigsService({ db } as any);
      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('soft-deletes a non-builtin config', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ id: 1, builtin: false }]);
      const service = new ConfigsService({ db } as any);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });
  });
});