import { describe, expect, it, vi } from 'vitest';
import { CacheController } from './cache.controller.js';

function buildRedis() {
  return {
    enabled: true,
    ping: vi.fn().mockResolvedValue(true),
    dbsize: vi.fn().mockResolvedValue(42),
  };
}

describe('CacheController', () => {
  it('returns cache info', async () => {
    const redis = buildRedis();
    const controller = new CacheController(redis as any);
    const result = await controller.info();
    expect(result).toHaveProperty('enabled', true);
    expect(result).toHaveProperty('connected', true);
    expect(result).toHaveProperty('dbsize', 42);
  });

  it('handles redis disconnection', async () => {
    const redis = buildRedis();
    redis.ping.mockResolvedValue(false);
    const controller = new CacheController(redis as any);
    const result = await controller.info();
    expect(result.connected).toBe(false);
  });
});