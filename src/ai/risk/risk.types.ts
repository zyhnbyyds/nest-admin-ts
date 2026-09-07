import { RiskLevel } from '../ai.types';

/** 风险评估上下文 */
export interface RiskContext {
  /** 基础风险等级 */
  baseRisk: RiskLevel;
  /** Tool 名称 */
  toolName: string;
  /** 入参 */
  input: Record<string, unknown>;
}
