import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { ToolContext, ToolPreview } from '../tool.interface';
import { BaseCrudTool } from '../base/base-crud.tool';
import {
  CreateMenuInput,
  MenusService,
  UpdateMenuInput,
} from '../../../modules/system/menus/menus.service';

/** menu.list Tool：查询菜单树 */
@Injectable()
export class MenuListTool extends BaseCrudTool<MenusService> {
  name = 'menu.list';
  description = '查询系统菜单树形列表（目录、菜单、按钮）。';
  permission = 'system:menu:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = { type: 'object', properties: {} };
  action = 'list' as const;

  constructor(service: MenusService) {
    super(service);
  }

  protected override async doList() {
    return this.service.list();
  }
}

/** menu.get Tool：查询单个菜单详情 */
@Injectable()
export class MenuGetTool extends BaseCrudTool<MenusService> {
  name = 'menu.get';
  description = '查询单个菜单的详细信息。';
  permission = 'system:menu:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '菜单 ID' },
    },
    required: ['id'],
  };
  action = 'get' as const;

  constructor(service: MenusService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    return this.service.findOne(Number(input.id));
  }
}

/** menu.create Tool：创建菜单 */
@Injectable()
export class MenuCreateTool extends BaseCrudTool<MenusService> {
  name = 'menu.create';
  description =
    '创建一个新菜单。需要提供名称、标题、类型（M 目录 / C 菜单 / F 按钮），可选路径、组件、权限标识、图标、排序、状态等。';
  permission = 'system:menu:create';
  riskLevel = RiskLevel.L1;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      parentId: { type: 'number', description: '上级菜单 ID（默认 0 为顶级）' },
      name: { type: 'string', description: '路由名称（1-100 字符）' },
      title: { type: 'string', description: '菜单标题（1-100 字符）' },
      type: {
        type: 'string',
        enum: ['M', 'C', 'F'],
        description: '类型：M 目录 / C 菜单 / F 按钮',
      },
      path: { type: 'string', description: '路由路径' },
      component: { type: 'string', description: '组件路径' },
      permission: { type: 'string', description: '权限标识' },
      icon: { type: 'string', description: '图标' },
      sort: { type: 'number', description: '排序' },
      visible: { type: 'boolean', description: '是否可见' },
      cacheable: { type: 'boolean', description: '是否缓存' },
      external: { type: 'boolean', description: '是否外链' },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
    },
    required: ['name', 'title', 'type'],
  };
  action = 'create' as const;

  constructor(service: MenusService) {
    super(service);
  }

  protected override async doCreate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const result = await this.service.create(
      this.extractFields(input) as CreateMenuInput,
      this.actorId(context),
    );
    return { ...result, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `创建菜单「${String(input.title)}」`,
      affectedCount: 1,
      after: { title: input.title, type: input.type },
      undoable: true,
    };
  }
}

/** menu.update Tool：更新菜单 */
@Injectable()
export class MenuUpdateTool extends BaseCrudTool<MenusService> {
  name = 'menu.update';
  description =
    '更新菜单信息，可修改名称、标题、类型、路径、组件、权限标识、图标、排序、状态等。';
  permission = 'system:menu:update';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '菜单 ID' },
      parentId: { type: 'number', description: '上级菜单 ID' },
      name: { type: 'string', description: '路由名称' },
      title: { type: 'string', description: '菜单标题' },
      type: {
        type: 'string',
        enum: ['M', 'C', 'F'],
        description: '类型：M 目录 / C 菜单 / F 按钮',
      },
      path: { type: 'string', description: '路由路径' },
      component: { type: 'string', description: '组件路径' },
      permission: { type: 'string', description: '权限标识' },
      icon: { type: 'string', description: '图标' },
      sort: { type: 'number', description: '排序' },
      visible: { type: 'boolean', description: '是否可见' },
      cacheable: { type: 'boolean', description: '是否缓存' },
      external: { type: 'boolean', description: '是否外链' },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
    },
    required: ['id'],
  };
  action = 'update' as const;

  constructor(service: MenusService) {
    super(service);
  }

  protected override async doUpdate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const id = Number(input.id);
    await this.service.update(
      id,
      this.extractFields(input) as UpdateMenuInput,
      this.actorId(context),
    );
    return { id, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `更新菜单 #${String(input.id)}`,
      affectedCount: 1,
      after: this.extractFields(input),
      undoable: true,
    };
  }
}

/** menu.remove Tool：删除菜单 */
@Injectable()
export class MenuRemoveTool extends BaseCrudTool<MenusService> {
  name = 'menu.remove';
  description = '删除菜单。存在子菜单时无法删除。';
  permission = 'system:menu:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '菜单 ID' },
    },
    required: ['id'],
  };
  action = 'remove' as const;

  constructor(service: MenusService) {
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
      summary: `删除菜单 #${String(input.id)}`,
      affectedCount: 1,
      undoable: false,
    };
  }
}
