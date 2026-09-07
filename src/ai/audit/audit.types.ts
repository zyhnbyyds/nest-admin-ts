import { RiskLevel } from '../ai.types';

/** 审计结果 */
export type AuditResult = 'allowed' | 'denied' | 'error';

/** 审计日志输入 */
export interface AuditLogInput {
  userId: number;
  sessionId?: number;
  action: string;
  toolName?: string;
  riskLevel?: RiskLevel;
  permission?: string;
  scope?: string;
  result: AuditResult;
  metadata?: Record<string, unknown>;
}
