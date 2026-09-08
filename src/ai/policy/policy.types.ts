import { ApprovalPolicy, DataScope, RiskLevel, ToolLimits } from '../ai.types';

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
  /** Tool 审批策略 */
  approvalPolicy?: ApprovalPolicy;
  /** Tool 限制 */
  limits?: ToolLimits;
  /** 入参 */
  input: Record<string, unknown>;
  /** 是否生成解释信息（Policy Explain） */
  explain?: boolean;
}

/** Policy 决策结果 */
export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  scope: DataScope;
  limits?: ToolLimits;
  /** 决策说明（explain=true 时返回，用于前端展示权限原因） */
  explanation?: string;
}

/** Policy Engine 接口 */
export interface PolicyEngine {
  evaluate(context: PolicyContext): Promise<PolicyDecision>;
}
