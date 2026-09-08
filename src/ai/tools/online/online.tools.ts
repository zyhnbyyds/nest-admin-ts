import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { ToolPreview } from '../tool.interface';
import { BaseCrudTool } from '../base/base-crud.tool';
import { OnlineService } from '../../../modules/monitor/online/online.service';

/** online.list Tool：查询在线用户 */
@Injectable()
export class OnlineListTool extends BaseCrudTool<OnlineService> {
  name = 'online.list';
  description = '查询当前在线用户列表。';
  permission = 'monitor:online:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = { type: 'object', properties: {} };
  action = 'list' as const;

  constructor(service: OnlineService) {
    super(service);
  }

  protected override async doList() {
    return this.service.list();
  }
}

/** online.forceLogout Tool：强制下线在线用户 */
@Injectable()
export class OnlineForceLogoutTool extends BaseCrudTool<OnlineService> {
  name = 'online.forceLogout';
  description = '强制下线指定在线用户，并吊销其刷新令牌。';
  permission = 'monitor:online:delete';
  riskLevel = RiskLevel.L2;
  approvalPolicy = ApprovalPolicy.CONFIRM;
  inputSchema = {
    type: 'object',
    properties: {
      userId: { type: 'number', description: '用户 ID' },
    },
    required: ['userId'],
  };
  action = 'remove' as const;

  constructor(service: OnlineService) {
    super(service);
  }

  protected override async doRemove(input: Record<string, unknown>) {
    const userId = Number(input.userId);
    await this.service.forceLogout(userId);
    return { userId, success: true };
  }

  protected override async doPreview(
    input: Record<string, unknown>,
  ): Promise<ToolPreview> {
    return {
      summary: `强制下线用户 #${String(input.userId)}`,
      affectedCount: 1,
      undoable: false,
    };
  }
}
