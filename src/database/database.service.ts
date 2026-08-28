import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { AppConfigService } from '../config/app-config.service';
import { relations } from './schema/index';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly pool;
  readonly db: MySql2Database<typeof relations>;
  constructor(config: AppConfigService) {
    this.pool = mysql.createPool(config.databaseUrl);
    this.db = drizzle({ client: this.pool, relations });
  }
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
