import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { aiAuditLogs } from '../../database/schema/index';
import { AuditLogInput } from './audit.types';

/**
 * 审计服务：记录 AI 操作全过程。
 *
 * 至少记录：谁、什么时候、说了什么、AI 理解成什么、调用了哪个 Tool、
 * 使用了什么参数、权限检查结果、Scope、Risk、是否审批、谁审批、最终结果。
 */
@Injectable()
export class AuditService {
  constructor(private readonly database: DatabaseService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.database.db.insert(aiAuditLogs).values({
      userId: input.userId,
      sessionId: input.sessionId,
      action: input.action,
      toolName: input.toolName,
      riskLevel: input.riskLevel,
      permission: input.permission,
      scope: input.scope,
      result: input.result,
      metadata: input.metadata,
    });
  }
}
