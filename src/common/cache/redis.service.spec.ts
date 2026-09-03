import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * RedisService 底层为 Bun.RedisClient（Bun 运行时全局对象）。
 * 单测运行在 vitest node 池中，无 Bun 全局 —— 配置了连接时会走到
 * `new Bun.RedisClient`，因此通过 vi.stubGlobal 注入 mock 客户端；
 * 未配置 REDIS_URL 的路径不触碰 Bun，保持原样。
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
  let instances = 0;
  const constructArgs: Array<[string, object | undefined]> = [];
  // 必须用 function/class（而非箭头函数）才能被 `new Bun.RedisClient(...)` 调用
  function MockRedisClient(this: unknown, url: string, options?: object) {
    instances += 1;
    constructArgs.push([url, options]);
    return client;
  }
  return {
    client,
    MockRedisClient,
    get instances() {
      return instances;
    },
    get constructArgs() {
      return constructArgs;
    },
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

  describe('已配置 REDIS_URL（Bun.RedisClient mock）', () => {
    let bun: ReturnType<typeof mockBunRedisClient>;

    beforeEach(() => {
      bun = mockBunRedisClient();
      vi.stubGlobal('Bun', { RedisClient: bun.MockRedisClient });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('enabled is true when redis URL configured', () => {
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      expect(s.enabled).toBe(true);
    });

    it('lazily creates a Bun.RedisClient on first command', async () => {
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      expect(bun.instances).toBe(0);
      await s.set('k', 'v');
      expect(bun.instances).toBe(1);
      expect(bun.constructArgs[0]).toEqual([
        'redis://localhost:6379',
        { maxRetries: 1, enableOfflineQueue: false },
      ]);
    });

    it('set with ttl passes EX seconds', async () => {
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await s.set('k', 'v', 60);
      expect(bun.client.set).toHaveBeenCalledWith('k', 'v', 'EX', 60);
    });

    it('set without ttl passes plain args', async () => {
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await s.set('k', 'v');
      expect(bun.client.set).toHaveBeenCalledWith('k', 'v');
    });

    it('get / del / keys forward to client', async () => {
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await s.get('k');
      await s.del('a', 'b');
      await s.keys('online:*');
      expect(bun.client.get).toHaveBeenCalledWith('k');
      expect(bun.client.del).toHaveBeenCalledWith('a', 'b');
      expect(bun.client.keys).toHaveBeenCalledWith('online:*');
    });

    it('getJson parses stored JSON and returns null on garbage', async () => {
      bun.client.get.mockResolvedValue('{"a":1}');
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await expect(s.getJson('k')).resolves.toEqual({ a: 1 });
      bun.client.get.mockResolvedValue('not-json');
      await expect(s.getJson('k')).resolves.toBeNull();
    });

    it('setJson stringifies value', async () => {
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await s.setJson('k', { a: 1 }, 30);
      expect(bun.client.set).toHaveBeenCalledWith('k', '{"a":1}', 'EX', 30);
    });

    it('ping returns true when PONG', async () => {
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await expect(s.ping()).resolves.toBe(true);
    });

    it('ping returns false when client throws', async () => {
      bun.client.ping.mockRejectedValue(new Error('down'));
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await expect(s.ping()).resolves.toBe(false);
    });

    it('dbsize returns number when client ok', async () => {
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await expect(s.dbsize()).resolves.toBe(0);
    });

    it('attaches onclose error handler to log warn', async () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await s.ping(); // triggers connection creation
      bun.client.onclose?.(new Error('boom'));
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('reuses the same client across calls', async () => {
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await s.get('a');
      await s.get('b');
      expect(bun.instances).toBe(1);
    });

    it('onApplicationShutdown closes the client', async () => {
      const s = new RedisService(buildConfig('redis://localhost:6379') as any);
      await s.ping(); // ensure client exists
      await s.onApplicationShutdown();
      expect(bun.client.close).toHaveBeenCalled();
    });
  });
});
