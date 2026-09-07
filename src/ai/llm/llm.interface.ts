/**
 * LLM 抽象接口。
 *
 * 禁止业务代码直接依赖 DeepSeek SDK。所有 LLM 调用必须经过此接口，
 * 未来可以替换 DeepSeek / OpenAI / Anthropic / Gemini / 本地模型 / OpenRouter
 * 而不修改 Agent。
 */

/** LLM 消息角色 */
export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

/** LLM 消息 */
export interface LlmMessage {
  role: LlmRole;
  content: string;
  /** tool 消息对应的 tool_call_id */
  toolCallId?: string;
  /** assistant 消息携带的 tool 调用（用于多轮 tool 调用历史） */
  toolCalls?: LlmToolCall[];
}

/** LLM Tool 定义（提供给 LLM 的 JSON Schema） */
export interface LlmToolDefinition {
  name: string;
  description: string;
  /** JSON Schema，描述工具入参 */
  parameters: Record<string, unknown>;
}

/** LLM Tool 调用（LLM 返回的请求） */
export interface LlmToolCall {
  id: string;
  name: string;
  /** 已解析的参数对象 */
  arguments: Record<string, unknown>;
}

/** LLM 聊天请求 */
export interface LlmChatRequest {
  messages: LlmMessage[];
  tools?: LlmToolDefinition[];
  /** 是否允许 tool 调用 */
  toolChoice?: 'auto' | 'none' | 'required';
  temperature?: number;
  maxTokens?: number;
}

/** LLM 聊天响应 */
export interface LlmChatResponse {
  content: string;
  toolCalls: LlmToolCall[];
  /** 原始响应（用于审计/调试） */
  raw?: unknown;
}

/** LLM Provider 统一接口 */
export interface LlmProvider {
  readonly name: string;
  chat(request: LlmChatRequest): Promise<LlmChatResponse>;
}
