import 'dotenv/config';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';

async function run(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const connection = await mysql.createConnection(url);
  const db = drizzle({ client: connection });
  try {
    console.log('[migrate] Running database migrations...');
    await migrate(db, { migrationsFolder: './src/database/migrations' });
    console.log('[migrate] Database migrations completed.');
  } finally {
    await connection.end();
  }
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`[migrate] Failed: ${message}`);
  process.exit(1);
});
