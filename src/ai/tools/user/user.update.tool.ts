import { Injectable } from '@nestjs/common';
import { AiErrorCode, AiException, ApprovalPolicy, RiskLevel } from '../../ai.types';
import { AiTool, ToolContext } from '../tool.interface';
import { UsersService } from '../../../modules/system/users/users.service';

/**
 * user.update Tool：更新用户信息。
 *
 * 通过 UsersService.update 实现，不直接访问 Prisma。
 * 风险等级 L2（修改用户），默认需要用户确认。
 * 只允许更新当前用户 DataScope 范围内的数据。
 */
@Injectable()
export class UserUpdateTool implements AiTool {
  name = 'user.update';
  description =
    '更新一个用户的信息。可以修改显示名、邮箱、手机号、部门、状态、角色。只允许更新当前用户 DataScope 范围内的数据。';
  permission = 'system:user:update';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: '用户 ID',
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
    required: ['id'],
  };

  constructor(private readonly users: UsersService) {}

  async preview(input: Record<string, unknown>, context: ToolContext) {
    const user = await this.findUserInScope(input, context);
    return {
      summary: `更新用户「${user?.displayName ?? String(input.id)}」`,
      affectedCount: 1,
      before: user
        ? {
            displayName: user.displayName,
            email: user.email,
            status: user.status,
          }
        : undefined,
      after: {
        displayName: input.displayName,
        email: input.email,
        status: input.status,
      },
      undoable: true,
    };
  }

  async execute(input: Record<string, unknown>, context: ToolContext) {
    const user = await this.findUserInScope(input, context);
    if (!user) {
      throw new AiException(
        AiErrorCode.SCOPE_DENIED,
        '目标用户不在你的数据权限范围内',
      );
    }
    const id = Number(input.id);
    const { id: _id, ...rest } = input;
    await this.users.update(id, rest, context.actor.id);
    return { id, success: true };
  }

  /** 在 DataScope 范围内查找目标用户 */
  private async findUserInScope(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const id = Number(input.id);
    const result = await this.users.list(1, 100, { actor: context.actor });
    return result.items.find((item) => item.id === id);
  }
}
