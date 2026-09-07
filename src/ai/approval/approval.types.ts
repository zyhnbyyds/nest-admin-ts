import { RiskLevel } from '../ai.types';

/** 操作意图状态 */
export type ActionIntentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'EXECUTED'
  | 'CANCELLED';

/** 创建操作意图 */
export interface CreateActionIntentInput {
  sessionId?: number;
  userId: number;
  toolName: string;
  input: Record<string, unknown>;
  riskLevel: RiskLevel;
  confirmToken: string;
  beforeHash?: string | undefined;
}

/** 验证操作意图（确认执行时） */
export interface ValidateActionIntentInput {
  intentId: number;
  confirmToken: string;
  userId: number;
  toolName: string;
  input: Record<string, unknown>;
}
