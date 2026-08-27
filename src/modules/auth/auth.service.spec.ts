import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

vi.mock('argon2', () => ({
  default: { verify: vi.fn(), hash: vi.fn().mockResolvedValue('hashed'), argon2id: 2 },
  verify: vi.fn(),
  hash: vi.fn().mockResolvedValue('hashed'),
  argon2id: 2,
}));

function mockDb() {
  return { db: { select: vi.fn(), insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 1 }]) }), update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) }) } };
}

function selectWithLimit(result: unknown) {
  const whereFn = vi.fn().mockImplementation(() =>
    Object.assign(Promise.resolve(result), {
      limit: vi.fn().mockResolvedValue(result),
      orderBy: vi.fn().mockResolvedValue(result),
    }),
  );
  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: whereFn,
      orderBy: vi.fn().mockResolvedValue(result),
      innerJoin: vi.fn().mockReturnThis(),
    }),
    innerJoin: vi.fn().mockReturnThis(),
  });
}

function buildConfig() {
  return {
    jwt: {
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      JWT_ISSUER: 'test-issuer',
      JWT_AUDIENCE: 'test-audience',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
    },
  };
}

function buildOnline() {
  return { track: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) };
}

function fakeUser() {
  return {
    id: 1, username: 'admin', passwordHash: 'hash', status: 'active', displayName: 'Admin',
    email: null, phone: null, avatar: null, loginAt: null, loginIp: null, passwordChangedAt: null,
    deptId: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null,
  };
}

describe('AuthService', () => {
  vi.clearAllMocks();

  describe('login', () => {
    it('throws UnauthorizedException when user not found', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new AuthService({ db } as any, buildConfig() as any, buildOnline() as any);
      await expect(service.login({ username: 'nobody', password: 'password123' })).rejects.toThrow(UnauthorizedException);
    });

    it('rejects disabled user', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([{ ...fakeUser(), status: 'disabled' }]);
      const service = new AuthService({ db } as any, buildConfig() as any, buildOnline() as any);
      await expect(service.login({ username: 'disabled', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('tolerates invalid token', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new AuthService({ db } as any, buildConfig() as any, buildOnline() as any);
      await expect(service.logout('invalid')).resolves.toBeUndefined();
    });
  });

  describe('refresh', () => {
    it('throws for invalid token', async () => {
      const { db } = mockDb();
      db.select = selectWithLimit([]);
      const service = new AuthService({ db } as any, buildConfig() as any, buildOnline() as any);
      await expect(service.refresh('invalid')).rejects.toThrow();
    });
  });
});