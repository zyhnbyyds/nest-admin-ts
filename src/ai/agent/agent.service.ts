import { Injectable } from '@nestjs/common';
import { AiActor, AiErrorCode, AiException, RiskLevel } from '../ai.types';
import { ActionIntentService } from '../approval/action-intent.service';
import { AuditService } from '../audit/audit.service';
import { CapabilityService } from '../capability/capability.service';
import { ContextBuilder } from '../context/context.builder';
import { ContextSanitizer } from '../context/context.sanitizer';
import { LlmMessage } from '../llm/llm.interface';
import { LlmService } from '../llm/llm.service';
import { PolicyEngine } from '../policy/policy.engine';
import { TaskService } from '../task/task.service';
import { ToolContext, ToolPreview } from '../tools/tool.interface';
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
        intentId: number;
        confirmToken: string;
        toolName: string;
        input: Record<string, unknown>;
        riskLevel: RiskLevel;
        preview?: ToolPreview;
      };
    }
  | { type: 'message'; data: { content: string } }
  | { type: 'error'; data: { code: AiErrorCode; message: string } }
  | {
      type: 'task_created';
      data: { taskId: number; goal: string; stepCount: number };
    }
  | {
      type: 'task_step';
      data: {
        taskId: number;
        index: number;
        toolName: string;
        status: 'RUNNING' | 'SUCCESS' | 'FAILED';
        result?: unknown;
      };
    }
  | {
      type: 'task_completed';
      data: { taskId: number; status: string; error?: string };
    };

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
    private readonly actionIntentService: ActionIntentService,
    private readonly capability: CapabilityService,
    private readonly taskService: TaskService,
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

    // 注入会话历史（纯文本轮次，最多保留最近 20 条避免超长）
    const history: LlmMessage[] = (context.history ?? [])
      .slice(-20)
      .map((item) => ({
        role: item.role,
        content: item.content,
      }));

    const messages: LlmMessage[] = [
      { role: 'system', content: aiContext.systemPrompt },
      ...history,
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
    // 任务时间线（多步操作时创建）
    let taskId: number | undefined;

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
          approvalPolicy: tool.approvalPolicy,
          ...(tool.limits ? { limits: tool.limits } : {}),
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
            ...(decision.explanation
              ? { explanation: decision.explanation }
              : {}),
          },
        });

        if (!decision.allowed) {
          throw new AiException(
            AiErrorCode.PERMISSION_DENIED,
            decision.reason ?? '权限不足',
          );
        }

        // 需要审批：创建 ActionIntent，返回 confirmToken + preview
        if (decision.requiresApproval) {
          const inputHash = ActionIntentService.hashInput(
            toolCall.arguments as Record<string, unknown>,
          );
          // 去重：同一会话、同一工具、相同参数已有 PENDING intent 时复用，避免重复创建
          const existingIntent =
            await this.actionIntentService.findPendingByHash(
              Number(context.sessionId),
              tool.name,
              inputHash,
            );
          let intent = existingIntent;
          let confirmToken = existingIntent?.confirmToken ?? '';
          let preview: ToolPreview | undefined;
          if (!existingIntent) {
            confirmToken = ActionIntentService.generateToken();
            const toolContextForPreview: ToolContext = {
              actor,
              sessionId: context.sessionId,
              scope: { kind: 'all' },
              requestId: (context.metadata?.requestId as string) ?? '',
            };
            if (tool.preview) {
              preview = await tool.preview(
                toolCall.arguments,
                toolContextForPreview,
              );
            }
            // 审批操作也纳入任务时间线：创建任务 + 步骤（WAITING_APPROVAL）
            if (taskId === undefined) {
              const task = await this.taskService.create({
                sessionId: Number(context.sessionId),
                userId: actor.id,
                goal: context.message.slice(0, 500),
                riskLevel: decision.riskLevel,
              });
              taskId = task.id;
              await this.taskService.start(taskId);
              onEvent?.({
                type: 'task_created',
                data: {
                  taskId: task.id,
                  goal: context.message.slice(0, 500),
                  stepCount: 1,
                },
              });
            }
            const taskStepId = await this.taskService.addStep(
              taskId,
              {
                toolName: tool.name,
                input: toolCall.arguments,
                riskLevel: decision.riskLevel,
              },
              toolCalls.length,
            );
            await this.taskService.updateStep(taskStepId, 'WAITING_APPROVAL');
            intent = await this.actionIntentService.create({
              sessionId: Number(context.sessionId),
              userId: actor.id,
              toolName: tool.name,
              input: toolCall.arguments,
              riskLevel: decision.riskLevel,
              confirmToken,
              // TOCTOU 防护：记录预览时的数据快照
              beforeHash: preview?.before
                ? ActionIntentService.hashValue(preview.before)
                : undefined,
              // 关联任务与步骤，确认执行后更新并保存 undo 快照
              taskId,
              taskStepId,
            });
            if (!intent) {
              throw new AiException(
                AiErrorCode.BUSINESS_ERROR,
                '创建操作意图失败',
              );
            }
          }
          if (!intent) {
            throw new AiException(
              AiErrorCode.BUSINESS_ERROR,
              '创建操作意图失败',
            );
          }
          waitingApproval = true;
          riskLevel = decision.riskLevel;
          onEvent?.({
            type: 'approval_required',
            data: {
              intentId: intent.id,
              confirmToken,
              toolName: tool.name,
              input: toolCall.arguments,
              riskLevel: decision.riskLevel,
              ...(preview ? { preview } : {}),
            },
          });
          toolCalls.push({
            name: tool.name,
            arguments: toolCall.arguments,
            result: { status: 'waiting_approval', intentId: intent.id },
          });

          // 将 tool 调用与「等待审批」结果反馈给 LLM，避免 LLM 重复调用同一工具
          messages.push({
            role: 'assistant',
            content: response.content,
            toolCalls: [toolCall],
          });
          messages.push({
            role: 'tool',
            content: JSON.stringify({
              status: 'waiting_approval',
              intentId: intent.id,
              message: `操作「${tool.name}」已提交审批，等待用户确认，请勿重复调用。`,
            }),
            toolCallId: toolCall.id,
          });

          // 已进入等待审批状态：终止循环，不再让 LLM 继续调用工具
          round = 5;
          break;
        }

        // 执行 Tool（首次执行时创建任务时间线）
        if (taskId === undefined) {
          const task = await this.taskService.create({
            sessionId: Number(context.sessionId),
            userId: actor.id,
            goal: context.message.slice(0, 500),
            riskLevel: decision.riskLevel,
          });
          taskId = task.id;
          await this.taskService.start(taskId);
          onEvent?.({
            type: 'task_created',
            data: {
              taskId: task.id,
              goal: context.message.slice(0, 500),
              stepCount: 1,
            },
          });
        }
        // 持久化任务步骤（用于状态查询与 Undo）
        const stepId = await this.taskService.addStep(
          taskId,
          {
            toolName: tool.name,
            input: toolCall.arguments,
            riskLevel: decision.riskLevel,
          },
          toolCalls.length,
        );
        await this.taskService.updateStep(stepId, 'RUNNING');
        onEvent?.({
          type: 'task_step',
          data: {
            taskId,
            index: toolCalls.length,
            toolName: tool.name,
            status: 'RUNNING',
          },
        });
        onEvent?.({
          type: 'tool_call',
          data: { name: tool.name, arguments: toolCall.arguments },
        });
        // Capability Token：Policy 通过后生成，Tool Executor 执行前验证
        const capabilityToken = this.capability.issue({
          tool: tool.name,
          user: { id: actor.id, username: actor.username },
          scope: `scope:${decision.scope}`,
          maxItems: tool.limits?.maxItems ?? 100,
          riskLevel: decision.riskLevel,
          exp: Date.now() + 5 * 60 * 1000,
        });
        const toolContext: ToolContext = {
          actor,
          sessionId: context.sessionId,
          scope: { kind: 'all' },
          requestId: (context.metadata?.requestId as string) ?? '',
          capabilityToken,
        };
        let result: unknown;
        try {
          result = await this.toolExecutor.execute(
            tool.name,
            toolCall.arguments,
            toolContext,
          );
        } catch (error) {
          await this.taskService.updateStep(
            stepId,
            'FAILED',
            undefined,
            error instanceof Error ? error.message : '执行失败',
          );
          onEvent?.({
            type: 'task_step',
            data: {
              taskId,
              index: toolCalls.length,
              toolName: tool.name,
              status: 'FAILED',
            },
          });
          if (taskId !== undefined) {
            await this.taskService.complete(
              taskId,
              'FAILED',
              error instanceof Error ? error.message : '执行失败',
            );
            onEvent?.({
              type: 'task_completed',
              data: {
                taskId,
                status: 'FAILED',
                error: error instanceof Error ? error.message : '执行失败',
              },
            });
          }
          throw error;
        }
        const sanitized = this.sanitizer.sanitize(result);
        onEvent?.({
          type: 'tool_result',
          data: { name: tool.name, result: sanitized },
        });
        // 持久化步骤成功（含 undo 快照，供 TaskService.rollbackTask 使用）
        await this.taskService.updateStep(stepId, 'SUCCESS', sanitized);
        onEvent?.({
          type: 'task_step',
          data: {
            taskId,
            index: toolCalls.length,
            toolName: tool.name,
            status: 'SUCCESS',
            result: sanitized,
          },
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

    // 完成任务时间线
    if (taskId !== undefined && !waitingApproval) {
      await this.taskService.complete(taskId, 'SUCCESS');
      onEvent?.({
        type: 'task_completed',
        data: { taskId, status: 'SUCCESS' },
      });
    }

    onEvent?.({ type: 'message', data: { content: response.content } });

    return {
      content: response.content,
      toolCalls,
      waitingApproval,
      riskLevel,
      ...(taskId !== undefined ? { taskId } : {}),
    };
  }

  /**
   * 用户确认后执行 ActionIntent。
   *
   * 流程：验证 ActionIntent（token/有效期/userId/toolName/inputHash）→
   * 重新评估 Policy（TOCTOU 防护）→ 执行 Tool → 标记 EXECUTED。
   */
  async confirmAndExecute(
    intentId: number,
    confirmToken: string,
    actor: AiActor,
  ): Promise<{ result: unknown; toolName: string }> {
    const intent = await this.actionIntentService.getById(intentId);
    if (!intent) {
      throw new AiException(AiErrorCode.ACTION_EXPIRED, '操作意图不存在');
    }

    // 验证 ActionIntent（token/有效期/userId/toolName/inputHash）
    await this.actionIntentService.validate({
      intentId,
      confirmToken,
      userId: actor.id,
      toolName: intent.toolName,
      input: intent.input as Record<string, unknown>,
    });

    const tool = this.toolRegistry.get(intent.toolName);
    if (!tool) {
      throw new AiException(
        AiErrorCode.TOOL_NOT_FOUND,
        `工具 ${intent.toolName} 不存在`,
      );
    }

    // 重新执行 Policy 评估（防止确认期间权限变化）
    const decision = await this.policy.evaluate({
      actor,
      toolName: tool.name,
      requiredPermission: tool.permission,
      baseRisk: tool.riskLevel,
      approvalPolicy: tool.approvalPolicy,
      input: intent.input as Record<string, unknown>,
    });
    if (!decision.allowed) {
      throw new AiException(
        AiErrorCode.PERMISSION_DENIED,
        decision.reason ?? '权限不足',
      );
    }

    // TOCTOU 防护：重新获取数据快照并与 beforeHash 比对
    if (intent.beforeHash && tool.preview) {
      const toolContextForPreview: ToolContext = {
        actor,
        sessionId: intent.sessionId ? String(intent.sessionId) : '',
        scope: { kind: 'all' },
        requestId: '',
      };
      const currentPreview = await tool.preview(
        intent.input as Record<string, unknown>,
        toolContextForPreview,
      );
      const currentHash = currentPreview.before
        ? ActionIntentService.hashValue(currentPreview.before)
        : ActionIntentService.hashValue(undefined);
      if (intent.beforeHash !== currentHash) {
        throw new AiException(
          AiErrorCode.ACTION_STALE,
          '数据已变化，请重新预览后再执行',
        );
      }
    }

    // 执行 Tool
    const toolContext: ToolContext = {
      actor,
      sessionId: intent.sessionId ? String(intent.sessionId) : '',
      scope: { kind: 'all' },
      requestId: '',
    };
    const result = await this.toolExecutor.execute(
      tool.name,
      intent.input,
      toolContext,
    );
    const sanitized = this.sanitizer.sanitize(result);

    // 标记为 EXECUTED
    await this.actionIntentService.updateStatus(
      intentId,
      'EXECUTED',
      new Date(),
    );

    // 更新关联的任务步骤为 SUCCESS（并保存 undo 快照供撤销）
    if (intent.taskId && intent.taskStepId) {
      await this.taskService.updateStep(
        intent.taskStepId,
        'SUCCESS',
        sanitized,
      );
      await this.taskService.complete(intent.taskId, 'SUCCESS');
    }

    await this.audit.log({
      userId: actor.id,
      action: 'tool_execute',
      toolName: tool.name,
      riskLevel: decision.riskLevel,
      permission: tool.permission,
      scope: decision.scope,
      result: 'allowed',
      metadata: { input: intent.input, intentId },
    });

    return { result: sanitized, toolName: tool.name };
  }
}
