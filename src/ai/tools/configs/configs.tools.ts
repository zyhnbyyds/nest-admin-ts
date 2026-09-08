import { Injectable } from '@nestjs/common';
import {
  AiErrorCode,
  AiException,
  ApprovalPolicy,
  RiskLevel,
} from '../../ai.types';
import { ToolContext, ToolPreview } from '../tool.interface';
import { BaseCrudTool } from '../base/base-crud.tool';
import {
  ConfigsService,
  CreateConfigInput,
  UpdateConfigInput,
} from '../../../modules/system/configs/configs.service';

/** config.list Tool：查询参数配置列表 */
@Injectable()
export class ConfigListTool extends BaseCrudTool<ConfigsService> {
  name = 'config.list';
  description = '查询系统参数配置列表，支持分页。';
  permission = 'system:config:list';
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

  constructor(service: ConfigsService) {
    super(service);
  }

  protected override async doList(input: Record<string, unknown>) {
    const { page, pageSize } = this.parsePagination(input);
    return this.service.list(page, pageSize);
  }
}

/** config.get Tool：查询单个参数配置（按 ID 或 key） */
@Injectable()
export class ConfigGetTool extends BaseCrudTool<ConfigsService> {
  name = 'config.get';
  description = '查询单个参数配置的详细信息，可通过 ID 或参数 key 查询。';
  permission = 'system:config:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '参数配置 ID' },
      key: { type: 'string', description: '参数 key' },
    },
  };
  action = 'get' as const;

  constructor(service: ConfigsService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    if (input?.id !== undefined) return this.service.findOne(Number(input.id));
    if (typeof input?.key === 'string' && input.key.trim()) {
      return this.service.byKey(input.key.trim());
    }
    throw new AiException(
      AiErrorCode.VALIDATION_ERROR,
      '请提供参数配置 ID 或 key',
    );
  }
}

/** config.create Tool：创建参数配置 */
@Injectable()
export class ConfigCreateTool extends BaseCrudTool<ConfigsService> {
  name = 'config.create';
  description =
    '创建一个新参数配置。需要提供名称、key、值，可选是否内置、备注。';
  permission = 'system:config:create';
  riskLevel = RiskLevel.L1;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: '参数名称（1-100 字符）' },
      key: {
        type: 'string',
        description: '参数 key（1-100 字符，字母数字点下划线冒号连字符）',
      },
      value: { type: 'string', description: '参数值（1-500 字符）' },
      builtin: { type: 'boolean', description: '是否内置参数' },
      remark: { type: 'string', description: '备注' },
    },
    required: ['name', 'key', 'value'],
  };
  action = 'create' as const;

  constructor(service: ConfigsService) {
    super(service);
  }

  protected override async doCreate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const result = await this.service.create(
      this.extractFields(input) as CreateConfigInput,
      this.actorId(context),
    );
    return { ...result, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `创建参数「${String(input.name)}」`,
      affectedCount: 1,
      after: { name: input.name, key: input.key },
      undoable: true,
    };
  }
}

/** config.update Tool：更新参数配置 */
@Injectable()
export class ConfigUpdateTool extends BaseCrudTool<ConfigsService> {
  name = 'config.update';
  description = '更新参数配置，可修改名称、key、值、是否内置、备注。';
  permission = 'system:config:update';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '参数配置 ID' },
      name: { type: 'string', description: '参数名称' },
      key: { type: 'string', description: '参数 key' },
      value: { type: 'string', description: '参数值' },
      builtin: { type: 'boolean', description: '是否内置参数' },
      remark: { type: 'string', description: '备注' },
    },
    required: ['id'],
  };
  action = 'update' as const;

  constructor(service: ConfigsService) {
    super(service);
  }

  protected override async doUpdate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const id = Number(input.id);
    await this.service.update(
      id,
      this.extractFields(input) as UpdateConfigInput,
      this.actorId(context),
    );
    return { id, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `更新参数 #${String(input.id)}`,
      affectedCount: 1,
      after: this.extractFields(input),
      undoable: true,
    };
  }
}

/** config.remove Tool：删除参数配置 */
@Injectable()
export class ConfigRemoveTool extends BaseCrudTool<ConfigsService> {
  name = 'config.remove';
  description = '删除参数配置。内置参数无法删除。';
  permission = 'system:config:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '参数配置 ID' },
    },
    required: ['id'],
  };
  action = 'remove' as const;

  constructor(service: ConfigsService) {
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
      summary: `删除参数 #${String(input.id)}`,
      affectedCount: 1,
      undoable: false,
    };
  }
}
