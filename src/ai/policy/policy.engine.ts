import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, DataScope, RiskLevel } from '../ai.types';
import { RiskEngine } from '../risk/risk.engine';
import { PolicyContext, PolicyDecision } from './policy.types';
import { PermissionService } from './permission.service';

/**
 * Policy Engine：AI 操作的安全边界。
 *
 * 评估顺序：
 * 1. RBAC 权限判断（不能相信 LLM 的自我声明）
 * 2. 动态风险判断（Risk Engine）
 * 3. 审批判断（根据风险等级和 Tool 的审批策略）
 *
 * 任何一个环节失败，都必须阻止操作。
 */
@Injectable()
export class PolicyEngine {
  constructor(
    private readonly permission: PermissionService,
    private readonly riskEngine: RiskEngine,
  ) {}

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

    // 2. 动态风险判断
    const riskLevel = this.riskEngine.evaluate({
      baseRisk: context.baseRisk,
      toolName: context.toolName,
      input: context.input,
    });

    // 3. 审批策略判断
    // DISABLED：默认禁用，不注册给 AI
    if (context.approvalPolicy === ApprovalPolicy.DISABLED) {
      return {
        allowed: false,
        reason: '该操作被禁用',
        riskLevel,
        requiresApproval: false,
        scope: DataScope.ALL,
      };
    }

    // L0 → 自动执行；L1 → 默认自动（CONFIRM 时确认）；L2 → 必须用户确认；L3 → 必须审批
    const requiresApproval =
      riskLevel === RiskLevel.L2 ||
      riskLevel === RiskLevel.L3 ||
      context.approvalPolicy === ApprovalPolicy.CONFIRM ||
      context.approvalPolicy === ApprovalPolicy.APPROVAL;

    return {
      allowed: true,
      riskLevel,
      requiresApproval,
      scope: DataScope.ALL,
    };
  }
}
