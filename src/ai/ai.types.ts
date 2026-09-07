/**
 * AI Operations Layer 共享类型。
 *
 * 核心原则：LLM ≠ 权限系统、LLM ≠ 数据库、LLM ≠ 业务逻辑、LLM ≠ 安全边界。
 * 真正的安全边界必须由后端代码控制。
 */
import { HttpException } from '@nestjs/common';

/** 风险等级 */
export enum RiskLevel {
  /** 只读查询 */
  L0 = 'L0',
  /** 低风险写操作（如修改昵称） */
  L1 = 'L1',
  /** 中风险（如修改角色） */
  L2 = 'L2',
  /** 高风险（如删除用户） */
  L3 = 'L3',
}

/** 审批策略 */
export enum ApprovalPolicy {
  /** 无需审批，自动执行 */
  NONE = 'NONE',
  /** 需要用户确认 */
  CONFIRM = 'CONFIRM',
  /** 需要管理员审批 */
  APPROVAL = 'APPROVAL',
  /** 默认禁用，不注册给 AI */
  DISABLED = 'DISABLED',
}

/** Tool 限制 */
export interface ToolLimits {
  /** 批量操作最大条数 */
  maxItems?: number;
  /** 是否允许批量 */
  allowBatch?: boolean;
  /** 是否支持 dry run */
  dryRun?: boolean;
  /** 是否支持撤销 */
  undoable?: boolean;
}

/** 数据权限范围 */
export enum DataScope {
  SELF = 'SELF',
  DEPARTMENT = 'DEPARTMENT',
  ORGANIZATION = 'ORGANIZATION',
  TENANT = 'TENANT',
  ALL = 'ALL',
}

/** 当前请求操作人（来自 JWT claims，与 AccessTokenGuard 设置的 request.user 一致） */
export interface AiActor {
  id: number;
  username: string;
  roles: string[];
  permissions: string[];
}

/** AI 错误码 */
export enum AiErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SCOPE_DENIED = 'SCOPE_DENIED',
  RISK_DENIED = 'RISK_DENIED',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  ACTION_EXPIRED = 'ACTION_EXPIRED',
  ACTION_STALE = 'ACTION_STALE',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  LLM_ERROR = 'LLM_ERROR',
}

/** AI 业务异常（继承 HttpException，由 GlobalExceptionFilter 透传状态码与响应体） */
export class AiException extends HttpException {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string, status = 400) {
    super({ statusCode: status, message, error: code }, status);
    this.name = 'AiException';
    this.code = code;
  }
}
