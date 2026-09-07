import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { AiTool, ToolContext } from '../tool.interface';
import { UsersService } from '../../../modules/system/users/users.service';

/**
 * user.create Tool：创建一个新用户。
 *
 * 通过 UsersService.create 实现，不直接访问 Prisma。
 * 风险等级 L1（创建用户），默认需要用户确认。
 */
@Injectable()
export class UserCreateTool implements AiTool {
  name = 'user.create';
  description =
    '创建一个新用户。需要提供用户名、显示名、密码，可选邮箱、手机号、部门、角色。只允许创建当前用户 DataScope 范围内的数据。';
  permission = 'system:user:create';
  riskLevel = RiskLevel.L1;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      username: {
        type: 'string',
        description: '用户名（3-64 个字符）',
      },
      displayName: {
        type: 'string',
        description: '显示名称',
      },
      password: {
        type: 'string',
        description: '密码（最少 12 位）',
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
      roleIds: {
        type: 'array',
        items: { type: 'number' },
        description: '角色 ID 集合',
      },
    },
    required: ['username', 'displayName', 'password'],
  };

  constructor(private readonly users: UsersService) {}

  async preview(input: Record<string, unknown>, _context: ToolContext) {
    return {
      summary: `创建用户「${String(input.displayName ?? input.username)}」`,
      affectedCount: 1,
      after: {
        username: input.username,
        displayName: input.displayName,
        email: input.email ?? null,
      },
      undoable: true,
    };
  }

  async execute(input: Record<string, unknown>, context: ToolContext) {
    const result = await this.users.create(
      {
        username: String(input.username),
        displayName: String(input.displayName),
        password: String(input.password),
        email: input.email !== undefined ? String(input.email) : undefined,
        phone: input.phone !== undefined ? String(input.phone) : undefined,
        deptId: input.deptId !== undefined ? Number(input.deptId) : undefined,
        roleIds: Array.isArray(input.roleIds)
          ? (input.roleIds as number[]).map(Number)
          : undefined,
      },
      context.actor.id,
    );
    return { ...result, success: true };
  }
}
