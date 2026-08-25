import 'dotenv/config';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';

async function run(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const connection = await mysql.createConnection(url);
  await migrate(drizzle(connection), { migrationsFolder: 'drizzle' });
  await connection.end();
}
void run();
