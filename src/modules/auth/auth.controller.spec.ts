import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

function mockAuthService(): Partial<AuthService> {
  return {
    login: vi.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: '15m',
    }),
    register: vi.fn().mockResolvedValue({
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
    getProfile: vi.fn().mockResolvedValue({
      id: 7,
      username: 'admin',
      displayName: 'Admin',
      email: null,
      phone: null,
      avatar: null,
      deptId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      loginAt: null,
    }),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    changePassword: vi.fn().mockResolvedValue(undefined),
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
      expect(authService.login).toHaveBeenCalledWith(expect.anything(), {
        ip: undefined,
        userAgent: undefined,
      });
    });
  });

  describe('register', () => {
    it('returns tokens on valid registration', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      const result = await controller.register(
        {
          username: 'newuser',
          displayName: 'New User',
          password: 'password123',
        },
        { headers: { 'user-agent': 'test' } },
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(authService.register).toHaveBeenCalledWith(
        {
          username: 'newuser',
          displayName: 'New User',
          password: 'password123',
        },
        { ip: undefined, userAgent: 'test' },
      );
    });
  });

  describe('refresh', () => {
    it('returns new tokens on valid refresh token', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      const result = await controller.refresh({
        refreshToken: 'valid-refresh-token',
      });
      expect(result).toHaveProperty('accessToken');
      expect(authService.refresh).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('throws UnauthorizedException when refresh fails', async () => {
      const authService = mockAuthService();
      (authService.refresh as ReturnType<typeof vi.fn>).mockRejectedValue(
        new UnauthorizedException('刷新令牌无效或已过期'),
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
      const result = await controller.logout({
        refreshToken: 'token-to-revoke',
      });
      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith('token-to-revoke');
    });
  });

  describe('getProfile', () => {
    it('returns current user profile', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      await controller.getProfile({ user: { id: 7 } } as never);
      expect(authService.getProfile).toHaveBeenCalledWith(7);
    });
  });

  describe('updateProfile', () => {
    it('updates profile and returns success', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      const result = await controller.updateProfile(
        { displayName: '张三' },
        { user: { id: 7 } },
      );
      expect(result).toEqual({ success: true });
      expect(authService.updateProfile).toHaveBeenCalledWith(7, {
        displayName: '张三',
      });
    });

    it('forwards avatar to profile update', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      await controller.updateProfile(
        { avatar: '/api/v1/files/1/download' },
        { user: { id: 7 } },
      );
      expect(authService.updateProfile).toHaveBeenCalledWith(7, {
        avatar: '/api/v1/files/1/download',
      });
    });

    it('rejects unsafe avatar urls', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      await expect(
        controller.updateProfile(
          { avatar: 'javascript:alert(1)' } as never,
          { user: { id: 7 } },
        ),
      ).rejects.toThrow();
      expect(authService.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('changes password and returns success', async () => {
      const authService = mockAuthService();
      const controller = new AuthController(authService as AuthService);
      const result = await controller.changePassword(
        { oldPassword: 'old-pass', newPassword: 'new-pass-123' },
        { user: { id: 7 } },
      );
      expect(result).toEqual({ success: true });
      expect(authService.changePassword).toHaveBeenCalledWith(7, {
        oldPassword: 'old-pass',
        newPassword: 'new-pass-123',
      });
    });
  });
});
