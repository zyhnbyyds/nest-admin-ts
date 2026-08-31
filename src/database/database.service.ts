import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { AppConfigService } from '../config/app-config.service';
import { relations } from './schema/index';

/** mysql2/promise 的 'connection' 事件暴露的是底层回调式连接 */
type RawPoolConnection = {
  query: (sql: string, callback?: (error: Error | null) => void) => unknown;
};

/**
 * 数据库连接。
 *
 * 时间处理：统一将连接会话时区设为 UTC，并把 mysql2 的日期解析时区设为
 * 'Z'（UTC）。drizzle 的 timestamp/datetime 列在写 Date 时都用
 * Date.toISOString()（UTC 墙钟）生成字符串，MySQL 需在 UTC 会话下按 UTC
 * 解释这些值、defaultNow() 也返回 UTC 墙钟，读回再按 UTC 解析，三者对齐
 * 才能避免 8 小时偏差。前端展示层统一转东八区（见 web/src/composables/useFormat.ts）。
 */
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  readonly pool;
  readonly db: MySql2Database<typeof relations>;
  constructor(config: AppConfigService) {
    this.pool = mysql.createPool({
      uri: config.databaseUrl,
      timezone: 'Z',
    });
    // promise 版的 Pool 类型未暴露底层 'connection' 事件，这里显式断言
    (
      this.pool as unknown as {
        on: (event: 'connection', cb: (conn: RawPoolConnection) => void) => unknown;
      }
    ).on('connection', (conn) => {
      conn.query("SET time_zone = '+00:00'", (error) => {
        if (error) this.logger.warn(`设置会话时区失败: ${String(error)}`);
      });
    });
    this.db = drizzle({ client: this.pool, relations });
  }
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
