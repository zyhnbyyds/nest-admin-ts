import 'dotenv/config';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { roles, userRoles, users } from '../schema/index.js';

async function seed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!url || !password)
    throw new Error('DATABASE_URL and SEED_ADMIN_PASSWORD are required');
  const pool = mysql.createPool(url);
  const db = drizzle({ client: pool });
  await db
    .insert(roles)
    .values({ name: '超级管理员', key: 'admin', isSystem: true })
    .onDuplicateKeyUpdate({ set: { name: '超级管理员' } });
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.key, 'admin'))
    .limit(1);
  if (!role) throw new Error('Failed to initialize administrator role');
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  await db
    .insert(users)
    .values({ username: 'admin', displayName: '管理员', passwordHash: hash })
    .onDuplicateKeyUpdate({ set: { passwordHash: hash, status: 'active' } });
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, 'admin'))
    .limit(1);
  if (!user) throw new Error('Failed to initialize administrator user');
  await db
    .insert(userRoles)
    .values({ userId: user.id, roleId: role.id })
    .onDuplicateKeyUpdate({ set: { roleId: role.id } });
  await pool.end();
}

void seed();
