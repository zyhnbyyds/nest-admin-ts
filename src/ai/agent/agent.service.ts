import { Injectable } from '@nestjs/common';
import { AiActor, AiErrorCode, AiException, RiskLevel } from '../ai.types';
import { AuditService } from '../audit/audit.service';
import { ContextBuilder } from '../context/context.builder';
import { ContextSanitizer } from '../context/context.sanitizer';
import { LlmMessage } from '../llm/llm.interface';
import { LlmService } from '../llm/llm.service';
import { PolicyEngine } from '../policy/policy.engine';
import { ToolContext } from '../tools/tool.interface';
import { ToolExecutor } from '../tools/tool.executor';
import { ToolRegistry } from '../tools/tool.registry';
import { AgentContext, AgentResult } from './agent.types';

/** Agent 事件（用于 SSE 实时推送） */
export type AgentEvent =
  | { type: 'thinking'; data: { message: string } }
  | {
      type: 'tool_call';
      data: { name: string; arguments: Record<string, unknown> };
    }
  | { type: 'tool_result'; data: { name: string; result: unknown } }
  | {
      type: 'approval_required';
      data: {
        toolName: string;
        input: Record<string, unknown>;
        riskLevel: RiskLevel;
      };
    }
  | { type: 'message'; data: { content: string } }
  | { type: 'error'; data: { code: AiErrorCode; message: string } };

/**
 * Agent：整个 AI 系统的大脑。
 *
 * 职责：
 * 1. 接收用户请求
 * 2. 获取当前用户身份
 * 3. 获取可用 Tools
 * 4. 将 Tool 定义提供给 LLM
 * 5. 解析 LLM 返回的 Tool Call
 * 6. 调用 Policy Engine
 * 7. 判断是否需要审批
 * 8. 执行 Tool
 * 9. 将结果重新提供给 LLM
 * 10. 生成最终回复
 *
 * Agent 不负责：数据库访问、权限最终判断、业务逻辑。
 */
@Injectable()
export class AgentService {
  constructor(
    private readonly llm: LlmService,
    private readonly toolRegistry: ToolRegistry,
    private readonly toolExecutor: ToolExecutor,
    private readonly policy: PolicyEngine,
    private readonly contextBuilder: ContextBuilder,
    private readonly sanitizer: ContextSanitizer,
    private readonly audit: AuditService,
  ) {}

  async run(
    context: AgentContext,
    onEvent?: (event: AgentEvent) => void,
  ): Promise<AgentResult> {
    const actor: AiActor = {
      id: Number(context.user.id),
      username: context.user.username,
      roles: context.user.roles,
      permissions: context.user.permissions,
    };

    // 构建上下文（系统提示词 + 可用 Tool）
    const aiContext = this.contextBuilder.build(actor);
    onEvent?.({ type: 'thinking', data: { message: '正在分析你的请求...' } });

    const messages: LlmMessage[] = [
      { role: 'system', content: aiContext.systemPrompt },
      { role: 'user', content: context.message },
    ];

    let response = await this.llm.chat({
      messages,
      tools: aiContext.tools,
      toolChoice: 'auto',
    });

    const toolCalls: Array<{
      name: string;
      arguments: Record<string, unknown>;
      result?: unknown;
    }> = [];
    let waitingApproval = false;
    let riskLevel = RiskLevel.L0;

    // 处理 tool calls（最多 5 轮）
    for (let round = 0; round < 5; round++) {
      if (!response.toolCalls.length) break;

      for (const toolCall of response.toolCalls) {
        // 将 LLM 返回的工具名称转换回实际工具名称（user_list → user.list）
        const actualName =
          aiContext.toolNameMap.get(toolCall.name) ?? toolCall.name;
        const tool = this.toolRegistry.get(actualName);
        if (!tool) {
          throw new AiException(
            AiErrorCode.TOOL_NOT_FOUND,
            `工具 ${actualName} 不存在`,
          );
        }

        // Policy 评估（权限 + 风险 + 审批）
        const decision = await this.policy.evaluate({
          actor,
          toolName: tool.name,
          requiredPermission: tool.permission,
          baseRisk: tool.riskLevel,
          input: toolCall.arguments,
        });

        await this.audit.log({
          userId: actor.id,
          action: 'tool_evaluate',
          toolName: tool.name,
          riskLevel: decision.riskLevel,
          permission: tool.permission,
          scope: decision.scope,
          result: decision.allowed ? 'allowed' : 'denied',
          metadata: {
            input: toolCall.arguments,
            reason: decision.reason,
          },
        });

        if (!decision.allowed) {
          throw new AiException(
            AiErrorCode.PERMISSION_DENIED,
            decision.reason ?? '权限不足',
          );
        }

        // 需要审批（L2/L3）：第一阶段 MVP 返回等待审批，不执行
        if (decision.requiresApproval) {
          waitingApproval = true;
          riskLevel = decision.riskLevel;
          onEvent?.({
            type: 'approval_required',
            data: {
              toolName: tool.name,
              input: toolCall.arguments,
              riskLevel: decision.riskLevel,
            },
          });
          toolCalls.push({
            name: tool.name,
            arguments: toolCall.arguments,
            result: { status: 'waiting_approval' },
          });
          continue;
        }

        // 执行 Tool
        onEvent?.({
          type: 'tool_call',
          data: { name: tool.name, arguments: toolCall.arguments },
        });
        const toolContext: ToolContext = {
          actor,
          sessionId: context.sessionId,
          scope: { kind: 'all' },
          requestId: (context.metadata?.requestId as string) ?? '',
        };
        const result = await this.toolExecutor.execute(
          tool.name,
          toolCall.arguments,
          toolContext,
        );
        const sanitized = this.sanitizer.sanitize(result);
        onEvent?.({
          type: 'tool_result',
          data: { name: tool.name, result: sanitized },
        });

        await this.audit.log({
          userId: actor.id,
          action: 'tool_execute',
          toolName: tool.name,
          riskLevel: decision.riskLevel,
          permission: tool.permission,
          scope: decision.scope,
          result: 'allowed',
          metadata: { input: toolCall.arguments },
        });

        toolCalls.push({
          name: tool.name,
          arguments: toolCall.arguments,
          result: sanitized,
        });

        // 将 tool 调用历史加入消息，供 LLM 生成最终回复
        messages.push({
          role: 'assistant',
          content: response.content,
          toolCalls: [toolCall],
        });
        messages.push({
          role: 'tool',
          content: JSON.stringify(sanitized),
          toolCallId: toolCall.id,
        });
      }

      // 再次调用 LLM 生成最终回复
      response = await this.llm.chat({
        messages,
        tools: aiContext.tools,
        toolChoice: 'auto',
      });
    }

    onEvent?.({ type: 'message', data: { content: response.content } });

    return {
      content: response.content,
      toolCalls,
      waitingApproval,
      riskLevel,
    };
  }
}
