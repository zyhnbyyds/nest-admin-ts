import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { aiActionIntents } from '../../database/schema/index';
import { AiErrorCode, AiException } from '../ai.types';
import {
  ActionIntentStatus,
  CreateActionIntentInput,
  ValidateActionIntentInput,
} from './approval.types';

/**
 * ActionIntent 服务：管理待审批的 AI 操作意图。
 *
 * 职责：
 * - 创建 ActionIntent（生成 confirmToken、inputHash、beforeHash）
 * - 验证 ActionIntent（校验 token、有效期、userId、toolName、inputHash）
 * - 更新状态
 *
 * ConfirmToken 要求：一次性、短期有效、绑定 userId/sessionId/toolName/inputHash。
 */
@Injectable()
export class ActionIntentService {
  constructor(private readonly database: DatabaseService) {}

  /** 生成 confirmToken */
  static generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /** 计算 input hash（稳定序列化，避免键顺序差异导致 hash 不一致） */
  static hashInput(input: Record<string, unknown>): string {
    return ActionIntentService.hashValue(input ?? {});
  }

  /** 通用 hash（用于计算 before/after 数据快照） */
  static hashValue(value: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(stableSort(value)))
      .digest('hex');
  }

  /** 创建 ActionIntent */
  async create(input: CreateActionIntentInput) {
    const inputHash = ActionIntentService.hashInput(input.input);
    // 5 分钟有效
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const [result] = await this.database.db.insert(aiActionIntents).values({
      sessionId: input.sessionId,
      userId: input.userId,
      toolName: input.toolName,
      input: input.input,
      inputHash,
      confirmToken: input.confirmToken,
      riskLevel: input.riskLevel,
      status: 'PENDING',
      expiresAt,
      beforeHash: input.beforeHash,
      taskId: input.taskId,
      taskStepId: input.taskStepId,
    });
    const id = Number(result.insertId);
    return this.getById(id);
  }

  /** 验证 ActionIntent（确认执行前调用） */
  async validate(input: ValidateActionIntentInput) {
    const intent = await this.getById(input.intentId);
    if (!intent) {
      throw new AiException(AiErrorCode.ACTION_EXPIRED, '操作意图不存在');
    }
    if (intent.status !== 'PENDING') {
      throw new AiException(AiErrorCode.ACTION_EXPIRED, '操作意图已处理');
    }
    if (new Date(intent.expiresAt).getTime() < Date.now()) {
      throw new AiException(AiErrorCode.ACTION_EXPIRED, '操作已过期');
    }
    if (intent.confirmToken !== input.confirmToken) {
      throw new AiException(AiErrorCode.ACTION_STALE, '确认令牌无效');
    }
    if (intent.userId !== input.userId) {
      throw new AiException(AiErrorCode.PERMISSION_DENIED, '操作人不匹配');
    }
    if (intent.toolName !== input.toolName) {
      throw new AiException(AiErrorCode.ACTION_STALE, '工具不匹配');
    }
    const inputHash = ActionIntentService.hashInput(input.input);
    if (intent.inputHash !== inputHash) {
      throw new AiException(AiErrorCode.ACTION_STALE, '操作参数已变化');
    }
    return intent;
  }

  /** 校验数据快照（TOCTOU 防护：预览后数据变化则拒绝执行） */
  assertUnchanged(
    beforeHash: string | null | undefined,
    currentValue: unknown,
  ): void {
    if (!beforeHash) return;
    const currentHash = ActionIntentService.hashValue(currentValue);
    if (beforeHash !== currentHash) {
      throw new AiException(AiErrorCode.ACTION_STALE, '数据已变化，请重新预览');
    }
  }

  /** 获取 ActionIntent */
  async getById(id: number) {
    const [intent] = await this.database.db
      .select()
      .from(aiActionIntents)
      .where(eq(aiActionIntents.id, id))
      .limit(1);
    return intent;
  }

  /**
   * 查找同一会话、同一工具、相同参数下仍处于 PENDING 的 ActionIntent。
   *
   * 用于避免 LLM 重复调用同一审批操作时创建多个重复 intent。
   */
  async findPendingByHash(
    sessionId: number,
    toolName: string,
    inputHash: string,
  ) {
    const [intent] = await this.database.db
      .select()
      .from(aiActionIntents)
      .where(
        and(
          eq(aiActionIntents.sessionId, sessionId),
          eq(aiActionIntents.toolName, toolName),
          eq(aiActionIntents.inputHash, inputHash),
          eq(aiActionIntents.status, 'PENDING'),
        ),
      )
      .orderBy(aiActionIntents.id)
      .limit(1);
    return intent;
  }

  /** 更新状态 */
  async updateStatus(
    id: number,
    status: ActionIntentStatus,
    executedAt?: Date,
  ) {
    await this.database.db
      .update(aiActionIntents)
      .set({ status, executedAt: executedAt ?? null })
      .where(eq(aiActionIntents.id, id));
  }
}

/** 递归对对象键排序，生成稳定序列化结果（用于 hash 一致性） */
function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = stableSort((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}
