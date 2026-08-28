import { describe, expect, it, vi } from 'vitest';
import { OnlineService } from './online.service';

function mockDb() {
  return { db: { select: vi.fn(), update: vi.fn() } };
}

function mockRedis() {
  return {
    setJson: vi.fn().mockResolvedValue(undefined),
    getJson: vi.fn().mockResolvedValue(null),
    keys: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(undefined),
  };
}

describe('OnlineService', () => {
  describe('track', () => {
    it('stores session in redis', async () => {
      const redis = mockRedis();
      const { db } = mockDb();
      const service = new OnlineService(redis as any, { db } as any);
      await service.track(
        {
          userId: 1,
          username: 'admin',
          ip: '127.0.0.1',
          userAgent: 'test',
          loginAt: new Date().toISOString(),
        },
        3600,
      );
      expect(redis.setJson).toHaveBeenCalledOnce();
    });
  });

  describe('list', () => {
    it('returns all online sessions', async () => {
      const redis = mockRedis();
      const { db } = mockDb();
      redis.keys.mockResolvedValue(['online:1']);
      redis.getJson.mockResolvedValue({
        userId: 1,
        username: 'admin',
        ip: '127.0.0.1',
        userAgent: null,
        loginAt: new Date().toISOString(),
      });
      const service = new OnlineService(redis as any, { db } as any);
      const result = await service.list();
      expect(result).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('removes session from redis', async () => {
      const redis = mockRedis();
      const { db } = mockDb();
      const service = new OnlineService(redis as any, { db } as any);
      await service.remove(1);
      expect(redis.del).toHaveBeenCalledWith('online:1');
    });
  });

  describe('forceLogout', () => {
    it('removes session and revokes refresh tokens', async () => {
      const redis = mockRedis();
      const { db } = mockDb();
      db.update = vi
        .fn()
        .mockReturnValue({
          set: vi
            .fn()
            .mockReturnValue({
              where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            }),
        });
      const service = new OnlineService(redis as any, { db } as any);
      await expect(service.forceLogout(1)).resolves.toBeUndefined();
      expect(redis.del).toHaveBeenCalledWith('online:1');
    });
  });
});
