import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { ToolContext, ToolPreview } from '../tool.interface';
import { BaseCrudTool } from '../base/base-crud.tool';
import {
  CreateJobInput,
  JobsService,
  UpdateJobInput,
} from '../../../modules/jobs/jobs.service';

/** job.list Tool：查询定时任务列表 */
@Injectable()
export class JobListTool extends BaseCrudTool<JobsService> {
  name = 'job.list';
  description = '查询定时任务列表，支持分页。';
  permission = 'system:job:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      page: { type: 'number', description: '页码（默认 1）' },
      pageSize: {
        type: 'number',
        description: '每页条数（默认 20，最大 100）',
      },
    },
  };
  action = 'list' as const;

  constructor(service: JobsService) {
    super(service);
  }

  protected override async doList(input: Record<string, unknown>) {
    const { page, pageSize } = this.parsePagination(input);
    return this.service.list(page, pageSize);
  }
}

/** job.get Tool：查询单个定时任务详情 */
@Injectable()
export class JobGetTool extends BaseCrudTool<JobsService> {
  name = 'job.get';
  description = '查询单个定时任务的详细信息。';
  permission = 'system:job:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '定时任务 ID' },
    },
    required: ['id'],
  };
  action = 'get' as const;

  constructor(service: JobsService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    return this.service.findOne(Number(input.id));
  }
}

/** job.create Tool：创建定时任务 */
@Injectable()
export class JobCreateTool extends BaseCrudTool<JobsService> {
  name = 'job.create';
  description =
    '创建一个新定时任务。需要提供名称、处理器、Cron 表达式，可选状态、是否并发、备注。';
  permission = 'system:job:create';
  riskLevel = RiskLevel.L1;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: '任务名称（1-100 字符）' },
      handler: {
        type: 'string',
        description: '任务处理器（如 noop、cleanExpiredRefreshTokens）',
      },
      cron: { type: 'string', description: 'Cron 表达式' },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
      concurrent: { type: 'boolean', description: '是否允许并发执行' },
      remark: { type: 'string', description: '备注' },
    },
    required: ['name', 'handler', 'cron'],
  };
  action = 'create' as const;

  constructor(service: JobsService) {
    super(service);
  }

  protected override async doCreate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const result = await this.service.create(
      this.extractFields(input) as CreateJobInput,
      this.actorId(context),
    );
    return { ...result, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `创建定时任务「${String(input.name)}」`,
      affectedCount: 1,
      after: { name: input.name, handler: input.handler, cron: input.cron },
      undoable: true,
    };
  }
}

/** job.update Tool：更新定时任务 */
@Injectable()
export class JobUpdateTool extends BaseCrudTool<JobsService> {
  name = 'job.update';
  description =
    '更新定时任务，可修改名称、处理器、Cron 表达式、状态、是否并发、备注。';
  permission = 'system:job:update';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '定时任务 ID' },
      name: { type: 'string', description: '任务名称' },
      handler: { type: 'string', description: '任务处理器' },
      cron: { type: 'string', description: 'Cron 表达式' },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
      concurrent: { type: 'boolean', description: '是否允许并发执行' },
      remark: { type: 'string', description: '备注' },
    },
    required: ['id'],
  };
  action = 'update' as const;

  constructor(service: JobsService) {
    super(service);
  }

  protected override async doUpdate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const id = Number(input.id);
    await this.service.update(
      id,
      this.extractFields(input) as UpdateJobInput,
      this.actorId(context),
    );
    return { id, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `更新定时任务 #${String(input.id)}`,
      affectedCount: 1,
      after: this.extractFields(input),
      undoable: true,
    };
  }
}

/** job.remove Tool：删除定时任务 */
@Injectable()
export class JobRemoveTool extends BaseCrudTool<JobsService> {
  name = 'job.remove';
  description = '删除定时任务。';
  permission = 'system:job:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '定时任务 ID' },
    },
    required: ['id'],
  };
  action = 'remove' as const;

  constructor(service: JobsService) {
    super(service);
  }

  protected override async doRemove(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const id = Number(input.id);
    await this.service.remove(id, this.actorId(context));
    return { id, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `删除定时任务 #${String(input.id)}`,
      affectedCount: 1,
      undoable: false,
    };
  }
}

/** job.run Tool：手动执行定时任务 */
@Injectable()
export class JobRunTool extends BaseCrudTool<JobsService> {
  name = 'job.run';
  description = '立即手动执行一次定时任务。';
  permission = 'system:job:run';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '定时任务 ID' },
    },
    required: ['id'],
  };
  action = 'update' as const;

  constructor(service: JobsService) {
    super(service);
  }

  protected override async doUpdate(input: Record<string, unknown>) {
    const id = Number(input.id);
    await this.service.runNow(id);
    return { id, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `立即执行定时任务 #${String(input.id)}`,
      affectedCount: 1,
      undoable: false,
    };
  }
}

/** job.logs Tool：查询任务执行日志 */
@Injectable()
export class JobLogsTool extends BaseCrudTool<JobsService> {
  name = 'job.logs';
  description = '查询指定定时任务的执行日志，支持分页。';
  permission = 'system:job:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      jobId: { type: 'number', description: '定时任务 ID' },
      page: { type: 'number', description: '页码（默认 1）' },
      pageSize: {
        type: 'number',
        description: '每页条数（默认 20，最大 100）',
      },
    },
    required: ['jobId'],
  };
  action = 'list' as const;

  constructor(service: JobsService) {
    super(service);
  }

  protected override async doList(input: Record<string, unknown>) {
    const { page, pageSize } = this.parsePagination(input);
    return this.service.listLogs(Number(input.jobId), page, pageSize);
  }
}

/** job.clearLogs Tool：清空任务执行日志 */
@Injectable()
export class JobClearLogsTool extends BaseCrudTool<JobsService> {
  name = 'job.clearLogs';
  description = '清空所有定时任务的执行日志。';
  permission = 'system:job:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = { type: 'object', properties: {} };
  action = 'remove' as const;

  constructor(service: JobsService) {
    super(service);
  }

  protected override async doRemove() {
    await this.service.clearLogs();
    return { cleared: true, success: true };
  }

  protected override async doPreview(): Promise<ToolPreview> {
    return {
      summary: '清空所有任务执行日志',
      affectedCount: -1,
      undoable: false,
    };
  }
}
