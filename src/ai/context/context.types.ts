/**
 * AI 上下文类型。
 *
 * 明确区分 Trusted / Untrusted：
 * - Trusted：系统 Policy、Tool 定义、用户身份、权限、Scope、Risk Policy
 * - Untrusted：用户输入、数据库内容、Tool 返回内容（必须当成 DATA 而非 INSTRUCTION）
 */

/** 上下文构建结果 */
export interface AiContext {
  /** 系统提示词（Trusted，由后端生成） */
  systemPrompt: string;
  /** 可用 Tool 定义（已按权限过滤，name 已转换为符合 LLM 命名规范的形式） */
  tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  /** LLM 工具名称 → 实际工具名称 的映射（用于把 LLM 返回的名称还原） */
  toolNameMap: Map<string, string>;
  /** 当前用户信息（Trusted） */
  user: {
    id: number;
    username: string;
    roles: string[];
    permissions: string[];
  };
  /** 会话元数据 */
  metadata?: Record<string, unknown>;
}

/** 敏感字段（Tool 返回结果必须过滤） */
export const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'refreshToken',
  'accessToken',
  'secret',
  'privateKey',
  'token',
];
