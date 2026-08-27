import { describe, expect, it, vi } from 'vitest';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { MenusService } from './menus.service.js';

/** Build a DatabaseService-shaped mock. */
function mockDb() {
  return { db: { select: vi.fn(), insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 5 }]) }), update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) }), delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }), transaction: vi.fn().mockImplementation(async (cb: any) => { await cb({ delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }), update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) }) }); }) } };
}

/** select().from().where().limit()  OR  .where().orderBy() — both resolve to result */
function sel(result: unknown) {
  const w = vi.fn().mockImplementation(() =>
    Object.assign(Promise.resolve(result), {
      limit: vi.fn().mockResolvedValue(result),
      orderBy: vi.fn().mockResolvedValue(result),
    }),
  );
  return vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: w, orderBy: vi.fn().mockResolvedValue(result), innerJoin: vi.fn().mockReturnThis() }), innerJoin: vi.fn().mockReturnThis() });
}

describe('MenusService', () => {
  describe('list', () => {
    it('returns menu tree', async () => {
      const { db } = mockDb();
      const rows = [
        { id: 1, parentId: 0, name: 'System', title: 'System', type: 'M', path: '/system', component: null, permission: null, icon: 'gear', sort: 0, visible: true, cacheable: false, external: false, status: 'active', deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null },
      ];
      db.select = sel(rows);
      const service = new MenusService({ db } as any);
      const result = await service.list();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns a menu by id', async () => {
      const { db } = mockDb();
      const menu = { id: 1, parentId: 0, name: 'System', title: 'System', type: 'M', path: '/system', component: null, permission: null, icon: 'gear', sort: 0, visible: true, cacheable: false, external: false, status: 'active', deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null };
      db.select = sel([menu]);
      const service = new MenusService({ db } as any);
      const result = await service.findOne(1);
      expect(result).toEqual(menu);
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = sel([]);
      const service = new MenusService({ db } as any);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a top-level menu', async () => {
      const { db } = mockDb();
      db.select = sel([]); // no duplicate permission
      const service = new MenusService({ db } as any);
      const result = await service.create({ name: 'System', title: 'System', type: 'M', path: '/system' }, 1);
      expect(result).toEqual({ id: 5 });
    });

    it('throws BadRequestException for type C without component', async () => {
      const { db } = mockDb();
      const service = new MenusService({ db } as any);
      await expect(service.create({ name: 'Test', title: 'Test', type: 'C', path: '/test' }, 1)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when permission exists', async () => {
      const { db } = mockDb();
      // For create with permission, first select is the permission check (limit → result)
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 2 }]),
          }),
        }),
      });
      const service = new MenusService({ db } as any);
      await expect(service.create({ name: 'System', title: 'System', type: 'M', path: '/system', permission: 'system:list' }, 1)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates a menu successfully', async () => {
      const { db } = mockDb();
      db.select = sel([{ id: 1, parentId: 0, name: 'System', title: 'System', type: 'M', path: '/system', component: null, permission: null, icon: 'gear', sort: 0, visible: true, cacheable: false, external: false, status: 'active', deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }]);
      const service = new MenusService({ db } as any);
      await expect(service.update(1, { name: 'Updated' }, 1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDb();
      db.select = sel([]);
      const service = new MenusService({ db } as any);
      await expect(service.update(999, { name: 'Ghost' }, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes a menu with no children', async () => {
      const { db } = mockDb();
      // findOne + child check = two limit calls
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn()
              .mockResolvedValueOnce([{ id: 1, parentId: 0, name: 'Test', title: 'Test', type: 'M', path: '/test', component: null, permission: null, icon: null, sort: 0, visible: true, cacheable: false, external: false, status: 'active', deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null }])
              .mockResolvedValueOnce([]),
          }),
        }),
      });
      const service = new MenusService({ db } as any);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });

    it('throws BadRequestException when menu has children', async () => {
      const { db } = mockDb();
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn()
              .mockResolvedValueOnce([{ id: 1 }])
              .mockResolvedValueOnce([{ id: 2 }]),
          }),
        }),
      });
      const service = new MenusService({ db } as any);
      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('routes', () => {
    it('returns routes for a super admin', async () => {
      const { db } = mockDb();
      // Two queries: assignments (innerJoin) then menu list (orderBy terminal)
      // query 1: select → from → innerJoin → where → resolves to [{ roleId, isSystem }]
      // query 2: select → from → where → orderBy → orderBy must resolve to []
      const q1Where = vi.fn().mockResolvedValue([{ roleId: 1, isSystem: true }]);
      const q2OrderBy = vi.fn().mockResolvedValue([]);
      const q2Where = vi.fn().mockImplementation(() => ({ orderBy: q2OrderBy, limit: vi.fn().mockResolvedValue([]) }));
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({ where: q1Where }),
          where: q2Where,
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue([]) }) }),
        }),
        innerJoin: vi.fn().mockReturnThis(),
      });
      const service = new MenusService({ db } as any);
      const result = await service.routes(1);
      expect(result).toEqual([]);
    });
  });
});