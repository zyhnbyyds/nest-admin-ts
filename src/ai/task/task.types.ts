import { RiskLevel } from '../ai.types';

/** 任务状态 */
export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

/** 任务步骤状态 */
export type TaskStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED'
  | 'WAITING_APPROVAL';

/** 任务步骤定义 */
export interface TaskStep {
  toolName: string;
  input: Record<string, unknown>;
  riskLevel: RiskLevel;
  /** 等待审批时的 intentId */
  intentId?: number;
}

/** 创建任务 */
export interface CreateTaskInput {
  sessionId?: number;
  userId: number;
  goal: string;
  riskLevel: RiskLevel;
}

/** 任务执行回调（用于 SSE 推送步骤状态） */
export interface TaskProgressCallback {
  onStepStart?: (step: {
    index: number;
    toolName: string;
    input: Record<string, unknown>;
  }) => void;
  onStepResult?: (step: {
    index: number;
    toolName: string;
    result: unknown;
  }) => void;
}
