import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { aiApprovals } from '../../database/schema/index';
import { AiErrorCode, AiException } from '../ai.types';
import { ActionIntentService } from './action-intent.service';

/**
 * Approval 服务：处理 AI 操作审批。
 *
 * 流程：ActionIntent → 用户确认/管理员审批 → 执行 Tool。
 */
@Injectable()
export class ApprovalService {
  constructor(
    private readonly database: DatabaseService,
    private readonly intentService: ActionIntentService,
  ) {}

  /** 批准操作 */
  async approve(intentId: number, approverId: number) {
    const intent = await this.intentService.getById(intentId);
    if (!intent) {
      throw new AiException(AiErrorCode.ACTION_EXPIRED, '操作意图不存在');
    }
    if (intent.status !== 'PENDING') {
      throw new AiException(AiErrorCode.ACTION_EXPIRED, '操作意图已处理');
    }
    await this.database.db.insert(aiApprovals).values({
      actionIntentId: intentId,
      approverId,
      status: 'APPROVED',
    });
    await this.intentService.updateStatus(intentId, 'APPROVED');
    return { id: intentId, status: 'APPROVED' };
  }

  /** 拒绝操作 */
  async reject(intentId: number, approverId: number, reason?: string) {
    const intent = await this.intentService.getById(intentId);
    if (!intent) {
      throw new AiException(AiErrorCode.ACTION_EXPIRED, '操作意图不存在');
    }
    if (intent.status !== 'PENDING') {
      throw new AiException(AiErrorCode.ACTION_EXPIRED, '操作意图已处理');
    }
    await this.database.db.insert(aiApprovals).values({
      actionIntentId: intentId,
      approverId,
      status: 'REJECTED',
      reason,
    });
    await this.intentService.updateStatus(intentId, 'REJECTED');
    return { id: intentId, status: 'REJECTED' };
  }
}
