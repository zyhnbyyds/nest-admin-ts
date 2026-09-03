import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

vi.mock('../../../common/password/password.service', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

/** Returns { db: { select, insert, update, delete } } — the shape DatabaseService expects. */
function mockDbService() {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 42 }]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      }),
    },
  };
}

describe('UsersService', () => {
  describe('list', () => {
    it('returns paginated users with roles', async () => {
      const { db } = mockDbService();
      // 第一次 select：用户列表（leftJoin 部门联查）
      // 第二次 select：fetchRoleMap 查询角色（innerJoin 链）
      (db as any).select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([
                      {
                        id: 1,
                        username: 'admin',
                        displayName: 'Admin',
                        email: null,
                        phone: null,
                        status: 'active',
                        deptId: null,
                        deptName: null,
                        createdAt: new Date(),
                        loginAt: null,
                      },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi
                .fn()
                .mockResolvedValue([{ userId: 1, id: 1, name: 'admin' }]),
            }),
          }),
        });
      const service = new UsersService({ db } as any);
      const result = await service.list(1, 20);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        roleIds: [1],
        roleNames: ['admin'],
      });
      expect(result.page).toBe(1);
    });

    it('lists users with dept filter and super admin actor', async () => {
      const { db } = mockDbService();
      (db as any).select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([
                      {
                        id: 2,
                        username: 'editor',
                        displayName: 'Editor',
                        email: null,
                        phone: null,
                        status: 'active',
                        deptId: 3,
                        deptName: '研发部',
                        createdAt: new Date(),
                        loginAt: null,
                      },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { userId: 2, id: 2, name: 'editor' },
              ]),
            }),
          }),
        });
      const service = new UsersService({ db } as any);
      const result = await service.list(1, 20, {
        deptId: 3,
        actor: { id: 9, roles: ['admin'], permissions: ['*:*:*'] },
      });
      expect(result.items[0]).toMatchObject({ deptName: '研发部', deptId: 3 });
    });
  });

  describe('create', () => {
    it('creates a user successfully', async () => {
      const { db, _ } = mockDbService();
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      const service = new UsersService({ db } as any);
      const result = await service.create(
        {
          username: 'newuser',
          displayName: 'New User',
          password: 'password123456',
        },
        1,
      );
      expect(result).toEqual({ id: 42 });
    });

    it('throws ConflictException when username exists', async () => {
      const { db } = mockDbService();
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      });
      const service = new UsersService({ db } as any);
      await expect(
        service.create(
          {
            username: 'existing',
            displayName: 'Existing',
            password: 'password123456',
          },
          1,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates a user successfully', async () => {
      const { db } = mockDbService();
      const service = new UsersService({ db } as any);
      await expect(
        service.update(1, { displayName: 'Updated' }, 1),
      ).resolves.toEqual({ id: 1, success: true });
    });

    it('updates password when provided', async () => {
      const { db } = mockDbService();
      const service = new UsersService({ db } as any);
      await expect(
        service.update(1, { password: 'newpassword123' }, 1),
      ).resolves.toEqual({ id: 1, success: true });
      expect(db.update).toHaveBeenCalled();
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDbService();
      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ affectedRows: 0 }]),
        }),
      });
      const service = new UsersService({ db } as any);
      await expect(
        service.update(999, { displayName: 'Ghost' }, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes a user', async () => {
      const { db } = mockDbService();
      const service = new UsersService({ db } as any);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException', async () => {
      const { db } = mockDbService();
      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ affectedRows: 0 }]),
        }),
      });
      const service = new UsersService({ db } as any);
      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRole', () => {
    it('assigns a role to a user', async () => {
      const { db } = mockDbService();
      // 第一次 select：查已有 userRoles（空）
      // 第二次 select：查有效角色
      db.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 2 }]),
          }),
        });
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      });
      const service = new UsersService({ db } as any);
      await expect(service.assignRole(1, 2)).resolves.toBeUndefined();
      expect(db.insert).toHaveBeenCalled();
    });

    it('skips invalid role', async () => {
      const { db } = mockDbService();
      db.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ affectedRows: 0 }]),
      });
      const service = new UsersService({ db } as any);
      await expect(service.assignRole(999, 2)).resolves.toBeUndefined();
      expect(db.insert).not.toHaveBeenCalled();
    });
  });
});
