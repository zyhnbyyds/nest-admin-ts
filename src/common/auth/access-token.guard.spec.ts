import { describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard.js';

function buildReflector(isPublic = false, permissions: string[] = []) {
  const getAllAndOverride = vi.fn((key: symbol) => {
    const keyStr = key.toString();
    if (keyStr.includes('isPublic')) return isPublic;
    if (keyStr.includes('requiredPermissions')) return permissions;
    return undefined;
  });
  return { getAllAndOverride } as unknown as Reflector;
}

function buildConfig() {
  return { jwt: { JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_ISSUER: 'test-issuer', JWT_AUDIENCE: 'test-audience' } };
}

function buildContext(authHeader?: string) {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue({
        headers: { authorization: authHeader },
        user: undefined,
      }),
    }),
  } as any;
}

describe('AccessTokenGuard', () => {
  it('allows public routes without token', async () => {
    const guard = new AccessTokenGuard(buildReflector(true), buildConfig() as any);
    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
  });

  it('throws UnauthorizedException when no token provided', async () => {
    const guard = new AccessTokenGuard(buildReflector(), buildConfig() as any);
    await expect(guard.canActivate(buildContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for malformed token', async () => {
    const guard = new AccessTokenGuard(buildReflector(), buildConfig() as any);
    await expect(guard.canActivate(buildContext('Bearer bad-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when permissions required but missing', async () => {
    const guard = new AccessTokenGuard(buildReflector(false, ['system:admin']), buildConfig() as any);
    await expect(guard.canActivate(buildContext('Bearer bad-token'))).rejects.toThrow(UnauthorizedException);
  });
});