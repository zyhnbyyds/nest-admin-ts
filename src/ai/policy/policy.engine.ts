import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, DataScope, RiskLevel, ToolLimits } from '../ai.types';
import { RiskEngine } from '../risk/risk.engine';
import { formatPolicyExplain, PolicyExplain } from './policy.explain';
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
    // 动态风险计算（无论是否允许都要算，用于 explain）
    const dynamicRisk = this.riskEngine.evaluate({
      baseRisk: context.baseRisk,
      toolName: context.toolName,
      input: context.input,
    });

    const notes: string[] = [];
    if (this.riskEngine.isBatch(context.input)) notes.push('批量操作');
    const count = this.riskEngine.affectedCount(context.input);
    if (count > 0) notes.push(`影响 ${count} 条`);

    // 1. RBAC 权限判断
    if (
      !this.permission.hasPermission(context.actor, context.requiredPermission)
    ) {
      return this.buildDecision({
        allowed: false,
        reason: `缺少权限 ${context.requiredPermission}`,
        riskLevel: dynamicRisk,
        requiresApproval: false,
        scope: DataScope.SELF,
        context,
        baseRisk: context.baseRisk,
        notes,
      });
    }

    // 2. 审批策略判断
    // DISABLED：默认禁用，不注册给 AI
    if (context.approvalPolicy === ApprovalPolicy.DISABLED) {
      return this.buildDecision({
        allowed: false,
        reason: '该操作被禁用',
        riskLevel: dynamicRisk,
        requiresApproval: false,
        scope: DataScope.ALL,
        context,
        baseRisk: context.baseRisk,
        notes,
      });
    }

    // L0 → 自动执行；L1 → 默认自动（CONFIRM 时确认）；L2 → 必须用户确认；L3 → 必须审批
    const requiresApproval =
      dynamicRisk === RiskLevel.L2 ||
      dynamicRisk === RiskLevel.L3 ||
      context.approvalPolicy === ApprovalPolicy.CONFIRM ||
      context.approvalPolicy === ApprovalPolicy.APPROVAL;

    return this.buildDecision({
      allowed: true,
      riskLevel: dynamicRisk,
      requiresApproval,
      scope: DataScope.ALL,
      limits: context.limits,
      context,
      baseRisk: context.baseRisk,
      notes,
    });
  }

  /** 构建决策并可选生成解释信息 */
  private buildDecision(args: {
    allowed: boolean;
    reason?: string;
    riskLevel: RiskLevel;
    requiresApproval: boolean;
    scope: DataScope;
    limits?: ToolLimits | undefined;
    context: PolicyContext;
    baseRisk: RiskLevel;
    notes: string[];
  }): PolicyDecision {
    const decision: PolicyDecision = {
      allowed: args.allowed,
      riskLevel: args.riskLevel,
      requiresApproval: args.requiresApproval,
      scope: args.scope,
    };
    if (args.reason !== undefined) decision.reason = args.reason;
    if (args.context.limits !== undefined)
      decision.limits = args.context.limits;
    if (args.context.explain) {
      const explain: PolicyExplain = {
        actor: { ...args.context.actor },
        toolName: args.context.toolName,
        rbac: {
          required: args.context.requiredPermission,
          has: this.permission.hasPermission(
            args.context.actor,
            args.context.requiredPermission,
          ),
        },
        aiPolicy: {
          approvalPolicy: args.context.approvalPolicy,
          applies: args.context.approvalPolicy !== undefined,
        },
        dynamicRisk: {
          baseRisk: args.baseRisk,
          finalRisk: args.riskLevel,
          notes: args.notes,
        },
        scope: args.scope,
        decision: {
          allowed: args.allowed,
          requiresApproval: args.requiresApproval,
          ...(args.reason !== undefined ? { reason: args.reason } : {}),
        },
      };
      if (args.context.limits !== undefined) {
        explain.limits = {
          maxItems: args.context.limits.maxItems,
          allowBatch: args.context.limits.allowBatch,
        };
      }
      decision.explanation = formatPolicyExplain(explain);
    }
    return decision;
  }
}
