import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { AppConfigService } from '../config/app-config.service.js';
import * as schema from './schema/index.js';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly pool;
  readonly db: MySql2Database<typeof schema>;
  constructor(config: AppConfigService) {
    this.pool = mysql.createPool(config.databaseUrl);
    this.db = drizzle(this.pool, { schema, mode: 'default' });
  }
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
