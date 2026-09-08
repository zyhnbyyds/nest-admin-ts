import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { aiMessages, aiSessions } from '../../database/schema/index';
import { AgentEvent, AgentService } from '../agent/agent.service';
import { AgentContext } from '../agent/agent.types';
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
    private readonly taskService: TaskService,
  ) {}

  /** 批准操作意图 */
  async approveAction(intentId: number, actor: AiActor) {
    return this.approval.approve(intentId, actor.id);
  }

  /** 拒绝操作意图 */
  async rejectAction(intentId: number, actor: AiActor, reason?: string) {
    return this.approval.reject(intentId, actor.id, reason);
  }

  /** 用户确认后执行操作意图 */
  async confirmAction(intentId: number, confirmToken: string, actor: AiActor) {
    return this.agent.confirmAndExecute(intentId, confirmToken, actor);
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
