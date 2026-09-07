import { RiskLevel } from '../ai.types';

/** Agent 上下文 */
export interface AgentContext {
  sessionId: string;
  user: {
    id: string;
    username: string;
    roles: string[];
    permissions: string[];
  };
  message: string;
  metadata?: Record<string, unknown>;
}

/** Agent 结果 */
export interface AgentResult {
  /** 最终回复内容 */
  content: string;
  /** 是否调用了 Tool */
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  }>;
  /** 是否等待审批 */
  waitingApproval: boolean;
  /** 风险等级 */
  riskLevel: RiskLevel;
}

/** Agent 接口 */
export interface IAgent {
  run(context: AgentContext): Promise<AgentResult>;
}
