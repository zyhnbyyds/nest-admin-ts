import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

vi.mock('argon2', () => ({
  default: {
    verify: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('hashed'),
    argon2id: 2,
  },
  verify: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue('hashed'),
  argon2id: 2,
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
    it('returns paginated users', async () => {
      const { db } = mockDbService();
      // For list: select({...}).from(users).where(...).orderBy(...).limit(...).offset(...)
      // We need: select() -> from() -> where() -> orderBy() -> limit() -> offset()
      (db as any).select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
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
                    createdAt: new Date(),
                    loginAt: null,
                  },
                ]),
              }),
            }),
          }),
        }),
      });
      const service = new UsersService({ db } as any);
      const result = await service.list(1, 20);
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
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
      ).resolves.toBeUndefined();
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
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      });
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onDuplicateKeyUpdate: vi.fn().mockReturnValue({
            set: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
          }),
        }),
      });
      const service = new UsersService({ db } as any);
      await expect(service.assignRole(1, 2)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when user not found', async () => {
      const { db } = mockDbService();
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      const service = new UsersService({ db } as any);
      await expect(service.assignRole(999, 2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
