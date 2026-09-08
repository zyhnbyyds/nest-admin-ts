import {
  AiErrorCode,
  AiException,
  ApprovalPolicy,
  RiskLevel,
} from '../../ai.types';
import { AiTool, ToolContext, ToolPreview } from '../tool.interface';

/**
 * 通用 CRUD Tool 基类。
 *
 * 每个 Tool 对应一个 CRUD 操作（list / get / create / update / remove），
 * 基类封装了所有 CRUD 工具的通用逻辑：
 * - 分页参数解析（page/pageSize，pageSize 上限 100）
 * - actorId 注入（create/update/remove 均需当前操作人）
 * - 目标 ID 解析（id / ids，支持批量）
 * - 操作字段提取（排除 id/ids/page/pageSize 等控制字段）
 * - 统一的 preview 生成（L2/L3 操作确认）
 *
 * 子类只需实现对应操作的委托方法（doList/doGet/doCreate/doUpdate/doRemove），
 * 其余方法默认抛「不支持」异常，避免重复样板代码。
 */
export abstract class BaseCrudTool<TService> implements AiTool {
  abstract name: string;
  abstract description: string;
  abstract permission: string;
  abstract riskLevel: RiskLevel;
  abstract approvalPolicy: ApprovalPolicy;
  abstract inputSchema: Record<string, unknown>;

  constructor(protected readonly service: TService) {}

  /** 批量操作最大条数 */
  protected maxItems = 100;

  /** 列表委托（子类按需实现） */
  protected doList?(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown>;
  /** 详情委托（子类按需实现） */
  protected doGet?(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown>;
  /** 新增委托（子类按需实现） */
  protected doCreate?(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown>;
  /** 修改委托（子类按需实现） */
  protected doUpdate?(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown>;
  /** 删除委托（子类按需实现） */
  protected doRemove?(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown>;
  /** 预览委托（子类按需实现，L2/L3 必须） */
  protected doPreview?(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolPreview>;

  /** 执行入口：分发到对应操作的委托方法 */
  async execute(input: Record<string, unknown>, context: ToolContext) {
    const handler = this.handlerFor(this.action);
    if (!handler) {
      throw new AiException(
        AiErrorCode.VALIDATION_ERROR,
        `该工具不支持 ${this.action} 操作`,
      );
    }
    return handler.call(this, input, context);
  }

  /** 预览入口：L2/L3 操作确认 */
  async preview(input: Record<string, unknown>, context: ToolContext) {
    if (!this.doPreview) {
      throw new AiException(
        AiErrorCode.VALIDATION_ERROR,
        '该工具不支持操作预览',
      );
    }
    return this.doPreview(input, context);
  }

  /** 根据操作类型获取对应的委托方法 */
  private handlerFor(
    action: 'list' | 'get' | 'create' | 'update' | 'remove',
  ):
    | ((
        input: Record<string, unknown>,
        context: ToolContext,
      ) => Promise<unknown>)
    | undefined {
    switch (action) {
      case 'list':
        return this.doList;
      case 'get':
        return this.doGet;
      case 'create':
        return this.doCreate;
      case 'update':
        return this.doUpdate;
      case 'remove':
        return this.doRemove;
    }
  }

  /** 解析分页参数 */
  protected parsePagination(input: Record<string, unknown>): {
    page: number;
    pageSize: number;
  } {
    const page = Math.max(Number(input?.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(input?.pageSize) || 20, 1), 100);
    return { page, pageSize };
  }

  /** 解析目标 ID（id 或 ids，支持批量） */
  protected resolveTargetIds(input: Record<string, unknown>): number[] {
    if (Array.isArray(input?.ids)) {
      const ids = (input.ids as unknown[]).map(Number);
      if (ids.length > this.maxItems) {
        throw new AiException(
          AiErrorCode.RISK_DENIED,
          `批量操作超过限制（最大 ${this.maxItems} 条）`,
        );
      }
      return ids;
    }
    if (input?.id !== undefined) return [Number(input.id)];
    throw new AiException(AiErrorCode.VALIDATION_ERROR, '请提供 id 或 ids');
  }

  /** 提取操作字段（排除 id/ids/page/pageSize 等控制字段） */
  protected extractFields(
    input: Record<string, unknown>,
    exclude: string[] = [],
  ): Record<string, unknown> {
    const control = new Set(['id', 'ids', 'page', 'pageSize', ...exclude]);
    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!control.has(key) && value !== undefined) fields[key] = value;
    }
    return fields;
  }

  /** 当前操作人 ID */
  protected actorId(context: ToolContext): number {
    return context.actor.id;
  }

  /** 子类声明本 Tool 对应的操作 */
  protected abstract action: 'list' | 'get' | 'create' | 'update' | 'remove';
}
