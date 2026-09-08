import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import {
  RedisService,
  type RedisClient,
  type RedisClientOptions,
} from './redis.service';

/**
 * RedisService 底层为 Bun.RedisClient（Bun 运行时全局对象）。
 * Bun 全局在 Bun 原生运行器（bun test）下只读、无法替换，vitest（node 池）
 * 下又不存在——因此不依赖 vi.stubGlobal / 全局替换，而是覆写受保护的
 * createClient() 注入 mock 客户端，vitest 与 bun test 均可运行；
 * 未配置 REDIS_URL 的路径不触碰客户端创建，保持原样。
 */

function buildConfig(redisUrl?: string) {
  return { redisUrl };
}

function mockBunRedisClient() {
  const client = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    ping: vi.fn().mockResolvedValue('PONG'),
    dbsize: vi.fn().mockResolvedValue(0),
    close: vi.fn(),
    onclose: null as ((error: Error) => void) | null,
  };
  return {
    client,
    createCount: 0,
    constructArgs: [] as Array<[string, RedisClientOptions | undefined]>,
  };
}

describe('RedisService', () => {
  describe('未配置 REDIS_URL', () => {
    it('enabled is false when no redis URL', () => {
      const s = new RedisService(buildConfig(undefined) as any);
      expect(s.enabled).toBe(false);
    });

    it('get returns null when redis not configured', async () => {
      const s = new RedisService(buildConfig(undefined) as any);
      expect(await s.get('key')).toBeNull();
    });

    it('ping returns false when redis not configured', async () => {
      const s = new RedisService(buildConfig(undefined) as any);
      expect(await s.ping()).toBe(false);
    });

    it('dbsize returns null when redis not configured', async () => {
      const s = new RedisService(buildConfig(undefined) as any);
      expect(await s.dbsize()).toBeNull();
    });

    it('keys returns empty array when redis not configured', async () => {
      const s = new RedisService(buildConfig(undefined) as any);
      expect(await s.keys('*')).toEqual([]);
    });

    it('del does nothing when redis not configured', async () => {
      const s = new RedisService(buildConfig(undefined) as any);
      await expect(s.del('key')).resolves.toBeUndefined();
    });
  });

  describe('已配置 REDIS_URL（createClient mock）', () => {
    let bun: ReturnType<typeof mockBunRedisClient>;

    beforeEach(() => {
      bun = mockBunRedisClient();
    });

    /** 覆写 createClient 注入 mock 客户端，并记录创建次数与构造参数 */
    function makeService(redisUrl = 'redis://localhost:6379') {
      class MockedRedisService extends RedisService {
        protected override createClient(
          url: string,
          options?: RedisClientOptions,
        ) {
          bun.createCount += 1;
          bun.constructArgs.push([url, options]);
          return bun.client as unknown as RedisClient;
        }
      }
      return new MockedRedisService(buildConfig(redisUrl) as any);
    }

    it('enabled is true when redis URL configured', () => {
      const s = makeService();
      expect(s.enabled).toBe(true);
    });

    it('lazily creates a Bun.RedisClient on first command', async () => {
      const s = makeService();
      expect(bun.createCount).toBe(0);
      await s.set('k', 'v');
      expect(bun.createCount).toBe(1);
      expect(bun.constructArgs[0]).toEqual([
        'redis://localhost:6379',
        { maxRetries: 1, enableOfflineQueue: false },
      ]);
    });

    it('set with ttl passes EX seconds', async () => {
      const s = makeService();
      await s.set('k', 'v', 60);
      expect(bun.client.set).toHaveBeenCalledWith('k', 'v', 'EX', 60);
    });

    it('set without ttl passes plain args', async () => {
      const s = makeService();
      await s.set('k', 'v');
      expect(bun.client.set).toHaveBeenCalledWith('k', 'v');
    });

    it('get / del / keys forward to client', async () => {
      const s = makeService();
      await s.get('k');
      await s.del('a', 'b');
      await s.keys('online:*');
      expect(bun.client.get).toHaveBeenCalledWith('k');
      expect(bun.client.del).toHaveBeenCalledWith('a', 'b');
      expect(bun.client.keys).toHaveBeenCalledWith('online:*');
    });

    it('getJson parses stored JSON and returns null on garbage', async () => {
      bun.client.get.mockResolvedValue('{"a":1}');
      const s = makeService();
      await expect(s.getJson('k')).resolves.toEqual({ a: 1 });
      bun.client.get.mockResolvedValue('not-json');
      await expect(s.getJson('k')).resolves.toBeNull();
    });

    it('setJson stringifies value', async () => {
      const s = makeService();
      await s.setJson('k', { a: 1 }, 30);
      expect(bun.client.set).toHaveBeenCalledWith('k', '{"a":1}', 'EX', 30);
    });

    it('ping returns true when PONG', async () => {
      const s = makeService();
      await expect(s.ping()).resolves.toBe(true);
    });

    it('ping returns false when client throws', async () => {
      bun.client.ping.mockRejectedValue(new Error('down'));
      const s = makeService();
      await expect(s.ping()).resolves.toBe(false);
    });

    it('dbsize returns number when client ok', async () => {
      const s = makeService();
      await expect(s.dbsize()).resolves.toBe(0);
    });

    it('attaches onclose error handler to log warn', async () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      const s = makeService();
      await s.ping(); // triggers connection creation
      bun.client.onclose?.(new Error('boom'));
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('reuses the same client across calls', async () => {
      const s = makeService();
      await s.get('a');
      await s.get('b');
      expect(bun.createCount).toBe(1);
    });

    it('onApplicationShutdown closes the client', async () => {
      const s = makeService();
      await s.ping(); // ensure client exists
      await s.onApplicationShutdown();
      expect(bun.client.close).toHaveBeenCalled();
    });
  });
});
