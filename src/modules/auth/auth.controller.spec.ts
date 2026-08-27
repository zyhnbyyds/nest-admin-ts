import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

function mockAuthService(): Partial<AuthService> {
  return {
    login: vi.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: '15m',
    }),
    refresh: vi.fn().mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      tokenType: 'Bearer',
      expiresIn: '15m',
    }),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

describe('AuthController', () => {
  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      const result = await controller.login(
        { username: 'admin', password: 'password123' },
        { headers: { 'user-agent': 'test' } },
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.tokenType).toBe('Bearer');
    });

    it('forwards ip and userAgent to the service', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      await controller.login(
        { username: 'admin', password: 'password123' },
        {
          ip: '192.168.1.1',
          headers: { 'user-agent': 'Mozilla/5.0' },
        },
      );
      expect(authService.login).toHaveBeenCalledWith(
        { username: 'admin', password: 'password123' },
        { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
      );
    });

    it('handles missing user-agent', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      await controller.login(
        { username: 'admin', password: 'password123' },
        { headers: {} },
      );
      expect(authService.login).toHaveBeenCalledWith(
        expect.anything(),
        { ip: undefined, userAgent: undefined },
      );
    });
  });

  describe('refresh', () => {
    it('returns new tokens on valid refresh token', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      const result = await controller.refresh({ refreshToken: 'valid-refresh-token' });
      expect(result).toHaveProperty('accessToken');
      expect(authService.refresh).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('throws UnauthorizedException when refresh fails', async () => {
      const authService = mockAuthService();
      (authService.refresh as ReturnType<typeof vi.fn>).mockRejectedValue(
        new UnauthorizedException('Refresh token is invalid or expired'),
      );
      const controller = new AuthController(authService as AuthService);
      await expect(
        controller.refresh({ refreshToken: 'bad-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('returns success on logout', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      const result = await controller.logout({ refreshToken: 'token-to-revoke' });
      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith('token-to-revoke');
    });
  });
});