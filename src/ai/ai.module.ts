import { Module, OnModuleInit } from '@nestjs/common';
import { UsersModule } from '../modules/system/users/users.module';
import { AgentService } from './agent/agent.service';
import { AuditService } from './audit/audit.service';
import { ContextBuilder } from './context/context.builder';
import { ContextSanitizer } from './context/context.sanitizer';
import { AiGatewayController } from './gateway/ai.gateway.controller';
import { AiGatewayService } from './gateway/ai.gateway.service';
import { LlmService } from './llm/llm.service';
import { PermissionService } from './policy/permission.service';
import { PolicyEngine } from './policy/policy.engine';
import { ToolExecutor } from './tools/tool.executor';
import { ToolRegistry } from './tools/tool.registry';
import { UserGetTool } from './tools/user/user.get.tool';
import { UserListTool } from './tools/user/user.list.tool';

/**
 * AI Operations Layer 模块。
 *
 * 核心原则：AI 不直接访问数据库，所有操作必须经过 Tool → Service → Prisma。
 */
@Module({
  imports: [UsersModule],
  controllers: [AiGatewayController],
  providers: [
    LlmService,
    ToolRegistry,
    ToolExecutor,
    PermissionService,
    PolicyEngine,
    ContextBuilder,
    ContextSanitizer,
    AuditService,
    AgentService,
    AiGatewayService,
    UserListTool,
    UserGetTool,
  ],
  exports: [AiGatewayService],
})
export class AiModule implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly userListTool: UserListTool,
    private readonly userGetTool: UserGetTool,
  ) {}

  onModuleInit(): void {
    // 注册所有 Tool（后续阶段在此追加）
    this.registry.register(this.userListTool);
    this.registry.register(this.userGetTool);
  }
}
