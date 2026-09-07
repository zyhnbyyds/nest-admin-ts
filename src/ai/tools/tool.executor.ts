import { Injectable } from '@nestjs/common';
import { AiErrorCode, AiException } from '../ai.types';
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
  constructor(private readonly registry: ToolRegistry) {}

  async execute(
    name: string,
    input: unknown,
    context: ToolContext,
  ): Promise<unknown> {
    const tool = this.registry.get(name);
    if (!tool) {
      throw new AiException(AiErrorCode.TOOL_NOT_FOUND, `工具 ${name} 不存在`);
    }
    return tool.execute(input, context);
  }
}
