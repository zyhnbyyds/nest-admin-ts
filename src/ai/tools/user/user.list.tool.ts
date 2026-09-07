import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { AiTool, ToolContext } from '../tool.interface';
import { UsersService } from '../../../modules/system/users/users.service';

/**
 * user.list Tool：查询系统用户。
 *
 * 只允许查询当前用户 DataScope 范围内的数据（通过 UsersService.list 的 actor 参数）。
 */
@Injectable()
export class UserListTool implements AiTool {
  name = 'user.list';
  description =
    '查询系统用户。可以按照用户名、邮箱、状态、创建时间进行筛选。只允许查询当前用户 DataScope 范围内的数据。';
  permission = 'system:user:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: '用户名/邮箱关键字',
      },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '用户状态',
      },
      page: {
        type: 'number',
        description: '页码（默认 1）',
      },
      pageSize: {
        type: 'number',
        description: '每页条数（默认 20，最大 100）',
      },
    },
  };

  constructor(private readonly users: UsersService) {}

  async execute(input: Record<string, unknown>, context: ToolContext) {
    const page = Math.max(Number(input?.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(input?.pageSize) || 20, 1), 100);
    const status =
      input?.status === 'active' || input?.status === 'disabled'
        ? input.status
        : undefined;
    const keyword =
      typeof input?.keyword === 'string' && input.keyword.trim()
        ? input.keyword.trim().toLowerCase()
        : undefined;

    const result = await this.users.list(page, pageSize, {
      status,
      actor: context.actor,
    });

    // keyword 筛选：查询后按用户名/邮箱/显示名过滤（第一阶段简化实现）
    if (keyword) {
      const filtered = result.items.filter((item) => {
        return (
          item.username.toLowerCase().includes(keyword) ||
          (item.email?.toLowerCase().includes(keyword) ?? false) ||
          item.displayName.toLowerCase().includes(keyword)
        );
      });
      return { ...result, items: filtered };
    }

    return result;
  }
}
