import { describe, expect, it } from 'vitest';
import { ApprovalPolicy, RiskLevel } from '../ai.types';
import { AiTool } from './tool.interface';
import { ToolRegistry } from './tool.registry';

describe('ToolRegistry', () => {
  const registry = new ToolRegistry();

  const userListTool: AiTool = {
    name: 'user.list',
    description: '查询用户',
    permission: 'system:user:list',
    riskLevel: RiskLevel.L0,
    approvalPolicy: ApprovalPolicy.NONE,
    inputSchema: {},
    execute: async () => ({ items: [] }),
  };

  const userDeleteTool: AiTool = {
    name: 'user.delete',
    description: '删除用户',
    permission: 'system:user:delete',
    riskLevel: RiskLevel.L3,
    approvalPolicy: ApprovalPolicy.DISABLED,
    inputSchema: {},
    execute: async () => ({}),
  };

  it('注册后可以获取 Tool', () => {
    registry.register(userListTool);
    registry.register(userDeleteTool);
    expect(registry.get('user.list')).toBe(userListTool);
    expect(registry.get('user.delete')).toBe(userDeleteTool);
  });

  it('根据权限过滤可用 Tool', () => {
    const available = registry.getAvailableTools({
      permissions: ['system:user:list'],
    });
    const names = available.map((tool) => tool.name);
    expect(names).toContain('user.list');
    expect(names).not.toContain('user.delete');
  });

  it('超级管理员可以看到所有 Tool', () => {
    const available = registry.getAvailableTools({
      permissions: ['*:*:*'],
    });
    expect(available.length).toBe(2);
  });

  it('返回未注册的 Tool 为 undefined', () => {
    expect(registry.get('not.exists')).toBeUndefined();
  });
});
