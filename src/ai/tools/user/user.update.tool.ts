import { Injectable } from '@nestjs/common';
import {
  AiErrorCode,
  AiException,
  ApprovalPolicy,
  RiskLevel,
} from '../../ai.types';
import { AiTool, ToolContext } from '../tool.interface';
import { UsersService } from '../../../modules/system/users/users.service';

/**
 * user.update Tool：更新用户信息（支持单用户/批量、Dry Run、Undo）。
 *
 * 通过 UsersService.update 实现，不直接访问 Prisma。
 * 风险等级 L2（修改用户），默认需要用户确认。
 * 只允许更新当前用户 DataScope 范围内的数据。
 */
@Injectable()
export class UserUpdateTool implements AiTool {
  name = 'user.update';
  description =
    '更新用户信息。支持单个用户（id）或批量（ids），可修改显示名、邮箱、手机号、部门、状态、角色。只允许更新当前用户 DataScope 范围内的数据。';
  permission = 'system:user:update';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  limits = { maxItems: 100, allowBatch: true, dryRun: true, undoable: true };
  inputSchema = {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: '用户 ID（与 ids 二选一）',
      },
      ids: {
        type: 'array',
        items: { type: 'number' },
        description: '批量用户 ID 集合（与 id 二选一）',
      },
      displayName: {
        type: 'string',
        description: '显示名称',
      },
      email: {
        type: 'string',
        description: '邮箱',
      },
      phone: {
        type: 'string',
        description: '手机号',
      },
      deptId: {
        type: 'number',
        description: '部门 ID',
      },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
      roleIds: {
        type: 'array',
        items: { type: 'number' },
        description: '角色 ID 集合',
      },
    },
  };

  constructor(private readonly users: UsersService) {}

  async preview(input: Record<string, unknown>, context: ToolContext) {
    const targetIds = this.resolveTargetIds(input);
    const users = await this.findUsersInScope(targetIds, context);
    return {
      summary: `更新 ${users.length} 个用户`,
      affectedCount: users.length,
      before: users.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        status: user.status,
      })),
      after: {
        displayName: input.displayName,
        email: input.email,
        status: input.status,
      },
      undoable: true,
    };
  }

  async execute(input: Record<string, unknown>, context: ToolContext) {
    const targetIds = this.resolveTargetIds(input);
    const users = await this.findUsersInScope(targetIds, context);
    if (users.length !== targetIds.length) {
      const missing = targetIds.filter(
        (id) => !users.some((user) => user.id === id),
      );
      throw new AiException(
        AiErrorCode.SCOPE_DENIED,
        `部分目标用户不在你的数据权限范围内：${missing.join(', ')}`,
      );
    }

    const { id: _id, ids: _ids, ...rest } = input;
    const results: { id: number; success: boolean }[] = [];
    // 记录修改前快照（用于 Undo）
    const before = users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      status: user.status,
    }));
    for (const id of targetIds) {
      await this.users.update(id, rest, context.actor.id);
      results.push({ id, success: true });
    }
    const after = targetIds.map((id) => ({ id, ...rest }));
    return {
      items: results,
      count: results.length,
      success: true,
      undo: { ids: targetIds, before, after },
    };
  }

  /**
   * 撤销（Undo）：根据传入的 before 快照恢复原状态。
   *
   * input 形如 {@link UserUpdateTool.execute} 返回的 undo 数据中携带 before 快照。
   * 高危不可逆操作不支持 Undo（如删除）。
   */
  async rollback(input: Record<string, unknown>, context: ToolContext) {
    const undo = input?.undo as
      | {
          ids: number[];
          before: Array<{
            id: number;
            displayName?: string;
            email?: string | null;
            phone?: string | null;
            status?: 'active' | 'disabled';
          }>;
        }
      | undefined;
    const beforeSnapshot = (input?.before as unknown[]) ?? undo?.before;
    if (!Array.isArray(beforeSnapshot) || beforeSnapshot.length === 0) {
      // 无 before 快照时无法安全撤销
      throw new AiException(
        AiErrorCode.ACTION_STALE,
        '缺少修改前快照，无法撤销',
      );
    }
    for (const item of beforeSnapshot) {
      const target = item as {
        id: number;
        displayName?: string;
        email?: string | null;
        phone?: string | null;
        status?: 'active' | 'disabled';
      };
      await this.users.update(target.id, target, context.actor.id);
    }
    return { rolledBack: beforeSnapshot.length, success: true };
  }

  /** 解析目标用户 ID 集合（id 或 ids） */
  private resolveTargetIds(input: Record<string, unknown>): number[] {
    if (Array.isArray(input?.ids)) {
      const ids = (input.ids as unknown[]).map(Number);
      if (ids.length > (this.limits?.maxItems ?? 100)) {
        throw new AiException(
          AiErrorCode.RISK_DENIED,
          `批量操作超过限制（最大 ${this.limits?.maxItems} 条）`,
        );
      }
      return ids;
    }
    if (input?.id !== undefined) return [Number(input.id)];
    throw new AiException(AiErrorCode.VALIDATION_ERROR, '请提供用户 id 或 ids');
  }

  /** 在 DataScope 范围内查找目标用户 */
  private async findUsersInScope(
    ids: number[],
    context: ToolContext,
  ): Promise<Array<{ id: number; username: string; displayName: string; email: string | null; status: string }>> {
    const result = await this.users.list(1, 1000, { actor: context.actor });
    const idSet = new Set(ids);
    return result.items.filter((item) => idSet.has(item.id));
  }
}
