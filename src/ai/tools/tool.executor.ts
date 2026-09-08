import { Injectable } from '@nestjs/common';
import { AiErrorCode, AiException } from '../ai.types';
import { CapabilityService } from '../capability/capability.service';
import { ToolContext } from './tool.interface';
import { ToolRegistry } from './tool.registry';

/**
 * Tool 执行器：执行 Tool 前必须经过 Policy Engine 校验。
 *
 * 注意：Tool Executor 本身不负责权限判断，权限判断由 Policy Engine 完成。
 * 这里只负责找到 Tool 并执行。
 */
@Injectable()
export class ToolExecutor {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly capability: CapabilityService,
  ) {}

  async execute(
    name: string,
    input: unknown,
    context: ToolContext,
  ): Promise<unknown> {
    const tool = this.registry.get(name);
    if (!tool) {
      throw new AiException(AiErrorCode.TOOL_NOT_FOUND, `工具 ${name} 不存在`);
    }

    // 携带 capabilityToken 时必须验证（Capability Token 机制）
    if (context.capabilityToken) {
      const payload = this.capability.authorize(
        context.capabilityToken,
        name,
        context.actor,
      );
      // 批量限制校验
      const items = Array.isArray((input as { ids?: unknown[] })?.ids)
        ? ((input as { ids: unknown[] }).ids.length)
        : Number((input as { id?: number })?.id) > 0
          ? 1
          : 0;
      this.capability.assertItemCount(payload, items);
    }

    return tool.execute(input, context);
  }
}
