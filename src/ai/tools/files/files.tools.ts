import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { ToolPreview } from '../tool.interface';
import { BaseCrudTool } from '../base/base-crud.tool';
import { FilesService } from '../../../modules/files/files.service';

/** file.list Tool：查询文件列表 */
@Injectable()
export class FileListTool extends BaseCrudTool<FilesService> {
  name = 'file.list';
  description = '查询已上传文件列表，支持分页。';
  permission = 'system:file:list';
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

  constructor(service: FilesService) {
    super(service);
  }

  protected override async doList(input: Record<string, unknown>) {
    const { page, pageSize } = this.parsePagination(input);
    return this.service.list(page, pageSize);
  }
}

/** file.get Tool：查询单个文件详情 */
@Injectable()
export class FileGetTool extends BaseCrudTool<FilesService> {
  name = 'file.get';
  description = '查询单个文件的详细信息。';
  permission = 'system:file:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '文件 ID' },
    },
    required: ['id'],
  };
  action = 'get' as const;

  constructor(service: FilesService) {
    super(service);
  }

  protected override async doGet(input: Record<string, unknown>) {
    return this.service.detail(Number(input.id));
  }
}

/** file.remove Tool：删除文件 */
@Injectable()
export class FileRemoveTool extends BaseCrudTool<FilesService> {
  name = 'file.remove';
  description = '删除文件（支持批量）。删除后物理文件一并移除。';
  permission = 'system:file:delete';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number', description: '文件 ID（与 ids 二选一）' },
      ids: {
        type: 'array',
        items: { type: 'number' },
        description: '批量文件 ID 集合（与 id 二选一）',
      },
    },
  };
  action = 'remove' as const;

  constructor(service: FilesService) {
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
      summary: `删除 ${ids.length} 个文件`,
      affectedCount: ids.length,
      undoable: false,
    };
  }
}
