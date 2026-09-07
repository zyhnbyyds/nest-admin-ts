import { DataScope, RiskLevel, ToolLimits } from '../ai.types';

/** Policy 评估上下文 */
export interface PolicyContext {
  /** 当前操作人 */
  actor: {
    id: number;
    username: string;
    roles: string[];
    permissions: string[];
  };
  /** Tool 名称 */
  toolName: string;
  /** Tool 所需权限 */
  requiredPermission: string;
  /** Tool 基础风险 */
  baseRisk: RiskLevel;
  /** 动态风险（由 Risk Engine 计算，第一阶段默认等于基础风险） */
  dynamicRisk?: RiskLevel;
  /** 入参 */
  input: Record<string, unknown>;
}

/** Policy 决策结果 */
export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  scope: DataScope;
  limits?: ToolLimits;
}

/** Policy Engine 接口 */
export interface PolicyEngine {
  evaluate(context: PolicyContext): Promise<PolicyDecision>;
}
