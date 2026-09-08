import { RiskLevel } from '../ai.types';

/**
 * 会话历史消息（用于注入 LLM 上下文）。
 *
 * 仅承载纯文本轮次（user/assistant），不含 tool 调用细节，
 * 避免跨请求还原 tool 消息配对（tool_call_id）带来的复杂性与兼容问题。
 */
export type AgentHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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
  /** 关联的任务 ID（多步任务） */
  taskId?: number;
  /** 会话历史（按时间正序），供 LLM 携带多轮对话上下文 */
  history?: AgentHistoryMessage[];
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
  /** 关联任务（多步任务时存在） */
  taskId?: number;
}

/** Agent 接口 */
export interface IAgent {
  run(context: AgentContext): Promise<AgentResult>;
}
