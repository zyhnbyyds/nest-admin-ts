import { describe, expect, it } from 'vitest';
import { RiskLevel } from '../ai.types';
import { CapabilityService } from './capability.service';

/** 构造测试用 mock Config */
function buildConfig() {
  return {
    jwt: { JWT_ACCESS_SECRET: 'test-access-secret-1234567890abcdef' },
  };
}

describe('CapabilityService', () => {
  const service = new CapabilityService(buildConfig() as never);

  const actor = { id: 1, username: 'admin' };

  it('签发的令牌可以验证通过', () => {
    const token = service.issue({
      tool: 'user.update',
      user: actor,
      scope: 'scope:ALL',
      maxItems: 50,
      riskLevel: RiskLevel.L2,
      exp: Date.now() + 5 * 60 * 1000,
    });
    const payload = service.authorize(token, 'user.update', {
      ...actor,
      roles: [],
      permissions: ['*:*:*'],
    });
    expect(payload.tool).toBe('user.update');
    expect(payload.user.id).toBe(1);
    expect(payload.maxItems).toBe(50);
  });

  it('工具不匹配时拒绝', () => {
    const token = service.issue({
      tool: 'user.update',
      user: actor,
      scope: 'scope:ALL',
      maxItems: 50,
      riskLevel: RiskLevel.L2,
      exp: Date.now() + 5 * 60 * 1000,
    });
    expect(() =>
      service.authorize(token, 'user.delete', {
        ...actor,
        roles: [],
        permissions: ['*:*:*'],
      }),
    ).toThrow();
  });

  it('用户不匹配时拒绝', () => {
    const token = service.issue({
      tool: 'user.update',
      user: actor,
      scope: 'scope:ALL',
      maxItems: 50,
      riskLevel: RiskLevel.L2,
      exp: Date.now() + 5 * 60 * 1000,
    });
    expect(() =>
      service.authorize(token, 'user.update', {
        id: 999,
        username: 'other',
        roles: [],
        permissions: ['*:*:*'],
      }),
    ).toThrow();
  });

  it('过期令牌被拒绝', () => {
    const token = service.issue({
      tool: 'user.update',
      user: actor,
      scope: 'scope:ALL',
      maxItems: 50,
      riskLevel: RiskLevel.L2,
      exp: Date.now() - 1000,
    });
    expect(() => service.verify(token)).toThrow();
  });

  it('批量数量超过限制时拒绝', () => {
    const token = service.issue({
      tool: 'user.update',
      user: actor,
      scope: 'scope:ALL',
      maxItems: 10,
      riskLevel: RiskLevel.L2,
      exp: Date.now() + 5 * 60 * 1000,
    });
    const payload = service.verify(token);
    expect(() => service.assertItemCount(payload, 50)).toThrow();
    expect(() => service.assertItemCount(payload, 5)).not.toThrow();
  });
});