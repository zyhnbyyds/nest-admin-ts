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
 * user.get Tool：查询单个用户详细信息。
 *
 * 通过 UsersService.list 查询后按 id/username 过滤（复用现有 Service，不直接访问 Prisma）。
 */
@Injectable()
export class UserGetTool implements AiTool {
  name = 'user.get';
  description =
    '查询单个用户的详细信息。可以通过用户 ID 或用户名查询。只允许查询当前用户 DataScope 范围内的数据。';
  permission = 'system:user:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: '用户 ID',
      },
      username: {
        type: 'string',
        description: '用户名',
      },
    },
  };

  constructor(private readonly users: UsersService) {}

  async execute(input: Record<string, unknown>, context: ToolContext) {
    const id = input?.id !== undefined ? Number(input.id) : undefined;
    const username =
      typeof input?.username === 'string' && input.username.trim()
        ? input.username.trim()
        : undefined;

    if (id === undefined && username === undefined) {
      throw new AiException(
        AiErrorCode.VALIDATION_ERROR,
        '请提供用户 ID 或用户名',
      );
    }

    // 查询较大范围后在内存中过滤（第一阶段简化实现）
    const result = await this.users.list(1, 100, { actor: context.actor });
    const found = result.items.find((item) => {
      if (id !== undefined) return item.id === id;
      return item.username === username;
    });

    if (!found) {
      throw new AiException(AiErrorCode.BUSINESS_ERROR, '未找到该用户');
    }

    return found;
  }
}
