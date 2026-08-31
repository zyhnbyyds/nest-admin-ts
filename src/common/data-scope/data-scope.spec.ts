import { describe, expect, it, vi } from 'vitest';
import { resolveDataScope, type RequestActor } from './data-scope';

/**
 * Build a select mock returning the given results in call order.
 * Each result supports both terminal `.where()` and chained `.limit()` consumers.
 */
function buildSelect(returns: unknown[]) {
  let call = 0;
  return vi.fn(() => {
    const result = returns[call] ?? [];
    call += 1;
    return {
      from: vi.fn(() => ({
        where: vi.fn(() =>
          Object.assign(Promise.resolve(result), {
            limit: vi.fn().mockResolvedValue(result),
          }),
        ),
      })),
    };
  });
}

const actor: RequestActor = {
  id: 9,
  roles: ['editor'],
  permissions: ['system:user:list'],
};

describe('resolveDataScope', () => {
  it('returns all for super admin without querying roles', async () => {
    const select = buildSelect([]);
    const scope = await resolveDataScope(
      { select } as never,
      { ...actor, permissions: ['*:*:*'] },
    );
    expect(scope).toEqual({ kind: 'all' });
    expect(select).not.toHaveBeenCalled();
  });

  it('returns all when actor has no roles', async () => {
    const scope = await resolveDataScope({ select: buildSelect([]) } as never, {
      ...actor,
      roles: [],
    });
    expect(scope).toEqual({ kind: 'all' });
  });

  it('returns all when any role has all scope', async () => {
    const select = buildSelect([
      [
        { id: 1, dataScope: 'all' },
        { id: 2, dataScope: 'self' },
      ],
    ]);
    const scope = await resolveDataScope({ select } as never, actor);
    expect(scope).toEqual({ kind: 'all' });
  });

  it('returns self when every role is self', async () => {
    const select = buildSelect([[{ id: 1, dataScope: 'self' }]]);
    const scope = await resolveDataScope({ select } as never, actor);
    expect(scope).toEqual({ kind: 'self' });
  });

  it('returns custom dept ids from role_dept', async () => {
    const select = buildSelect([
      [{ id: 1, dataScope: 'custom' }],
      [
        { deptId: 2 },
        { deptId: 3 },
        { deptId: 2 },
      ],
    ]);
    const scope = await resolveDataScope({ select } as never, actor);
    expect(scope).toEqual({ kind: 'deptIds', ids: [2, 3] });
  });

  it('returns own dept for dept scope', async () => {
    const select = buildSelect([
      [{ id: 1, dataScope: 'dept' }],
      [{ deptId: 4 }],
    ]);
    const scope = await resolveDataScope({ select } as never, actor);
    expect(scope).toEqual({ kind: 'deptIds', ids: [4] });
  });

  it('expands own dept with descendants for dept_and_children scope', async () => {
    const select = buildSelect([
      [{ id: 1, dataScope: 'dept_and_children' }],
      [{ deptId: 5 }],
      [
        { id: 5, ancestors: '0' },
        { id: 6, ancestors: '0,5' },
        { id: 7, ancestors: '0,5,6' },
        { id: 8, ancestors: '0,8' },
      ],
    ]);
    const scope = await resolveDataScope({ select } as never, actor);
    expect(scope).toEqual({ kind: 'deptIds', ids: [5, 6, 7] });
  });

  it('unions custom depts with own dept and children across roles', async () => {
    const select = buildSelect([
      [
        { id: 1, dataScope: 'custom' },
        { id: 2, dataScope: 'dept_and_children' },
      ],
      [{ deptId: 10 }],
      [{ deptId: 5 }],
      [
        { id: 5, ancestors: '0' },
        { id: 6, ancestors: '0,5' },
      ],
    ]);
    const scope = await resolveDataScope({ select } as never, actor);
    expect(scope).toEqual({ kind: 'deptIds', ids: [10, 5, 6] });
  });

  it('returns empty dept ids when custom has no departments', async () => {
    const select = buildSelect([[{ id: 1, dataScope: 'custom' }], []]);
    const scope = await resolveDataScope({ select } as never, actor);
    expect(scope).toEqual({ kind: 'deptIds', ids: [] });
  });

  it('returns empty dept ids when dept scope but actor has no dept', async () => {
    const select = buildSelect([[{ id: 1, dataScope: 'dept' }], [{ deptId: null }]]);
    const scope = await resolveDataScope({ select } as never, actor);
    expect(scope).toEqual({ kind: 'deptIds', ids: [] });
  });
});