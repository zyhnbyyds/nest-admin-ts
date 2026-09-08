import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { ToolContext, ToolPreview } from '../tool.interface';
import { BaseCrudTool } from '../base/base-crud.tool';
import {
  CreateDictTypeInput,
  DictTypesService,
  UpdateDictTypeInput,
} from '../../../modules/system/dict-types/dict-types.service';

/** dict-type.list Tool：查询字典类型列表 */
@Injectable()
export class DictTypeListTool extends BaseCrudTool<DictTypesService> {
  name = 'dict-type.list';
  description = '查询系统字典类型列表，支持分页。';
  permission = 'system:dict:list';
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

  constructor(service: DictTypesService) {
    super(service);
  }

  protected override async doList(input: Record<string, unknown>) {
    const { page, pageSize } = this.parsePagination(input);
    return this.service.list(page, pageSize);
  }
}

/** dict-type.get Tool：查询单个字典类型详情 */
@Injectable()
export class DictTypeGetTool extends BaseCrudTool<DictTypesService> {
  name = 'dict-type.get';
  description = '查询单个字典类型的详细信息。';
  permission = 'system:dict:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '字典类型 ID' },
    },
    required: ['id'],
  };
  action = 'get' as const;

  constructor(service: DictTypesService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    return this.service.findOne(Number(input.id));
  }
}

/** dict-type.create Tool：创建字典类型 */
@Injectable()
export class DictTypeCreateTool extends BaseCrudTool<DictTypesService> {
  name = 'dict-type.create';
  description = '创建一个新字典类型。需要提供名称和类型标识，可选状态、备注。';
  permission = 'system:dict:create';
  riskLevel = RiskLevel.L1;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: '字典名称（1-100 字符）' },
      type: {
        type: 'string',
        description: '字典类型标识（1-100 字符，小写字母数字下划线冒号连字符）',
      },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
      remark: { type: 'string', description: '备注' },
    },
    required: ['name', 'type'],
  };
  action = 'create' as const;

  constructor(service: DictTypesService) {
    super(service);
  }

  protected override async doCreate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const result = await this.service.create(
      this.extractFields(input) as CreateDictTypeInput,
      this.actorId(context),
    );
    return { ...result, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `创建字典类型「${String(input.name)}」`,
      affectedCount: 1,
      after: { name: input.name, type: input.type },
      undoable: true,
    };
  }
}

/** dict-type.update Tool：更新字典类型 */
@Injectable()
export class DictTypeUpdateTool extends BaseCrudTool<DictTypesService> {
  name = 'dict-type.update';
  description = '更新字典类型，可修改名称、类型标识、状态、备注。';
  permission = 'system:dict:update';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '字典类型 ID' },
      name: { type: 'string', description: '字典名称' },
      type: { type: 'string', description: '字典类型标识' },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
      remark: { type: 'string', description: '备注' },
    },
    required: ['id'],
  };
  action = 'update' as const;

  constructor(service: DictTypesService) {
    super(service);
  }

  protected override async doUpdate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const id = Number(input.id);
    await this.service.update(
      id,
      this.extractFields(input) as UpdateDictTypeInput,
      this.actorId(context),
    );
    return { id, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `更新字典类型 #${String(input.id)}`,
      affectedCount: 1,
      after: this.extractFields(input),
      undoable: true,
    };
  }
}

/** dict-type.remove Tool：删除字典类型 */
@Injectable()
export class DictTypeRemoveTool extends BaseCrudTool<DictTypesService> {
  name = 'dict-type.remove';
  description = '删除字典类型。删除后该类型下的字典数据一并删除。';
  permission = 'system:dict:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '字典类型 ID' },
    },
    required: ['id'],
  };
  action = 'remove' as const;

  constructor(service: DictTypesService) {
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
      summary: `删除字典类型 #${String(input.id)}`,
      affectedCount: 1,
      undoable: false,
    };
  }
}
