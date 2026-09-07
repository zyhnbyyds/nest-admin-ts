import { describe, expect, it } from 'vitest';
import { RiskLevel } from '../ai.types';
import { PermissionService } from './permission.service';
import { PolicyEngine } from './policy.engine';

describe('PolicyEngine', () => {
  const permission = new PermissionService();
  const engine = new PolicyEngine(permission);

  const adminActor = {
    id: 1,
    username: 'admin',
    roles: ['admin'],
    permissions: ['*:*:*'],
  };

  it('允许拥有权限的用户执行操作', async () => {
    const decision = await engine.evaluate({
      actor: adminActor,
      toolName: 'user.list',
      requiredPermission: 'system:user:list',
      baseRisk: RiskLevel.L0,
      input: {},
    });
    expect(decision.allowed).toBe(true);
    expect(decision.riskLevel).toBe(RiskLevel.L0);
  });

  it('拒绝没有权限的用户执行操作', async () => {
    const limitedActor = {
      id: 2,
      username: 'user',
      roles: ['user'],
      permissions: [],
    };
    const decision = await engine.evaluate({
      actor: limitedActor,
      toolName: 'user.delete',
      requiredPermission: 'system:user:delete',
      baseRisk: RiskLevel.L3,
      input: {},
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('缺少权限');
  });

  it('L2/L3 操作需要审批', async () => {
    const decision = await engine.evaluate({
      actor: adminActor,
      toolName: 'user.update',
      requiredPermission: 'system:user:update',
      baseRisk: RiskLevel.L2,
      input: {},
    });
    expect(decision.allowed).toBe(true);
    expect(decision.requiresApproval).toBe(true);
  });

  it('L0 操作不需要审批', async () => {
    const decision = await engine.evaluate({
      actor: adminActor,
      toolName: 'user.list',
      requiredPermission: 'system:user:list',
      baseRisk: RiskLevel.L0,
      input: {},
    });
    expect(decision.allowed).toBe(true);
    expect(decision.requiresApproval).toBe(false);
  });

  it('动态风险高于基础风险时按动态风险判断', async () => {
    const decision = await engine.evaluate({
      actor: adminActor,
      toolName: 'user.update',
      requiredPermission: 'system:user:update',
      baseRisk: RiskLevel.L1,
      dynamicRisk: RiskLevel.L3,
      input: {},
    });
    expect(decision.riskLevel).toBe(RiskLevel.L3);
    expect(decision.requiresApproval).toBe(true);
  });
});
