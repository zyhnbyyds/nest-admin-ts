import { describe, expect, it, vi } from 'vitest';
import { RiskLevel } from '../ai.types';
import { maxRisk } from './task.service';
import { TaskStep } from './task.types';

function mockDbService() {
  return {
    db: {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([
            {
              id: 1,
              status: 'SUCCESS',
              toolName: 'user.update',
              input: { id: 1 },
              output: { undo: { before: [{ id: 1, status: 'active' }] } },
            },
          ]),
        }),
      }),
    },
  };
}

describe('TaskService', () => {
  it('maxRisk 返回步骤中的最高风险', () => {
    const steps: TaskStep[] = [
      { toolName: 'user.list', input: {}, riskLevel: RiskLevel.L0 },
      { toolName: 'user.update', input: { id: 1 }, riskLevel: RiskLevel.L2 },
      { toolName: 'user.update', input: { id: 2 }, riskLevel: RiskLevel.L1 },
    ];
    expect(maxRisk(steps)).toBe(RiskLevel.L2);
  });

  it('maxRisk 空数组返回 L0', () => {
    expect(maxRisk([])).toBe(RiskLevel.L0);
  });

  it('getById 在任务不存在时抛出业务异常', async () => {
    const db = mockDbService();
    // 空结果 → 抛异常
    (db.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    const { TaskService } = await import('./task.service');
    const service = new TaskService(
      db as never,
      {} as never,
      { get: vi.fn() } as never,
    );
    await expect(service.getById(999)).rejects.toThrow('任务不存在');
  });
});
