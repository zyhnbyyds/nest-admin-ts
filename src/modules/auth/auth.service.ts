import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { menus, refreshTokens, roleMenus, roles, userRoles, users } from '../../database/schema/index.js';

type LoginInput = { username: string; password: string };
type Claims = { sub: string; username: string; permissions: string[]; roles: string[] };

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService, private readonly config: AppConfigService) {}

  async login(input: LoginInput): Promise<{ accessToken: string; refreshToken: string; tokenType: 'Bearer'; expiresIn: string }> {
    const [user] = await this.database.db.select().from(users).where(and(eq(users.username, input.username), isNull(users.deletedAt))).limit(1);
    if (!user || user.status !== 'active' || !(await argon2.verify(user.passwordHash, input.password))) throw new UnauthorizedException('Invalid username or password');
    return this.issueTokens(user.id, user.username);
  }

  async refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string; tokenType: 'Bearer'; expiresIn: string }> {
    const secret = new TextEncoder().encode(this.config.jwt.JWT_REFRESH_SECRET);
    const { payload } = await jwtVerify(rawToken, secret, { issuer: this.config.jwt.JWT_ISSUER, audience: this.config.jwt.JWT_AUDIENCE });
    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId)) throw new UnauthorizedException();
    const [stored] = await this.database.db.select().from(refreshTokens).where(and(eq(refreshTokens.tokenHash, hashToken(rawToken)), isNull(refreshTokens.revokedAt))).limit(1);
    if (!stored || stored.expiresAt <= new Date()) throw new UnauthorizedException();
    await this.database.db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));
    const [user] = await this.database.db.select().from(users).where(and(eq(users.id, userId), isNull(users.deletedAt))).limit(1);
    if (!user || user.status !== 'active') throw new UnauthorizedException();
    return this.issueTokens(user.id, user.username);
  }

  private async issueTokens(userId: number, username: string): Promise<{ accessToken: string; refreshToken: string; tokenType: 'Bearer'; expiresIn: string }> {
    const claims = await this.getClaims(userId, username);
    const accessToken = await this.sign(claims, this.config.jwt.JWT_ACCESS_SECRET, this.config.jwt.JWT_ACCESS_TTL);
    const refreshToken = await this.sign({ sub: claims.sub }, this.config.jwt.JWT_REFRESH_SECRET, this.config.jwt.JWT_REFRESH_TTL);
    await this.database.db.insert(refreshTokens).values({ userId, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + durationMs(this.config.jwt.JWT_REFRESH_TTL)) });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: this.config.jwt.JWT_ACCESS_TTL };
  }

  private async getClaims(userId: number, username: string): Promise<Claims> {
    const assignments = await this.database.db.select({ key: roles.key, isSystem: roles.isSystem }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, userId));
    const permissions = await this.database.db.select({ permission: menus.permission }).from(userRoles).innerJoin(roleMenus, eq(userRoles.roleId, roleMenus.roleId)).innerJoin(menus, eq(roleMenus.menuId, menus.id)).where(eq(userRoles.userId, userId));
    const isSuperAdmin = assignments.some((item) => item.isSystem || item.key === 'admin');
    const resolved = isSuperAdmin ? ['*:*:*'] : permissions.flatMap((item) => item.permission ? [item.permission] : []);
    return { sub: String(userId), username, roles: assignments.map((item) => item.key), permissions: resolved };
  }

  private async sign(payload: Record<string, unknown>, secret: string, expiresIn: string): Promise<string> {
    return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setIssuer(this.config.jwt.JWT_ISSUER).setAudience(this.config.jwt.JWT_AUDIENCE).setExpirationTime(expiresIn).sign(new TextEncoder().encode(secret));
  }
}
function hashToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }
function durationMs(value: string): number { const match = /^(\d+)([smhd])$/.exec(value); if (!match) return 7 * 86_400_000; const amount = Number(match[1]); return amount * ({ s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd']); }
