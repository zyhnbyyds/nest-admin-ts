import { describe, expect, it, vi } from 'vitest';
import { ActionIntentService } from './action-intent.service';

function mockDbService() {
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
        }),
      }),
    },
  };
}

describe('ActionIntentService', () => {
  it('hashInput 对相同内容生成相同 hash（与键顺序无关）', () => {
    const a = ActionIntentService.hashInput({ username: 'a', email: 'b' });
    const b = ActionIntentService.hashInput({ email: 'b', username: 'a' });
    expect(a).toBe(b);
  });

  it('hashInput 对不同内容生成不同 hash', () => {
    const a = ActionIntentService.hashInput({ username: 'a' });
    const b = ActionIntentService.hashInput({ username: 'b' });
    expect(a).not.toBe(b);
  });

  it('generateToken 生成唯一字符串', () => {
    const t1 = ActionIntentService.generateToken();
    const t2 = ActionIntentService.generateToken();
    expect(t1).not.toBe(t2);
    expect(t1).toHaveLength(64);
  });

  it('validate 校验失败时抛出业务异常', async () => {
    const service = new ActionIntentService(mockDbService() as never);
    // 数据库中不存在 → 抛出业务异常
    await expect(
      service.validate({
        intentId: 999,
        confirmToken: 'token',
        userId: 1,
        toolName: 'user.update',
        input: {},
      }),
    ).rejects.toThrow('操作意图不存在');
  });
});