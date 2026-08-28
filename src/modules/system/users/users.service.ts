import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { roles, userRoles, users } from '../../../database/schema/index';

export type CreateUserInput = {
  username: string;
  displayName: string;
  password: string;
  email?: string | undefined;
  phone?: string | undefined;
  deptId?: number | undefined;
};
export type UpdateUserInput = {
  displayName?: string | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  deptId?: number | null | undefined;
  status?: 'active' | 'disabled' | undefined;
};

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}
  async list(page: number, pageSize: number) {
    const items = await this.database.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        phone: users.phone,
        status: users.status,
        deptId: users.deptId,
        createdAt: users.createdAt,
        loginAt: users.loginAt,
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { items, page, pageSize };
  }
  async create(input: CreateUserInput, actorId: number) {
    const [existing] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, input.username))
      .limit(1);
    if (existing) throw new ConflictException('Username already exists');
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });
    const { password: _password, ...fields } = input;
    const result = await this.database.db.insert(users).values({
      ...withoutUndefined(fields),
      passwordHash,
      createdBy: actorId,
      updatedBy: actorId,
    });
    return { id: Number(result[0].insertId) };
  }
  async update(id: number, input: UpdateUserInput, actorId: number) {
    const result = await this.database.db
      .update(users)
      .set({ ...withoutUndefined(input), updatedBy: actorId })
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
    if (!result[0].affectedRows) throw new NotFoundException('User not found');
  }
  async remove(id: number, actorId: number) {
    const result = await this.database.db
      .update(users)
      .set({ deletedAt: new Date(), updatedBy: actorId })
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
    if (!result[0].affectedRows) throw new NotFoundException('User not found');
  }
  async assignRole(userId: number, roleId: number) {
    const [user] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');
    const [role] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.id, roleId), isNull(roles.deletedAt)))
      .limit(1);
    if (!role) throw new NotFoundException('Role not found');
    await this.database.db
      .insert(userRoles)
      .values({ userId, roleId })
      .onDuplicateKeyUpdate({ set: { roleId } });
  }
}
function withoutUndefined<T extends object>(
  value: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as { [K in keyof T]: Exclude<T[K], undefined> };
}
