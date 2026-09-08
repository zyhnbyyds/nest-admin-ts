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
  CreateRoleInput,
  RolesService,
  UpdateRoleInput,
} from '../../../modules/system/roles/roles.service';

/** role.list Tool：查询角色列表 */
@Injectable()
export class RoleListTool extends BaseCrudTool<RolesService> {
  name = 'role.list';
  description = '查询系统角色列表，可查看每个角色的数据权限范围与自定义部门。';
  permission = 'system:role:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = { type: 'object', properties: {} };
  action = 'list' as const;

  constructor(service: RolesService) {
    super(service);
  }

  protected override async doList() {
    return this.service.list();
  }
}

/** role.get Tool：查询单个角色详情 */
@Injectable()
export class RoleGetTool extends BaseCrudTool<RolesService> {
  name = 'role.get';
  description = '查询单个角色的详细信息，包括数据权限范围与自定义部门。';
  permission = 'system:role:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '角色 ID' },
    },
    required: ['id'],
  };
  action = 'get' as const;

  constructor(service: RolesService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    const id = Number(input.id);
    const roles = await this.service.list();
    const found = roles.find((role) => role.id === id);
    if (!found) {
      throw new AiException(AiErrorCode.BUSINESS_ERROR, '未找到该角色');
    }
    return found;
  }
}

/** role.create Tool：创建角色 */
@Injectable()
export class RoleCreateTool extends BaseCrudTool<RolesService> {
  name = 'role.create';
  description =
    '创建一个新角色。需要提供名称和标识，可选排序、数据权限范围、菜单权限、自定义部门。';
  permission = 'system:role:create';
  riskLevel = RiskLevel.L1;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: '角色名称（1-50 字符）' },
      key: {
        type: 'string',
        description: '角色标识（2-100 字符，小写字母数字下划线冒号连字符）',
      },
      sort: { type: 'number', description: '排序' },
      dataScope: {
        type: 'string',
        enum: ['all', 'custom', 'dept', 'dept_and_children', 'self'],
        description: '数据权限范围',
      },
      menuIds: {
        type: 'array',
        items: { type: 'number' },
        description: '菜单 ID 集合',
      },
      deptIds: {
        type: 'array',
        items: { type: 'number' },
        description: '自定义数据范围（dataScope=custom）时的部门 ID 集合',
      },
    },
    required: ['name', 'key'],
  };
  action = 'create' as const;

  constructor(service: RolesService) {
    super(service);
  }

  protected override async doCreate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const result = await this.service.create(
      this.extractFields(input) as CreateRoleInput,
      this.actorId(context),
    );
    return { ...result, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `创建角色「${String(input.name)}」`,
      affectedCount: 1,
      after: { name: input.name, key: input.key },
      undoable: true,
    };
  }
}

/** role.update Tool：更新角色 */
@Injectable()
export class RoleUpdateTool extends BaseCrudTool<RolesService> {
  name = 'role.update';
  description =
    '更新角色信息，可修改名称、标识、排序、数据权限范围、状态、备注、自定义部门。';
  permission = 'system:role:update';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '角色 ID' },
      name: { type: 'string', description: '角色名称' },
      key: { type: 'string', description: '角色标识' },
      sort: { type: 'number', description: '排序' },
      dataScope: {
        type: 'string',
        enum: ['all', 'custom', 'dept', 'dept_and_children', 'self'],
        description: '数据权限范围',
      },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
      remark: { type: 'string', description: '备注' },
      deptIds: {
        type: 'array',
        items: { type: 'number' },
        description: '自定义数据范围部门 ID 集合',
      },
    },
    required: ['id'],
  };
  action = 'update' as const;

  constructor(service: RolesService) {
    super(service);
  }

  protected override async doUpdate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const id = Number(input.id);
    await this.service.update(
      id,
      this.extractFields(input) as UpdateRoleInput,
      this.actorId(context),
    );
    return { id, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `更新角色 #${String(input.id)}`,
      affectedCount: 1,
      after: this.extractFields(input),
      undoable: true,
    };
  }
}

/** role.remove Tool：删除角色（支持批量） */
@Injectable()
export class RoleRemoveTool extends BaseCrudTool<RolesService> {
  name = 'role.remove';
  description =
    '删除角色（支持批量）。删除后角色关联的菜单、用户关系一并清理。';
  permission = 'system:role:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '角色 ID（与 ids 二选一）' },
      ids: {
        type: 'array',
        items: { type: 'number' },
        description: '批量角色 ID 集合（与 id 二选一）',
      },
    },
  };
  action = 'remove' as const;

  constructor(service: RolesService) {
    super(service);
  }

  protected override async doRemove(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const ids = this.resolveTargetIds(input);
    for (const id of ids) {
      await this.service.remove(id, this.actorId(context));
    }
    return { removed: ids.length, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    const ids = this.resolveTargetIds(input);
    return {
      summary: `删除 ${ids.length} 个角色`,
      affectedCount: ids.length,
      undoable: false,
    };
  }
}
