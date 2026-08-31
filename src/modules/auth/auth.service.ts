import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service';
import { DatabaseService } from '../../database/database.service';
import {
  loginLogs,
  menus,
  refreshTokens,
  roleMenus,
  roles,
  userRoles,
  users,
} from '../../database/schema/index';
import { OnlineService } from '../monitor/online/online.service';

type LoginInput = { username: string; password: string };
type RegisterInput = {
  username: string;
  displayName: string;
  password: string;
  email?: string | undefined;
  phone?: string | undefined;
};
type UpdateProfileInput = {
  displayName?: string | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
};
type ChangePasswordInput = {
  oldPassword: string;
  newPassword: string;
};
type LoginMeta = { ip?: string | undefined; userAgent?: string | undefined };
type Claims = {
  sub: string;
  username: string;
  permissions: string[];
  roles: string[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: AppConfigService,
    private readonly online: OnlineService,
  ) {}

  /** 注册新用户（默认分配普通用户角色，注册成功后直接登录） */
  async register(
    input: RegisterInput,
    meta: LoginMeta = {},
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: string;
  }> {
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
    });
    const userId = Number(result[0].insertId);

    // 分配默认角色（普通用户），不存在时静默跳过
    const [defaultRole] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, 'user'))
      .limit(1);
    if (defaultRole) {
      await this.database.db
        .insert(userRoles)
        .values({ userId, roleId: defaultRole.id });
    }

    await this.recordLogin({
      userId,
      username: input.username,
      ip: meta.ip,
      userAgent: meta.userAgent,
      status: 'success',
      message: 'registered',
    });
    const tokens = await this.issueTokens(userId, input.username);
    await this.online.track(
      {
        userId,
        username: input.username,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        loginAt: new Date().toISOString(),
      },
      durationSeconds(this.config.jwt.JWT_REFRESH_TTL),
    );
    return tokens;
  }

  /** 更新当前登录用户的个人资料 */
  async updateProfile(
    userId: number,
    input: UpdateProfileInput,
  ): Promise<void> {
    const [user] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw new UnauthorizedException('User not found');
    await this.database.db
      .update(users)
      .set({ ...withoutUndefined(input), updatedBy: userId })
      .where(eq(users.id, userId));
  }

  /** 修改当前登录用户的密码（需校验旧密码） */
  async changePassword(
    userId: number,
    input: ChangePasswordInput,
  ): Promise<void> {
    const [user] = await this.database.db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user || !(await argon2.verify(user.passwordHash, input.oldPassword)))
      throw new UnauthorizedException('Old password is incorrect');
    const passwordHash = await argon2.hash(input.newPassword, {
      type: argon2.argon2id,
    });
    await this.database.db
      .update(users)
      .set({
        passwordHash,
        passwordChangedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(users.id, userId));
  }

  async login(
    input: LoginInput,
    meta: LoginMeta = {},
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: string;
  }> {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(and(eq(users.username, input.username), isNull(users.deletedAt)))
      .limit(1);
    if (
      !user ||
      user.status !== 'active' ||
      !(await argon2.verify(user.passwordHash, input.password))
    ) {
      await this.recordLogin({
        userId: user?.id,
        username: input.username,
        ip: meta.ip,
        userAgent: meta.userAgent,
        status: 'failure',
        message: 'Invalid username or password',
      });
      throw new UnauthorizedException('Invalid username or password');
    }
    await this.recordLogin({
      userId: user.id,
      username: user.username,
      ip: meta.ip,
      userAgent: meta.userAgent,
      status: 'success',
    });
    const tokens = await this.issueTokens(user.id, user.username);
    await this.online.track(
      {
        userId: user.id,
        username: user.username,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        loginAt: new Date().toISOString(),
      },
      durationSeconds(this.config.jwt.JWT_REFRESH_TTL),
    );
    return tokens;
  }

  async logout(rawToken: string): Promise<void> {
    let userId: number | undefined;
    try {
      const secret = new TextEncoder().encode(
        this.config.jwt.JWT_REFRESH_SECRET,
      );
      const { payload } = await jwtVerify(rawToken, secret, {
        issuer: this.config.jwt.JWT_ISSUER,
        audience: this.config.jwt.JWT_AUDIENCE,
      });
      const candidate = Number(payload.sub);
      if (Number.isSafeInteger(candidate)) userId = candidate;
    } catch {
      /* an invalid refresh token is tolerated on logout */
    }
    const [stored] = await this.database.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(rawToken)))
      .limit(1);
    if (stored && stored.revokedAt === null)
      await this.database.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, stored.id));
    if (userId !== undefined) await this.online.remove(userId);
  }

  private async recordLogin(entry: {
    userId?: number | null | undefined;
    username: string;
    ip?: string | undefined;
    userAgent?: string | undefined;
    status: 'success' | 'failure';
    message?: string | undefined;
  }): Promise<void> {
    try {
      await this.database.db.insert(loginLogs).values({
        userId: entry.userId ?? null,
        username: entry.username,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        status: entry.status,
        message: entry.message ?? null,
      });
    } catch {
      /* best-effort audit logging */
    }
  }

  async refresh(rawToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: string;
  }> {
    const secret = new TextEncoder().encode(this.config.jwt.JWT_REFRESH_SECRET);
    const { payload } = await jwtVerify(rawToken, secret, {
      issuer: this.config.jwt.JWT_ISSUER,
      audience: this.config.jwt.JWT_AUDIENCE,
    });
    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId)) throw new UnauthorizedException();
    const [stored] = await this.database.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, hashToken(rawToken)),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .limit(1);
    if (!stored || stored.expiresAt <= new Date())
      throw new UnauthorizedException();
    await this.database.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id));
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user || user.status !== 'active') throw new UnauthorizedException();
    return this.issueTokens(user.id, user.username);
  }

  private async issueTokens(
    userId: number,
    username: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: string;
  }> {
    const claims = await this.getClaims(userId, username);
    const accessToken = await this.sign(
      claims,
      this.config.jwt.JWT_ACCESS_SECRET,
      this.config.jwt.JWT_ACCESS_TTL,
    );
    const refreshToken = await this.sign(
      { sub: claims.sub },
      this.config.jwt.JWT_REFRESH_SECRET,
      this.config.jwt.JWT_REFRESH_TTL,
    );
    await this.database.db.insert(refreshTokens).values({
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(
        Date.now() + durationMs(this.config.jwt.JWT_REFRESH_TTL),
      ),
    });
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.jwt.JWT_ACCESS_TTL,
    };
  }

  private async getClaims(userId: number, username: string): Promise<Claims> {
    const assignments = await this.database.db
      .select({ key: roles.key, isSystem: roles.isSystem })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    const permissions = await this.database.db
      .select({ permission: menus.permission })
      .from(userRoles)
      .innerJoin(roleMenus, eq(userRoles.roleId, roleMenus.roleId))
      .innerJoin(menus, eq(roleMenus.menuId, menus.id))
      .where(eq(userRoles.userId, userId));
    const isSuperAdmin = assignments.some(
      (item) => item.isSystem || item.key === 'admin',
    );
    const resolved = isSuperAdmin
      ? ['*:*:*']
      : permissions.flatMap((item) =>
          item.permission ? [item.permission] : [],
        );
    return {
      sub: String(userId),
      username,
      roles: assignments.map((item) => item.key),
      permissions: resolved,
    };
  }

  private async sign(
    payload: Record<string, unknown>,
    secret: string,
    expiresIn: string,
  ): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(this.config.jwt.JWT_ISSUER)
      .setAudience(this.config.jwt.JWT_AUDIENCE)
      .setExpirationTime(expiresIn)
      .sign(new TextEncoder().encode(secret));
  }
}

function withoutUndefined<T extends object>(
  value: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as { [K in keyof T]: Exclude<T[K], undefined> };
}
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
function durationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 86_400_000;
  const amount = Number(match[1]);
  return (
    amount *
    { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
      match[2] as 's' | 'm' | 'h' | 'd'
    ]
  );
}
function durationSeconds(value: string): number {
  return Math.floor(durationMs(value) / 1000);
}
