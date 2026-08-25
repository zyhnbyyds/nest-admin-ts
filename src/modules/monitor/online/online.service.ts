import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  ONLINE_SESSION_PREFIX,
  onlineSessionKey,
} from '../../../common/cache/cache-keys.js';
import { RedisService } from '../../../common/cache/redis.service.js';
import { DatabaseService } from '../../../database/database.service.js';
import { refreshTokens } from '../../../database/schema/index.js';

export type OnlineSession = {
  userId: number;
  username: string;
  ip: string | null;
  userAgent: string | null;
  loginAt: string;
};

@Injectable()
export class OnlineService {
  constructor(
    private readonly redis: RedisService,
    private readonly database: DatabaseService,
  ) {}

  async track(session: OnlineSession, ttlSeconds: number): Promise<void> {
    await this.redis.setJson(
      onlineSessionKey(session.userId),
      session,
      ttlSeconds,
    );
  }

  async list(): Promise<OnlineSession[]> {
    const keys = await this.redis.keys(`${ONLINE_SESSION_PREFIX}*`);
    const sessions: OnlineSession[] = [];
    for (const key of keys) {
      const session = await this.redis.getJson<OnlineSession>(key);
      if (session) sessions.push(session);
    }
    return sessions;
  }

  async remove(userId: number): Promise<void> {
    await this.redis.del(onlineSessionKey(userId));
  }

  async forceLogout(userId: number): Promise<void> {
    await this.remove(userId);
    await this.database.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }
}
