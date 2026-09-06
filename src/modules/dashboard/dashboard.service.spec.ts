import { describe, expect, it, vi } from 'vitest';
import { DashboardService } from './dashboard.service';

type Row = Record<string, unknown>;

/**
 * 构造可被 await 的 drizzle 查询链 mock：
 * db.select(...) -> from(...) -> where(...) -> groupBy(...)
 * 每次调用 db.select 依次消费 results 中的一个值，作为该次查询的返回。
 */
function selectChain(results: Row[]) {
  let calls = 0;
  const makeThenable = (value: Row[]) => {
    const self = {
      // 专为测试构造的可 await 的 thenable，属预期用法
      // eslint-disable-next-line unicorn/no-thenable
      then: (onFulfilled: (v: Row[]) => unknown) =>
        Promise.resolve(value).then(onFulfilled),
    };
    (self as { groupBy: unknown }).groupBy = vi
      .fn()
      .mockImplementation(() => makeThenable(value));
    return self;
  };
  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi
        .fn()
        .mockImplementation(() => makeThenable(results[calls++] ?? [])),
    }),
  });
}

function createService(results: Row[]) {
  const db = { select: selectChain(results) };
  return { service: new DashboardService({ db } as any), db };
}

describe('DashboardService', () => {
  it('aggregates user stats (total/active/disabled/todayNew)', async () => {
    const { service } = createService([
      [
        { status: 'active', count: 4 },
        { status: 'disabled', count: 1 },
      ],
      [{ count: 2 }],
    ]);
    await expect(service.users()).resolves.toEqual({
      total: 5,
      active: 4,
      disabled: 1,
      todayNew: 2,
    });
  });

  it('aggregates dept stats', async () => {
    const { service } = createService([
      [
        { status: 'active', count: 3 },
        { status: 'disabled', count: 1 },
      ],
    ]);
    await expect(service.depts()).resolves.toEqual({
      total: 4,
      active: 3,
      disabled: 1,
    });
  });

  it('aggregates role stats with zero disabled', async () => {
    const { service } = createService([[{ status: 'active', count: 2 }]]);
    await expect(service.roles()).resolves.toEqual({
      total: 2,
      active: 2,
      disabled: 0,
    });
  });

  it('aggregates menu stats by type (M/C/F)', async () => {
    const { service } = createService([
      [
        { type: 'M', count: 2 },
        { type: 'C', count: 5 },
        { type: 'F', count: 3 },
      ],
    ]);
    await expect(service.menus()).resolves.toEqual({
      total: 10,
      directory: 2,
      menu: 5,
      button: 3,
    });
  });

  it('aggregates post stats', async () => {
    const { service } = createService([[{ status: 'active', count: 1 }]]);
    await expect(service.posts()).resolves.toEqual({
      total: 1,
      active: 1,
      disabled: 0,
    });
  });
});
