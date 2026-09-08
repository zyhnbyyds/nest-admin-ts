import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { ToolContext, ToolPreview } from '../tool.interface';
import { BaseCrudTool } from '../base/base-crud.tool';
import { LoginLogsService } from '../../../modules/monitor/login-logs/login-logs.service';

/** login-log.list Tool：查询登录日志 */
@Injectable()
export class LoginLogListTool extends BaseCrudTool<LoginLogsService> {
  name = 'login-log.list';
  description =
    '查询登录日志列表，支持按用户名、状态（成功/失败）筛选和分页。只返回当前用户数据权限范围内的日志。';
  permission = 'monitor:loginlog:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      username: { type: 'string', description: '用户名关键字' },
      status: {
        type: 'string',
        enum: ['success', 'failure'],
        description: '登录状态',
      },
      page: { type: 'number', description: '页码（默认 1）' },
      pageSize: {
        type: 'number',
        description: '每页条数（默认 20，最大 100）',
      },
    },
  };
  action = 'list' as const;

  constructor(service: LoginLogsService) {
    super(service);
  }

  protected override async doList(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const { page, pageSize } = this.parsePagination(input);
    const username =
      typeof input?.username === 'string' && input.username.trim()
        ? input.username.trim()
        : undefined;
    const status =
      input?.status === 'success' || input?.status === 'failure'
        ? input.status
        : undefined;
    return this.service.list(page, pageSize, username, status, context.actor);
  }
}

/** login-log.get Tool：查询单个登录日志 */
@Injectable()
export class LoginLogGetTool extends BaseCrudTool<LoginLogsService> {
  name = 'login-log.get';
  description = '查询单个登录日志的详细信息。';
  permission = 'monitor:loginlog:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '登录日志 ID' },
    },
    required: ['id'],
  };
  action = 'get' as const;

  constructor(service: LoginLogsService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    return this.service.findOne(Number(input.id));
  }
}

/** login-log.remove Tool：删除登录日志 */
@Injectable()
export class LoginLogRemoveTool extends BaseCrudTool<LoginLogsService> {
  name = 'login-log.remove';
  description = '删除登录日志（支持批量）。';
  permission = 'monitor:loginlog:delete';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '登录日志 ID（与 ids 二选一）' },
      ids: {
        type: 'array',
        items: { type: 'number' },
        description: '批量登录日志 ID 集合（与 id 二选一）',
      },
    },
  };
  action = 'remove' as const;

  constructor(service: LoginLogsService) {
    super(service);
  }

  protected override async doRemove(input: Record<string, unknown>) {
    const ids = this.resolveTargetIds(input);
    for (const id of ids) {
      await this.service.remove(id);
    }
    return { removed: ids.length, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    const ids = this.resolveTargetIds(input);
    return {
      summary: `删除 ${ids.length} 条登录日志`,
      affectedCount: ids.length,
      undoable: false,
    };
  }
}

/** login-log.clear Tool：清空登录日志 */
@Injectable()
export class LoginLogClearTool extends BaseCrudTool<LoginLogsService> {
  name = 'login-log.clear';
  description = '清空所有登录日志。';
  permission = 'monitor:loginlog:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = { type: 'object', properties: {} };
  action = 'remove' as const;

  constructor(service: LoginLogsService) {
    super(service);
  }

  protected override async doRemove() {
    await this.service.clear();
    return { cleared: true, success: true };
  }

  protected override async doPreview(): Promise<ToolPreview> {
    return {
      summary: '清空所有登录日志',
      affectedCount: -1,
      undoable: false,
    };
  }
}
