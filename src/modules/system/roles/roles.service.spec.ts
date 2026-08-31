import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';

function mockDb() {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 10 }]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      }),
      transaction: vi
        .fn()
        .mockImplementation(async (cb: (tx: any) => Promise<void>) => {
          await cb({
            delete: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
              }),
            }),
          });
        }),
    },
  };
}

/**
 * Build a select mock that handles:
 *  - .select().from().where().limit()     → resolves limit to result
 *  - .select().from().where()             → resolves where to result
 *  - .select().from().where().orderBy()   → resolves orderBy to result
 */
function selectMock(result: unknown) {
  // where() returns a promise (for terminal await) that also has .limit() and .orderBy() for chaining
  const whereFn = vi.fn().mockImplementation(() =>
    Object.assign(Promise.resolve(result), {
      limit: vi.fn().mockResolvedValue(result),
      orderBy: vi.fn().mockResolvedValue(result),
    }),
  );

  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: whereFn,
      orderBy: vi.fn().mockReturnValue({
        limit: vi
          .fn()
          .mockReturnValue({ offset: vi.fn().mockResolvedValue(result) }),
      }),
      innerJoin: vi.fn().mockReturnThis(),
    }),
    innerJoin: vi.fn().mockReturnThis(),
  });
}

describe('RolesService', () => {
  describe('list', () => {
    it('returns all roles sorted', async () => {
      const { db } = mockDb();
      const roleRows = [
        {
          id: 1,
          name: 'Admin',
          key: 'admin',
          sort: 0,
          dataScope: 'all',
          status: 'active',
          isSystem: true,
          remark: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
        },
      ];
      db.select = selectMock(roleRows);
      const service = new RolesService({ db } as any);
      const result = await service.list();
      expect(result).toEqual([{ ...roleRows[0], deptIds: [] }]);
    });

    it('attaches custom data scope dept ids to each role', async () => {
      const { db } = mockDb();
      const roleRows = [
        {
          id: 1,
          name: 'Editor',
          key: 'editor',
          sort: 0,
          dataScope: 'custom',
          status: 'active',
          isSystem: false,
          remark: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
        },
      ];
      db.select = vi
        .fn()
        .mockReturnValueOnce({
          // list() 查询：where().orderBy() 链式结束
          from: vi.fn().mockReturnValue({
            where: vi.fn(() =>
              Object.assign(Promise.resolve(roleRows), {
                orderBy: vi.fn().mockResolvedValue(roleRows),
              }),
            ),
          }),
        })
        .mockReturnValueOnce({
          // fetchDeptMap 查询：where() 直接结束
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { roleId: 1, deptId: 2 },
              { roleId: 1, deptId: 3 },
              { roleId: 1, deptId: 2 },
            ]),
          }),
        });
      const service = new RolesService({ db } as any);
      const result = await service.list();
      expect(result).toEqual([{ ...roleRows[0], deptIds: [2, 3, 2] }]);
    });
  });

  describe('create', () => {
    it('creates a role successfully', async () => {
      const { db } = mockDb();
      db.select = selectMock([]);
      const service = new RolesService({ db } as any);
      const result = await service.create({ name: 'Editor', key: 'editor' }, 1);
      expect(result).toEqual({ id: 10 });
    });

    it('throws ConflictException when key already exists', async () => {
      const { db } = mockDb();
      db.select = selectMock([{ id: 1 }]);
      const service = new RolesService({ db } as any);
      await expect(
        service.create({ name: 'Admin', key: 'admin' }, 1),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('setMenus', () => {
    it('assigns menus to a role when role exists', async () => {
      const { db } = mockDb();
      // Two sequential queries: role check (limit) and menu check (terminal where)
      // We use selectMock which handles both cases
      db.select = selectMock([{ id: 1 }]);
      const service = new RolesService({ db } as any);
      await expect(service.setMenus(1, [10])).resolves.toBeUndefined();
    });

    it('throws NotFoundException when role does not exist', async () => {
      const { db } = mockDb();
      db.select = selectMock([]);
      const service = new RolesService({ db } as any);
      await expect(service.setMenus(999, [1])).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMenuIds', () => {
    it('returns menu ids for a role', async () => {
      const { db } = mockDb();
      db.select = selectMock([{ menuId: 10 }, { menuId: 20 }]);
      const service = new RolesService({ db } as any);
      const result = await service.getMenuIds(1);
      expect(result).toEqual([10, 20]);
    });
  });

  describe('setDepts', () => {
    it('replaces custom data scope depts for a role', async () => {
      const { db } = mockDb();
      // 角色存在性查询 + 部门存在性查询
      db.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 2 }, { id: 3 }]),
          }),
        });
      const service = new RolesService({ db } as any);
      await expect(service.setDepts(1, [2, 3])).resolves.toBeUndefined();
    });

    it('throws NotFoundException when role does not exist', async () => {
      const { db } = mockDb();
      db.select = selectMock([]);
      const service = new RolesService({ db } as any);
      await expect(service.setDepts(999, [1])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when part of depts do not exist', async () => {
      const { db } = mockDb();
      db.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 2 }]),
          }),
        });
      const service = new RolesService({ db } as any);
      await expect(service.setDepts(1, [2, 99])).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates a role successfully', async () => {
      const { db } = mockDb();
      db.select = selectMock([{ id: 1 }]);
      const service = new RolesService({ db } as any);
      await expect(
        service.update(1, { name: 'Updated' }, 1),
      ).resolves.toBeUndefined();
    });

    it('replaces dept ids when provided on update', async () => {
      const { db } = mockDb();
      // 查询顺序：update 的角色存在性 → setDepts 的角色存在性 → 部门存在性
      db.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 2 }]),
          }),
        });
      const service = new RolesService({ db } as any);
      await expect(
        service.update(1, { name: 'Updated', deptIds: [2] }, 1),
      ).resolves.toBeUndefined();
    });

    it('throws NotFoundException when role not found', async () => {
      const { db } = mockDb();
      db.select = selectMock([]);
      const service = new RolesService({ db } as any);
      await expect(service.update(999, { name: 'Ghost' }, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes a role', async () => {
      const { db } = mockDb();
      db.select = selectMock([{ id: 1 }]);
      const service = new RolesService({ db } as any);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when role not found', async () => {
      const { db } = mockDb();
      db.select = selectMock([]);
      const service = new RolesService({ db } as any);
      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
