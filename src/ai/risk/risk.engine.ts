import { Injectable } from '@nestjs/common';
import { RiskLevel } from '../ai.types';
import { RiskContext } from './risk.types';

/**
 * Risk Engine：动态风险评估。
 *
 * 最终风险 = max(基础风险, 动态风险)。
 * 动态风险考虑：操作对象、数量、是否批量、是否生产环境、是否可恢复、权限等级、影响范围。
 */
@Injectable()
export class RiskEngine {
  /** 计算动态风险 */
  evaluate(context: RiskContext): RiskLevel {
    let score = this.riskScore(context.baseRisk);

    // 批量操作提升风险
    if (this.isBatch(context.input)) score += 1;

    // 影响数量提升风险
    const count = this.affectedCount(context.input);
    if (count > 1000) score += 1;
    else if (count > 100) score += 0.5;

    // 生产环境提升风险
    if (process.env.NODE_ENV === 'production') score += 1;

    return this.toRiskLevel(score);
  }

  private riskScore(risk: RiskLevel): number {
    const map: Record<RiskLevel, number> = {
      [RiskLevel.L0]: 0,
      [RiskLevel.L1]: 1,
      [RiskLevel.L2]: 2,
      [RiskLevel.L3]: 3,
    };
    return map[risk] ?? 0;
  }

  private toRiskLevel(score: number): RiskLevel {
    if (score >= 3) return RiskLevel.L3;
    if (score >= 2) return RiskLevel.L2;
    if (score >= 1) return RiskLevel.L1;
    return RiskLevel.L0;
  }

  /** 是否为批量操作 */
  private isBatch(input: Record<string, unknown>): boolean {
    return Array.isArray(input?.ids) || Array.isArray(input?.userId);
  }

  /** 影响数量（从入参估算） */
  private affectedCount(input: Record<string, unknown>): number {
    if (Array.isArray(input?.ids)) return (input.ids as unknown[]).length;
    if (typeof input?.id === 'number') return 1;
    if (typeof input?.userId === 'number') return 1;
    return 0;
  }
}
