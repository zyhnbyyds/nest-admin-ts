import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { ToolContext, ToolPreview } from '../tool.interface';
import { BaseCrudTool } from '../base/base-crud.tool';
import { OperationLogsService } from '../../../modules/monitor/operation-logs/operation-logs.service';

/** operation-log.list Tool：查询操作日志 */
@Injectable()
export class OperationLogListTool extends BaseCrudTool<OperationLogsService> {
  name = 'operation-log.list';
  description =
    '查询操作日志列表，支持按状态、用户 ID、用户名筛选和分页。只返回当前用户数据权限范围内的日志。';
  permission = 'monitor:operlog:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['success', 'failure'],
        description: '操作状态',
      },
      userId: { type: 'number', description: '操作人用户 ID' },
      username: { type: 'string', description: '操作人用户名关键字' },
      page: { type: 'number', description: '页码（默认 1）' },
      pageSize: {
        type: 'number',
        description: '每页条数（默认 20，最大 100）',
      },
    },
  };
  action = 'list' as const;

  constructor(service: OperationLogsService) {
    super(service);
  }

  protected override async doList(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const { page, pageSize } = this.parsePagination(input);
    const status =
      input?.status === 'success' || input?.status === 'failure'
        ? input.status
        : undefined;
    const userId =
      input?.userId !== undefined ? Number(input.userId) : undefined;
    const username =
      typeof input?.username === 'string' && input.username.trim()
        ? input.username.trim()
        : undefined;
    return this.service.list(
      page,
      pageSize,
      status,
      userId,
      username,
      context.actor,
    );
  }
}

/** operation-log.get Tool：查询单个操作日志 */
@Injectable()
export class OperationLogGetTool extends BaseCrudTool<OperationLogsService> {
  name = 'operation-log.get';
  description = '查询单个操作日志的详细信息。';
  permission = 'monitor:operlog:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '操作日志 ID' },
    },
    required: ['id'],
  };
  action = 'get' as const;

  constructor(service: OperationLogsService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    return this.service.findOne(Number(input.id));
  }
}

/** operation-log.remove Tool：删除操作日志 */
@Injectable()
export class OperationLogRemoveTool extends BaseCrudTool<OperationLogsService> {
  name = 'operation-log.remove';
  description = '删除操作日志（支持批量）。';
  permission = 'monitor:operlog:delete';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '操作日志 ID（与 ids 二选一）' },
      ids: {
        type: 'array',
        items: { type: 'number' },
        description: '批量操作日志 ID 集合（与 id 二选一）',
      },
    },
  };
  action = 'remove' as const;

  constructor(service: OperationLogsService) {
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
      summary: `删除 ${ids.length} 条操作日志`,
      affectedCount: ids.length,
      undoable: false,
    };
  }
}

/** operation-log.clear Tool：清空操作日志 */
@Injectable()
export class OperationLogClearTool extends BaseCrudTool<OperationLogsService> {
  name = 'operation-log.clear';
  description = '清空所有操作日志。';
  permission = 'monitor:operlog:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = { type: 'object', properties: {} };
  action = 'remove' as const;

  constructor(service: OperationLogsService) {
    super(service);
  }

  protected override async doRemove() {
    await this.service.clear();
    return { cleared: true, success: true };
  }

  protected override async doPreview(): Promise<ToolPreview> {
    return {
      summary: '清空所有操作日志',
      affectedCount: -1,
      undoable: false,
    };
  }
}
