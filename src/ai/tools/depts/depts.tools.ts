import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { ToolContext, ToolPreview } from '../tool.interface';
import { BaseCrudTool } from '../base/base-crud.tool';
import {
  CreateDeptInput,
  DeptsService,
  UpdateDeptInput,
} from '../../../modules/system/depts/depts.service';

/** dept.list Tool：查询部门树 */
@Injectable()
export class DeptListTool extends BaseCrudTool<DeptsService> {
  name = 'dept.list';
  description = '查询部门树形列表。只返回当前用户数据权限范围内的部门。';
  permission = 'system:dept:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = { type: 'object', properties: {} };
  action = 'list' as const;

  constructor(service: DeptsService) {
    super(service);
  }

  protected override async doList(
    _input: Record<string, unknown>,
    context: ToolContext,
  ) {
    return this.service.list(context.actor);
  }
}

/** dept.get Tool：查询单个部门详情 */
@Injectable()
export class DeptGetTool extends BaseCrudTool<DeptsService> {
  name = 'dept.get';
  description = '查询单个部门的详细信息。';
  permission = 'system:dept:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '部门 ID' },
    },
    required: ['id'],
  };
  action = 'get' as const;

  constructor(service: DeptsService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    return this.service.findOne(Number(input.id));
  }
}

/** dept.create Tool：创建部门 */
@Injectable()
export class DeptCreateTool extends BaseCrudTool<DeptsService> {
  name = 'dept.create';
  description =
    '创建一个新部门。需要提供名称，可选上级部门、排序、负责人、电话、邮箱、状态。';
  permission = 'system:dept:create';
  riskLevel = RiskLevel.L1;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      parentId: { type: 'number', description: '上级部门 ID（默认 0 为顶级）' },
      name: { type: 'string', description: '部门名称（1-50 字符）' },
      sort: { type: 'number', description: '排序' },
      leaderUserId: { type: 'number', description: '负责人用户 ID' },
      phone: { type: 'string', description: '联系电话' },
      email: { type: 'string', description: '邮箱' },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
    },
    required: ['name'],
  };
  action = 'create' as const;

  constructor(service: DeptsService) {
    super(service);
  }

  protected override async doCreate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const result = await this.service.create(
      this.extractFields(input) as CreateDeptInput,
      this.actorId(context),
    );
    return { ...result, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `创建部门「${String(input.name)}」`,
      affectedCount: 1,
      after: { name: input.name, parentId: input.parentId ?? 0 },
      undoable: true,
    };
  }
}

/** dept.update Tool：更新部门 */
@Injectable()
export class DeptUpdateTool extends BaseCrudTool<DeptsService> {
  name = 'dept.update';
  description =
    '更新部门信息，可修改上级部门、名称、排序、负责人、电话、邮箱、状态。';
  permission = 'system:dept:update';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '部门 ID' },
      parentId: { type: 'number', description: '上级部门 ID' },
      name: { type: 'string', description: '部门名称' },
      sort: { type: 'number', description: '排序' },
      leaderUserId: { type: 'number', description: '负责人用户 ID' },
      phone: { type: 'string', description: '联系电话' },
      email: { type: 'string', description: '邮箱' },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
    },
    required: ['id'],
  };
  action = 'update' as const;

  constructor(service: DeptsService) {
    super(service);
  }

  protected override async doUpdate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const id = Number(input.id);
    await this.service.update(
      id,
      this.extractFields(input) as UpdateDeptInput,
      this.actorId(context),
    );
    return { id, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `更新部门 #${String(input.id)}`,
      affectedCount: 1,
      after: this.extractFields(input),
      undoable: true,
    };
  }
}

/** dept.remove Tool：删除部门 */
@Injectable()
export class DeptRemoveTool extends BaseCrudTool<DeptsService> {
  name = 'dept.remove';
  description = '删除部门。存在子部门或已分配用户时无法删除。';
  permission = 'system:dept:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '部门 ID' },
    },
    required: ['id'],
  };
  action = 'remove' as const;

  constructor(service: DeptsService) {
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
      summary: `删除部门 #${String(input.id)}`,
      affectedCount: 1,
      undoable: false,
    };
  }
}
