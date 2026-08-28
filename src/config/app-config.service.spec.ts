import { describe, expect, it, vi } from 'vitest';

describe('AppConfigService', () => {
  it('fails fast when secrets are unsafe', { timeout: 30000 }, async () => {
    vi.resetModules();
    process.env = {
      ...process.env,
      DATABASE_URL: 'mysql://localhost:3306/app',
      JWT_ISSUER: 'app',
      JWT_AUDIENCE: 'web',
      JWT_ACCESS_SECRET: 'short',
      JWT_REFRESH_SECRET: 'short',
    };
    const { AppConfigService } = await import('./app-config.service');
    expect(() => new AppConfigService()).toThrow();
  });
});
