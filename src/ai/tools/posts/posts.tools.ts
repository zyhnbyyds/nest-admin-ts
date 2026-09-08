import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { ToolContext, ToolPreview } from '../tool.interface';
import { BaseCrudTool } from '../base/base-crud.tool';
import {
  CreatePostInput,
  PostsService,
  UpdatePostInput,
} from '../../../modules/system/posts/posts.service';

/** post.list Tool：查询岗位列表 */
@Injectable()
export class PostListTool extends BaseCrudTool<PostsService> {
  name = 'post.list';
  description = '查询系统岗位列表，支持分页。';
  permission = 'system:post:list';
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

  constructor(service: PostsService) {
    super(service);
  }

  protected override async doList(input: Record<string, unknown>) {
    const { page, pageSize } = this.parsePagination(input);
    return this.service.list(page, pageSize);
  }
}

/** post.get Tool：查询单个岗位详情 */
@Injectable()
export class PostGetTool extends BaseCrudTool<PostsService> {
  name = 'post.get';
  description = '查询单个岗位的详细信息。';
  permission = 'system:post:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '岗位 ID' },
    },
    required: ['id'],
  };
  action = 'get' as const;

  constructor(service: PostsService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    return this.service.findOne(Number(input.id));
  }
}

/** post.create Tool：创建岗位 */
@Injectable()
export class PostCreateTool extends BaseCrudTool<PostsService> {
  name = 'post.create';
  description = '创建一个新岗位。需要提供名称和标识，可选排序、状态、备注。';
  permission = 'system:post:create';
  riskLevel = RiskLevel.L1;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: '岗位名称（1-50 字符）' },
      key: {
        type: 'string',
        description: '岗位标识（2-100 字符，小写字母数字下划线冒号连字符）',
      },
      sort: { type: 'number', description: '排序' },
      status: {
        type: 'string',
        enum: ['active', 'disabled'],
        description: '状态',
      },
      remark: { type: 'string', description: '备注' },
    },
    required: ['name', 'key'],
  };
  action = 'create' as const;

  constructor(service: PostsService) {
    super(service);
  }

  protected override async doCreate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const result = await this.service.create(
      this.extractFields(input) as CreatePostInput,
      this.actorId(context),
    );
    return { ...result, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `创建岗位「${String(input.name)}」`,
      affectedCount: 1,
      after: { name: input.name, key: input.key },
      undoable: true,
    };
  }
}

/** post.update Tool：更新岗位 */
@Injectable()
export class PostUpdateTool extends BaseCrudTool<PostsService> {
  name = 'post.update';
  description = '更新岗位信息，可修改名称、标识、排序、状态、备注。';
  permission = 'system:post:update';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '岗位 ID' },
      name: { type: 'string', description: '岗位名称' },
      key: { type: 'string', description: '岗位标识' },
      sort: { type: 'number', description: '排序' },
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

  constructor(service: PostsService) {
    super(service);
  }

  protected override async doUpdate(
    input: Record<string, unknown>,
    context: ToolContext,
  ) {
    const id = Number(input.id);
    await this.service.update(
      id,
      this.extractFields(input) as UpdatePostInput,
      this.actorId(context),
    );
    return { id, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `更新岗位 #${String(input.id)}`,
      affectedCount: 1,
      after: this.extractFields(input),
      undoable: true,
    };
  }
}

/** post.remove Tool：删除岗位 */
@Injectable()
export class PostRemoveTool extends BaseCrudTool<PostsService> {
  name = 'post.remove';
  description = '删除岗位。删除后岗位与用户的关联关系一并清理。';
  permission = 'system:post:delete';
  riskLevel = RiskLevel.L3;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '岗位 ID' },
    },
    required: ['id'],
  };
  action = 'remove' as const;

  constructor(service: PostsService) {
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
      summary: `删除岗位 #${String(input.id)}`,
      affectedCount: 1,
      undoable: false,
    };
  }
}
