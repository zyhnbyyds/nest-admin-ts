import { ApprovalPolicy, DataScope, RiskLevel } from '../ai.types';

/** Policy Explain：解释权限判断结果的详细信息 */
export interface PolicyExplain {
  /** 当前用户 */
  actor: {
    id: number;
    username: string;
    roles: string[];
    permissions: string[];
  };
  /** 目标工具 */
  toolName: string;
  /** RBAC 检查结果 */
  rbac: {
    required: string;
    has: boolean;
  };
  /** AI Policy 检查结果（审批策略） */
  aiPolicy: {
    approvalPolicy: ApprovalPolicy | undefined;
    applies: boolean;
  };
  /** 动态风险 */
  dynamicRisk: {
    baseRisk: RiskLevel;
    finalRisk: RiskLevel;
    notes: string[];
  };
  /** 数据范围 */
  scope: DataScope;
  /** 限制 */
  limits?: {
    maxItems?: number | undefined;
    allowBatch?: boolean | undefined;
  };
  /** 最终决策 */
  decision: {
    allowed: boolean;
    requiresApproval: boolean;
    reason?: string;
  };
}

/** 生成人类可读的 Explain 文本 */
export function formatPolicyExplain(explain: PolicyExplain): string {
  const lines: string[] = [];
  lines.push(`当前用户：${explain.actor.username}（ID: ${explain.actor.id}）`);
  lines.push(`RBAC：${explain.rbac.required} ${explain.rbac.has ? '✓' : '✗'}`);
  lines.push(
    `AI Policy：${explain.aiPolicy.approvalPolicy ?? 'NONE'}（${
      explain.aiPolicy.applies ? '生效' : '不生效'
    }）`,
  );
  lines.push(
    `风险等级：${explain.dynamicRisk.baseRisk} → ${explain.dynamicRisk.finalRisk}${
      explain.dynamicRisk.notes.length
        ? `（${explain.dynamicRisk.notes.join('，')}）`
        : ''
    }`,
  );
  lines.push(`数据范围：${explain.scope}`);
  if (explain.limits?.maxItems !== undefined) {
    lines.push(`批量限制：最大 ${explain.limits.maxItems} 条`);
  }
  lines.push(
    `最终结果：${explain.decision.allowed ? 'ALLOW' : 'DENY'}${
      explain.decision.reason ? `（${explain.decision.reason}）` : ''
    }`,
  );
  return lines.join('\n');
}
