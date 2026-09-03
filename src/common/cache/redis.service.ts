/**
 * Redis 封装 —— 基于 Bun 运行时内置的 Bun.RedisClient（不再依赖 ioredis）。
 *
 * 行为与旧版保持一致：
 * - REDIS_URL 未配置时整体静默降级（enabled=false，各方法返回空值）；
 * - 连接错误仅记录 warn，不抛异常；
 * - 对外接口未变（get/set/del/keys/getJson/setJson/ping/dbsize）。
 */
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';

type RedisClient = InstanceType<typeof Bun.RedisClient>;

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClient | null = null;

  constructor(private readonly config: AppConfigService) {}

  get enabled(): boolean {
    return Boolean(this.config.redisUrl);
  }

  private connection(): RedisClient | null {
    if (!this.config.redisUrl) return null;
    if (!this.client) {
      this.client = new Bun.RedisClient(this.config.redisUrl, {
        // 快速失败而非排队堆积：与旧 ioredis maxRetriesPerRequest:1 语义对齐
        maxRetries: 10,
        enableOfflineQueue: true,
      });
      this.client.onclose = (error: Error) =>
        this.logger.warn(`Redis error: ${error.message}`);
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.connection()?.get(key) ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = this.connection();
    if (!client) return;
    if (ttlSeconds !== undefined)
      await client.set(key, value, 'EX', ttlSeconds);
    else await client.set(key, value);
  }

  async del(...keys: string[]): Promise<void> {
    const client = this.connection();
    if (!client || keys.length === 0) return;
    await client.del(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.connection()?.keys(pattern) ?? [];
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async ping(): Promise<boolean> {
    const client = this.connection();
    if (!client) return false;
    try {
      return (await client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async dbsize(): Promise<number | null> {
    const client = this.connection();
    if (!client) return null;
    try {
      return await client.dbsize();
    } catch {
      return null;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}
