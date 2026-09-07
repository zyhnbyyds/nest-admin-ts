import { describe, expect, it } from 'vitest';
import { RiskLevel } from '../ai.types';
import { RiskEngine } from './risk.engine';

describe('RiskEngine', () => {
  const engine = new RiskEngine();

  it('单个对象保持基础风险', () => {
    expect(
      engine.evaluate({
        baseRisk: RiskLevel.L1,
        toolName: 'user.update',
        input: { id: 1 },
      }),
    ).toBe(RiskLevel.L1);
  });

  it('批量操作提升风险等级', () => {
    expect(
      engine.evaluate({
        baseRisk: RiskLevel.L1,
        toolName: 'user.update',
        input: { ids: [1, 2, 3] },
      }),
    ).toBe(RiskLevel.L2);
  });

  it('大量批量操作提升到最高风险', () => {
    expect(
      engine.evaluate({
        baseRisk: RiskLevel.L2,
        toolName: 'user.update',
        input: { ids: Array.from({ length: 2000 }, (_, i) => i) },
      }),
    ).toBe(RiskLevel.L3);
  });

  it('L0 批量查询保持只读风险', () => {
    expect(
      engine.evaluate({
        baseRisk: RiskLevel.L0,
        toolName: 'user.list',
        input: { page: 1, pageSize: 20 },
      }),
    ).toBe(RiskLevel.L0);
  });
});
