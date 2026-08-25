import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../config/app-config.service.js';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: AppConfigService) {}

  get enabled(): boolean { return Boolean(this.config.redisUrl); }

  private connection(): Redis | null {
    if (!this.config.redisUrl) return null;
    if (!this.client) {
      this.client = new Redis(this.config.redisUrl, { maxRetriesPerRequest: 1 });
      this.client.on('error', (error: Error) => this.logger.warn(`Redis error: ${error.message}`));
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.connection()?.get(key) ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = this.connection();
    if (!client) return;
    if (ttlSeconds !== undefined) await client.set(key, value, 'EX', ttlSeconds);
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
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async ping(): Promise<boolean> {
    const client = this.connection();
    if (!client) return false;
    try { return (await client.ping()) === 'PONG'; } catch { return false; }
  }

  async dbsize(): Promise<number | null> {
    const client = this.connection();
    if (!client) return null;
    try { return await client.dbsize(); } catch { return null; }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client) { this.client.disconnect(); this.client = null; }
  }
}
