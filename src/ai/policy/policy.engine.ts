import { Injectable } from '@nestjs/common';
import { DataScope, RiskLevel } from '../ai.types';
import { PolicyContext, PolicyDecision } from './policy.types';
import { PermissionService } from './permission.service';

/**
 * Policy Engine：AI 操作的安全边界。
 *
 * 评估顺序：
 * 1. RBAC 权限判断（不能相信 LLM 的自我声明）
 * 2. 风险等级判断（基础风险 + 动态风险）
 * 3. 审批判断（根据风险等级和 Tool 的审批策略）
 *
 * 任何一个环节失败，都必须阻止操作。
 */
@Injectable()
export class PolicyEngine {
  constructor(private readonly permission: PermissionService) {}

  async evaluate(context: PolicyContext): Promise<PolicyDecision> {
    // 1. RBAC 权限判断
    if (
      !this.permission.hasPermission(context.actor, context.requiredPermission)
    ) {
      return {
        allowed: false,
        reason: `缺少权限 ${context.requiredPermission}`,
        riskLevel: context.baseRisk,
        requiresApproval: false,
        scope: DataScope.SELF,
      };
    }

    // 2. 风险等级判断（动态风险默认等于基础风险）
    const riskLevel = context.dynamicRisk ?? context.baseRisk;

    // 3. 审批判断
    // L0 → 自动执行；L1 → 默认自动；L2 → 必须用户确认；L3 → 管理员审批
    const requiresApproval =
      riskLevel === RiskLevel.L2 || riskLevel === RiskLevel.L3;

    return {
      allowed: true,
      riskLevel,
      requiresApproval,
      scope: DataScope.ALL,
    };
  }
}
