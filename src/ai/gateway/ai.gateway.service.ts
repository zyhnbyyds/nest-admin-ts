import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { aiMessages, aiSessions } from '../../database/schema/index';
import { AgentEvent, AgentService } from '../agent/agent.service';
import { AgentContext } from '../agent/agent.types';
import { ApprovalService } from '../approval/approval.service';
import { AiActor } from '../ai.types';

/**
 * AI 网关服务：管理 AI 会话与消息。
 *
 * 负责：
 * - 创建/查询会话
 * - 发送消息（调用 Agent）
 * - 审批操作（approve/reject/confirm）
 * - 保存消息历史
 */
@Injectable()
export class AiGatewayService {
  constructor(
    private readonly database: DatabaseService,
    private readonly agent: AgentService,
    private readonly approval: ApprovalService,
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
  async confirmAction(
    intentId: number,
    confirmToken: string,
    actor: AiActor,
  ) {
    return this.agent.confirmAndExecute(intentId, confirmToken, actor);
  }

  async createSession(userId: number, title?: string) {
    const [result] = await this.database.db.insert(aiSessions).values({
      userId,
      title: title ?? '新会话',
    });
    const sessionId = Number(result.insertId);
    return this.getSession(sessionId, userId);
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
