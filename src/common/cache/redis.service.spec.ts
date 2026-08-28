import { describe, expect, it, vi } from 'vitest';
import { RedisService } from './redis.service';

vi.mock('ioredis', () => {
  const MockRedis = vi.fn();
  const mockInstance = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    ping: vi.fn().mockResolvedValue('PONG'),
    dbsize: vi.fn().mockResolvedValue(0),
    disconnect: vi.fn(),
    on: vi.fn(),
  };
  MockRedis.mockImplementation(() => mockInstance);
  return { default: MockRedis };
});

function buildConfig(redisUrl?: string) {
  return { redisUrl };
}

describe('RedisService', () => {
  it('enabled is true when redis URL configured', () => {
    const s = new RedisService(buildConfig('redis://localhost:6379') as any);
    expect(s.enabled).toBe(true);
  });

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
