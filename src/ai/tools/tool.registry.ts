import { Injectable } from '@nestjs/common';
import { AiTool } from './tool.interface';

/**
 * Tool 注册表：所有 Tool 必须注册到这里。
 *
 * Agent 获取 Tool 时不能把所有 Tool 都交给 LLM，必须先经过权限过滤。
 */
@Injectable()
export class ToolRegistry {
  private readonly tools = new Map<string, AiTool>();

  register(tool: AiTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): AiTool | undefined {
    return this.tools.get(name);
  }

  getAll(): AiTool[] {
    return [...this.tools.values()];
  }

  /** 获取当前用户可用的 Tool（按权限过滤） */
  getAvailableTools(actor: { permissions: string[] }): AiTool[] {
    return this.getAll().filter((tool) => {
      return (
        actor.permissions.includes('*:*:*') ||
        actor.permissions.includes(tool.permission)
      );
    });
  }
}
