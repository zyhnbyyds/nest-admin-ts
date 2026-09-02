import { describe, expect, it, vi } from 'vitest';
import { lastValueFrom, of, throwError } from 'rxjs';
import { OperationLogInterceptor } from './operation-log.interceptor';

function buildDb() {
  return {
    db: {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      }),
    },
  } as any;
}

function buildContext(
  method: string,
  url: string,
  body: unknown = null,
  userId?: number,
) {
  return {
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue({
        method,
        url,
        ip: '127.0.0.1',
        body,
        user: userId ? { id: userId } : undefined,
      }),
    }),
    getHandler: vi.fn().mockReturnValue('mockHandler'),
    getClass: vi.fn().mockReturnValue({ name: 'MockController' }),
  } as any;
}

describe('OperationLogInterceptor', () => {
  it('passes through GET requests without logging', async () => {
    const db = buildDb();
    const interceptor = new OperationLogInterceptor(db);
    const context = buildContext('GET', '/api/v1/system/users');
    const next = { handle: vi.fn().mockReturnValue(of({ data: 'ok' })) };

    await lastValueFrom(interceptor.intercept(context, next));
    // GET should not call insert
    expect(db.db.insert).not.toHaveBeenCalled();
  });

  it('passes through auth routes without logging', async () => {
    const db = buildDb();
    const interceptor = new OperationLogInterceptor(db);
    const context = buildContext('POST', '/api/v1/auth/login');
    const next = { handle: vi.fn().mockReturnValue(of({ data: 'ok' })) };

    await lastValueFrom(interceptor.intercept(context, next));
    expect(db.db.insert).not.toHaveBeenCalled();
  });

  it('logs mutating requests on success', async () => {
    const db = buildDb();
    const interceptor = new OperationLogInterceptor(db);
    const context = buildContext(
      'POST',
      '/api/v1/system/users',
      { username: 'test' },
      1,
    );
    const next = { handle: vi.fn().mockReturnValue(of({ id: 1 })) };

    await lastValueFrom(interceptor.intercept(context, next));
    // rxjs `of()` emits synchronously, so the tap callback (and thus the
    // insert) has already run; vi.waitFor is not available under bun test.
    expect(db.db.insert).toHaveBeenCalled();
  });

  it('logs mutating requests on failure', async () => {
    const db = buildDb();
    const interceptor = new OperationLogInterceptor(db);
    const context = buildContext(
      'DELETE',
      '/api/v1/system/users/1',
      undefined,
      1,
    );
    const next = {
      handle: vi
        .fn()
        .mockReturnValue(throwError(() => new Error('Test error'))),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toThrow();
    // rxjs `throwError()` emits synchronously, so the tap error callback (and
    // thus the insert) has already run; vi.waitFor is not available under bun test.
    expect(db.db.insert).toHaveBeenCalled();
  });
});
