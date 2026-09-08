import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { aiTaskSteps, aiTasks } from '../../database/schema/index';
import { AiErrorCode, AiException, RiskLevel } from '../ai.types';
import { ToolContext } from '../tools/tool.interface';
import { ToolExecutor } from '../tools/tool.executor';
import { ToolRegistry } from '../tools/tool.registry';
import {
  CreateTaskInput,
  TaskProgressCallback,
  TaskStep,
  TaskStatus,
  TaskStepStatus,
} from './task.types';

/**
 * 任务服务：管理 AI 多步任务。
 *
 * 职责：
 * - 创建任务（含步骤）
 * - 顺序执行步骤（状态机：PENDING → RUNNING → SUCCESS/FAILED）
 * - Saga 补偿：步骤失败时逆序执行已完成步骤的 rollback
 * - 查询任务状态
 */
@Injectable()
export class TaskService {
  constructor(
    private readonly database: DatabaseService,
    private readonly executor: ToolExecutor,
    private readonly registry: ToolRegistry,
  ) {}

  /** 创建任务 */
  async create(input: CreateTaskInput) {
    const [result] = await this.database.db.insert(aiTasks).values({
      sessionId: input.sessionId,
      userId: input.userId,
      goal: input.goal,
      riskLevel: input.riskLevel,
      status: 'PENDING',
    });
    const taskId = Number(result.insertId);
    return this.getById(taskId);
  }

  /** 标记任务开始 */
  async start(taskId: number): Promise<void> {
    await this.database.db
      .update(aiTasks)
      .set({ status: 'RUNNING', startedAt: new Date() })
      .where(eq(aiTasks.id, taskId));
  }

  /** 完成任务 */
  async complete(
    taskId: number,
    status: TaskStatus,
    error?: string,
  ): Promise<void> {
    await this.database.db
      .update(aiTasks)
      .set({
        status,
        completedAt: new Date(),
        error: error ?? null,
      })
      .where(eq(aiTasks.id, taskId));
  }

  /** 记录任务步骤 */
  async addStep(
    taskId: number,
    step: TaskStep,
    index: number,
  ): Promise<number> {
    const [result] = await this.database.db.insert(aiTaskSteps).values({
      taskId,
      stepIndex: index,
      toolName: step.toolName,
      input: step.input,
      riskLevel: step.riskLevel,
      status: 'PENDING',
    });
    return Number(result.insertId);
  }

  /** 更新步骤状态 */
  async updateStep(
    stepId: number,
    status: TaskStepStatus,
    output?: unknown,
    error?: string,
  ): Promise<void> {
    await this.database.db
      .update(aiTaskSteps)
      .set({
        status,
        output: output ?? null,
        error: error ?? null,
        startedAt: status === 'RUNNING' ? new Date() : undefined,
        completedAt:
          status === 'SUCCESS' || status === 'FAILED' || status === 'SKIPPED'
            ? new Date()
            : undefined,
      })
      .where(eq(aiTaskSteps.id, stepId));
  }

  /** 获取任务详情 */
  async getById(taskId: number) {
    const [task] = await this.database.db
      .select()
      .from(aiTasks)
      .where(eq(aiTasks.id, taskId))
      .limit(1);
    if (!task) throw new AiException(AiErrorCode.BUSINESS_ERROR, '任务不存在');
    return task;
  }

  /** 获取任务步骤 */
  async getSteps(taskId: number) {
    return this.database.db
      .select()
      .from(aiTaskSteps)
      .where(eq(aiTaskSteps.taskId, taskId))
      .orderBy(asc(aiTaskSteps.stepIndex));
  }

  /**
   * 执行任务（Saga 模式）：
   * - 顺序执行每一步
   * - 某步失败时，逆序执行已完成步骤的 rollback（补偿）
   */
  async executeTask(
    taskId: number,
    steps: TaskStep[],
    context: ToolContext,
    onProgress: TaskProgressCallback = {},
  ): Promise<void> {
    await this.start(taskId);
    const executed: { toolName: string; input: Record<string, unknown> }[] = [];

    for (const [index, step] of steps.entries()) {
      const stepId = await this.addStep(taskId, step, index);
      const tool = this.registry.get(step.toolName);

      try {
        await this.updateStep(stepId, 'RUNNING');
        onProgress.onStepStart?.({
          index,
          toolName: step.toolName,
          input: step.input,
        });

        if (!tool) {
          throw new AiException(
            AiErrorCode.TOOL_NOT_FOUND,
            `工具 ${step.toolName} 不存在`,
          );
        }

        // 限制检查：批量操作不能超过 maxItems
        this.assertLimits(tool.limits?.maxItems, step.input);

        const result = await this.executor.execute(
          step.toolName,
          step.input,
          context,
        );
        await this.updateStep(stepId, 'SUCCESS', result);
        executed.push({ toolName: step.toolName, input: step.input });
        onProgress.onStepResult?.({
          index,
          toolName: step.toolName,
          result,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '执行失败';
        await this.updateStep(stepId, 'FAILED', undefined, message);
        // Saga 补偿：逆序回滚已成功的步骤
        await this.compensate(executed, context);
        await this.complete(taskId, 'FAILED', message);
        throw new AiException(AiErrorCode.BUSINESS_ERROR, message);
      }
    }

    await this.complete(taskId, 'SUCCESS');
  }

  /** Saga 补偿：逆序执行已完成步骤的 rollback */
  private async compensate(
    executed: { toolName: string; input: Record<string, unknown> }[],
    context: ToolContext,
  ): Promise<void> {
    for (const item of executed.reverse()) {
      const tool = this.registry.get(item.toolName);
      if (tool?.rollback) {
        try {
          await tool.rollback(item.input, context);
        } catch {
          // 补偿失败仅记录，不阻塞后续
        }
      }
    }
  }

  /** 批量限制检查 */
  private assertLimits(
    maxItems: number | undefined,
    input: Record<string, unknown>,
  ): void {
    if (maxItems === undefined) return;
    const items = Array.isArray(input?.ids)
      ? (input.ids as unknown[]).length
      : 0;
    if (items > maxItems) {
      throw new AiException(
        AiErrorCode.RISK_DENIED,
        `批量操作超过限制（最大 ${maxItems} 条）`,
      );
    }
  }

  /** 取消任务 */
  async cancel(taskId: number): Promise<void> {
    await this.database.db
      .update(aiTasks)
      .set({ status: 'CANCELLED', completedAt: new Date() })
      .where(eq(aiTasks.id, taskId));
  }

  /** 查询用户的任务列表 */
  async listByUser(userId: number) {
    return this.database.db
      .select()
      .from(aiTasks)
      .where(and(eq(aiTasks.userId, userId)))
      .orderBy(asc(aiTasks.id));
  }

  /** 撤销任务：逆序执行所有成功步骤的 rollback（Undo）。需要从步骤 output 中取出 before 快照 */
  async rollbackTask(taskId: number, context: ToolContext): Promise<number> {
    const steps = await this.getSteps(taskId);
    const successSteps = steps.filter((step) => step.status === 'SUCCESS');

    let rolledBack = 0;
    for (const step of successSteps.reverse()) {
      const tool = this.registry.get(step.toolName);
      if (!tool?.rollback) continue;
      // 从步骤 output 中提取 undo 所需的 before 快照
      const output = (step.output ?? {}) as Record<string, unknown>;
      const input = {
        ...((step.input ?? {}) as Record<string, unknown>),
        ...(output?.undo ? { undo: output.undo } : {}),
        ...(output?.before !== undefined ? { before: output.before } : {}),
      };
      try {
        await tool.rollback(input, context);
        await this.updateStep(step.id, 'SKIPPED', undefined, '已撤销');
        rolledBack++;
      } catch {
        // 单步撤销失败不阻塞其他步骤
      }
    }

    // 将任务标记为已撤销
    if (rolledBack > 0) {
      await this.complete(taskId, 'CANCELLED', `已撤销 ${rolledBack} 个步骤`);
    }
    return rolledBack;
  }
}

/** 计算多个步骤中的最高风险 */
export function maxRisk(steps: TaskStep[]): RiskLevel {
  const order: Record<RiskLevel, number> = {
    [RiskLevel.L0]: 0,
    [RiskLevel.L1]: 1,
    [RiskLevel.L2]: 2,
    [RiskLevel.L3]: 3,
  };
  return steps.reduce<RiskLevel>((max, step) => {
    return order[step.riskLevel] > order[max] ? step.riskLevel : max;
  }, RiskLevel.L0);
}
