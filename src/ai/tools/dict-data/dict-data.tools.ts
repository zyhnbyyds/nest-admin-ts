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
  CreateDictDataInput,
  DictDataService,
  UpdateDictDataInput,
} from '../../../modules/system/dict-data/dict-data.service';

/** dict-data.list Tool：查询字典数据列表 */
@Injectable()
export class DictDataListTool extends BaseCrudTool<DictDataService> {
  name = 'dict-data.list';
  description = '查询字典数据列表，支持按字典类型过滤和分页。';
  permission = 'system:dict:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      type: { type: 'string', description: '字典类型标识' },
      page: { type: 'number', description: '页码（默认 1）' },
      pageSize: {
        type: 'number',
        description: '每页条数（默认 20，最大 100）',
      },
    },
  };
  action = 'list' as const;

  constructor(service: DictDataService) {
    super(service);
  }

  protected override async doList(input: Record<string, unknown>) {
    const { page, pageSize } = this.parsePagination(input);
    const type =
      typeof input?.type === 'string' && input.type.trim()
        ? input.type.trim()
        : undefined;
    return this.service.list(page, pageSize, type);
  }
}

/** dict-data.get Tool：查询单个字典数据（按 ID 或类型） */
@Injectable()
export class DictDataGetTool extends BaseCrudTool<DictDataService> {
  name = 'dict-data.get';
  description =
    '查询字典数据。可通过 ID 查询单个，或通过 type 查询某类型下所有启用的字典数据。';
  permission = 'system:dict:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '字典数据 ID' },
      type: {
        type: 'string',
        description: '字典类型标识（查询该类型所有启用数据）',
      },
    },
  };
  action = 'get' as const;

  constructor(service: DictDataService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    if (input?.id !== undefined) return this.service.findOne(Number(input.id));
    if (typeof input?.type === 'string' && input.type.trim()) {
      return this.service.byType(input.type.trim());
    }
    throw new AiException(
      AiErrorCode.VALIDATION_ERROR,
      '请提供字典数据 ID 或类型标识',
    );
  }
}

/** dict-data.create Tool：创建字典数据 */
@Injectable()
export class DictDataCreateTool extends BaseCrudTool<DictDataService> {
  name = 'dict-data.create';
  description =
    '创建一个新字典数据。需要提供类型、标签、值，可选排序、状态、样式类。';
  permission = 'system:dict:create';
  riskLevel = RiskLevel.L1;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      type: { type: 'string', description: '字典类型标识' },
      label: { type: 'string', description: '字典标签（1-100 字符）' },
      value: { type: 'string', description: '字典值（1-100 字符）' },
      sort: { type: 'number', description: '排序' },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
      cssClass: { type: 'string', description: 'CSS 类名' },
      listClass: { type: 'string', description: '列表样式类' },
    },
    required: ['type', 'label', 'value'],
  };
  action = 'create' as const;

  constructor(service: DictDataService) {
    super(service);
  }

  protected override async doCreate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const result = await this.service.create(
      this.extractFields(input) as CreateDictDataInput,
      this.actorId(context),
    );
    return { ...result, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `创建字典数据「${String(input.label)}」`,
      affectedCount: 1,
      after: { type: input.type, label: input.label, value: input.value },
      undoable: true,
    };
  }
}

/** dict-data.update Tool：更新字典数据 */
@Injectable()
export class DictDataUpdateTool extends BaseCrudTool<DictDataService> {
  name = 'dict-data.update';
  description = '更新字典数据，可修改类型、标签、值、排序、状态、样式类。';
  permission = 'system:dict:update';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '字典数据 ID' },
      type: { type: 'string', description: '字典类型标识' },
      label: { type: 'string', description: '字典标签' },
      value: { type: 'string', description: '字典值' },
      sort: { type: 'number', description: '排序' },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
      cssClass: { type: 'string', description: 'CSS 类名' },
      listClass: { type: 'string', description: '列表样式类' },
    },
    required: ['id'],
  };
  action = 'update' as const;

  constructor(service: DictDataService) {
    super(service);
  }

  protected override async doUpdate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const id = Number(input.id);
    await this.service.update(
      id,
      this.extractFields(input) as UpdateDictDataInput,
      this.actorId(context),
    );
    return { id, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `更新字典数据 #${String(input.id)}`,
      affectedCount: 1,
      after: this.extractFields(input),
      undoable: true,
    };
  }
}

/** dict-data.remove Tool：删除字典数据 */
@Injectable()
export class DictDataRemoveTool extends BaseCrudTool<DictDataService> {
  name = 'dict-data.remove';
  description = '删除字典数据。';
  permission = 'system:dict:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '字典数据 ID' },
    },
    required: ['id'],
  };
  action = 'remove' as const;

  constructor(service: DictDataService) {
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
      summary: `删除字典数据 #${String(input.id)}`,
      affectedCount: 1,
      undoable: false,
    };
  }
}
