import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { aiMessages, aiSessions } from '../../database/schema/index';
import { AgentEvent, AgentService } from '../agent/agent.service';
import { AgentContext } from '../agent/agent.types';
import { ActionIntentService } from '../approval/action-intent.service';
import { ApprovalService } from '../approval/approval.service';
import { AiActor } from '../ai.types';
import { TaskService } from '../task/task.service';

/**
 * AI 网关服务：管理 AI 会话与消息。
 *
 * 负责：
 * - 创建/查询会话
 * - 发送消息（调用 Agent）
 * - 审批操作（approve/reject/confirm）
 * - 任务查询与撤销（Task/TaskStep/Undo）
 * - 保存消息历史
 */
@Injectable()
export class AiGatewayService {
  constructor(
    private readonly database: DatabaseService,
    private readonly agent: AgentService,
    private readonly approval: ApprovalService,
    private readonly actionIntentService: ActionIntentService,
    private readonly taskService: TaskService,
  ) {}

  /** 批准操作意图 */
  async approveAction(intentId: number, actor: AiActor) {
    return this.approval.approve(intentId, actor.id);
  }

  /** 拒绝操作意图 */
  async rejectAction(intentId: number, actor: AiActor, reason?: string) {
    const result = await this.approval.reject(intentId, actor.id, reason);

    // 收尾：任务步骤标记 SKIPPED、任务标记 CANCELLED、历史消息状态更新
    const intent = await this.actionIntentService.getById(intentId);
    if (intent) {
      if (intent.sessionId) {
        const rows = await this.listSessionMessages(intent.sessionId);
        await this.updateApprovalMessageStatus(rows, intentId, {
          status: 'cancelled',
        });
        // 收尾文案落库并与返回值对齐，前端可即时展示（刷新后保持一致）
        const content = `操作「${intent.toolName}」已取消${
          reason ? `：${reason}` : ''
        }。`;
        await this.database.db.insert(aiMessages).values({
          sessionId: intent.sessionId,
          role: 'assistant',
          content,
          toolResults: [
            {
              type: 'approval_result',
              outcome: 'cancelled',
              toolName: intent.toolName,
            },
          ],
        });
        return { ...result, content };
      }
      if (intent.taskId && intent.taskStepId) {
        await this.taskService.updateStep(intent.taskStepId, 'SKIPPED');
        await this.taskService.complete(intent.taskId, 'CANCELLED');
      }
    }
    return result;
  }

  /** 用户确认后执行操作意图，并生成总结回复补全对话 */
  async confirmAction(intentId: number, confirmToken: string, actor: AiActor) {
    const { result, toolName, sessionId, input } =
      await this.agent.confirmAndExecute(intentId, confirmToken, actor);

    if (!sessionId) {
      return {
        result,
        toolName,
        content: `操作「${toolName}」已执行完成。`,
      };
    }

    const rows = await this.listSessionMessages(sessionId);

    // 历史消息中的工具步骤从「待确认」更新为实际执行结果（刷新会话后状态一致）
    await this.updateApprovalMessageStatus(
      rows,
      intentId,
      result ?? { status: 'executed' },
    );

    // 生成总结回复（LLM 失败时回退固定文案，确保确认动作本身不报错）
    const history = rows
      .filter(
        (row) =>
          (row.role === 'user' || row.role === 'assistant') &&
          typeof row.content === 'string' &&
          row.content.trim(),
      )
      .map((row) => ({
        role: row.role as 'user' | 'assistant',
        content: row.content as string,
      }));
    const lastUser = [...rows]
      .reverse()
      .find((row) => row.role === 'user' && typeof row.content === 'string');

    let content = '';
    try {
      content = await this.agent.summarizeExecution({
        actor,
        history,
        userMessage: lastUser?.content ?? '',
        toolName,
        input,
        result,
      });
    } catch {
      content = '';
    }
    if (!content) content = `操作「${toolName}」已执行完成。`;

    // 总结落库：刷新会话后依然可见（附审批结果元数据，前端据此还原结果条）
    await this.database.db.insert(aiMessages).values({
      sessionId,
      role: 'assistant',
      content,
      toolResults: [{ type: 'approval_result', outcome: 'success', toolName }],
    });

    return { result, toolName, content };
  }

  /** 查询会话消息（时间正序） */
  private async listSessionMessages(sessionId: number) {
    return this.database.db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, sessionId))
      .orderBy(asc(aiMessages.createdAt));
  }

  /**
   * 将历史消息中该意图的 tool 步骤结果从「待确认」更新为最终状态
   * （executed / cancelled），保证刷新会话后展示与实际一致。
   */
  private async updateApprovalMessageStatus(
    rows: Awaited<ReturnType<AiGatewayService['listSessionMessages']>>,
    intentId: number,
    result: unknown,
  ) {
    type ToolCallRecord = {
      name?: string;
      result?: { intentId?: number; status?: string };
    };
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i]!;
      const toolCalls = row.toolCalls as ToolCallRecord[] | null;
      if (
        row.role !== 'assistant' ||
        !Array.isArray(toolCalls) ||
        !toolCalls.some((call) => call?.result?.intentId === intentId)
      ) {
        continue;
      }
      const updated = toolCalls.map((call) =>
        call?.result?.intentId === intentId ? { ...call, result } : call,
      );
      await this.database.db
        .update(aiMessages)
        .set({ toolCalls: updated })
        .where(eq(aiMessages.id, row.id));
      return;
    }
  }

  /** 获取任务详情（含步骤） */
  async getTask(taskId: number, userId: number) {
    const task = await this.taskService.getById(taskId);
    if (task.userId !== userId) {
      throw new NotFoundException('任务不存在');
    }
    const steps = await this.taskService.getSteps(taskId);
    return { ...task, steps };
  }

  /** 获取用户的任务列表 */
  listTasks(actor: AiActor) {
    return this.taskService.listByUser(actor.id);
  }

  /** 撤销任务（Undo） */
  async rollbackTask(taskId: number, actor: AiActor) {
    const task = await this.taskService.getById(taskId);
    if (task.userId !== actor.id) {
      throw new NotFoundException('任务不存在');
    }
    const rolledBack = await this.taskService.rollbackTask(taskId, {
      actor,
      sessionId: task.sessionId ? String(task.sessionId) : '',
      scope: { kind: 'all' },
      requestId: '',
    });
    return { taskId, rolledBack };
  }

  async createSession(userId: number, title?: string) {
    const [result] = await this.database.db.insert(aiSessions).values({
      userId,
      title: title ?? '新会话',
    });
    const sessionId = Number(result.insertId);
    return this.getSession(sessionId, userId);
  }

  /** 更新会话标题 */
  async updateSessionTitle(id: number, userId: number, title: string) {
    await this.getSession(id, userId);
    await this.database.db
      .update(aiSessions)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(aiSessions.id, id), eq(aiSessions.userId, userId)));
    return this.getSession(id, userId);
  }

  async listSessions(userId: number) {
    return this.database.db
      .select()
      .from(aiSessions)
      .where(eq(aiSessions.userId, userId))
      .orderBy(desc(aiSessions.updatedAt));
  }

  async getSession(id: number, userId: number) {
    const [session] = await this.database.db
      .select()
      .from(aiSessions)
      .where(and(eq(aiSessions.id, id), eq(aiSessions.userId, userId)))
      .limit(1);
    if (!session) throw new NotFoundException('会话不存在');
    return session;
  }

  async listMessages(sessionId: number, userId: number) {
    await this.getSession(sessionId, userId);
    return this.database.db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, sessionId))
      .orderBy(asc(aiMessages.createdAt));
  }

  async sendMessage(
    sessionId: number,
    actor: {
      id: number;
      username: string;
      roles: string[];
      permissions: string[];
    },
    content: string,
    onEvent?: (event: AgentEvent) => void,
  ) {
    await this.getSession(sessionId, actor.id);

    // 加载该会话历史（插入当前消息之前查询，避免包含本次 user 消息）
    const historyRows = await this.database.db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, sessionId))
      .orderBy(asc(aiMessages.createdAt));
    // 仅取纯文本轮次（user/assistant），按时间正序
    const history = historyRows
      .filter(
        (row) =>
          (row.role === 'user' || row.role === 'assistant') &&
          typeof row.content === 'string' &&
          row.content.trim(),
      )
      .map((row) => ({
        role: row.role as 'user' | 'assistant',
        content: row.content as string,
      }));

    // 保存用户消息
    await this.database.db.insert(aiMessages).values({
      sessionId,
      role: 'user',
      content,
    });

    // 调用 Agent
    const agentContext: AgentContext = {
      sessionId: String(sessionId),
      user: {
        id: String(actor.id),
        username: actor.username,
        roles: actor.roles,
        permissions: actor.permissions,
      },
      message: content,
      history,
    };

    const result = await this.agent.run(agentContext, onEvent);

    // 保存 assistant 消息
    await this.database.db.insert(aiMessages).values({
      sessionId,
      role: 'assistant',
      content: result.content,
      toolCalls: result.toolCalls,
    });

    return result;
  }
}
