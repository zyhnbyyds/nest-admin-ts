import { ApprovalPolicy, RiskLevel, ToolLimits } from '../ai.types';

/** Tool 执行上下文 */
export interface ToolContext {
  /** 当前操作人 */
  actor: {
    id: number;
    username: string;
    roles: string[];
    permissions: string[];
  };
  /** 会话 ID */
  sessionId: string;
  /** 数据权限范围（由 ScopeService 解析，AI 不能提供） */
  scope: {
    kind: 'all' | 'self' | 'deptIds';
    ids?: number[];
  };
  /** 请求 ID（用于日志追踪） */
  requestId: string;
}

/** Tool 预览结果（用于 L2/L3 操作确认） */
export interface ToolPreview {
  /** 人类可读的预览描述 */
  summary: string;
  /** 影响对象数量 */
  affectedCount: number;
  /** 修改前快照 */
  before?: unknown;
  /** 修改后快照 */
  after?: unknown;
  /** 是否可撤销 */
  undoable?: boolean;
}

/** 统一 Tool 接口 */
export interface AiTool<TInput = unknown, TResult = unknown> {
  /** Tool 名称，如 user.list */
  name: string;
  /** 描述（提供给 LLM） */
  description: string;
  /** 所需权限，如 user:read */
  permission: string;
  /** 基础风险等级 */
  riskLevel: RiskLevel;
  /** 审批策略 */
  approvalPolicy: ApprovalPolicy;
  /** 入参 JSON Schema */
  inputSchema: Record<string, unknown>;
  /** 限制 */
  limits?: ToolLimits;
  /** 预览（L2/L3 操作必须支持） */
  preview?(input: TInput, context: ToolContext): Promise<ToolPreview>;
  /** 执行 */
  execute(input: TInput, context: ToolContext): Promise<TResult>;
  /** 回滚（可选） */
  rollback?(input: TInput, context: ToolContext): Promise<void>;
}
