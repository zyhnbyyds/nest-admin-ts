import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GlobalExceptionFilter } from './global-exception.filter';

function buildHost() {
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ send });
  return {
    host: {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: vi.fn().mockReturnValue({ status }),
      }),
    } as any,
    status,
    send,
  };
}

describe('GlobalExceptionFilter', () => {
  it('converts ZodError to 400 with field messages', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, send } = buildHost();
    const schema = z.object({ name: z.string().min(1) });
    const error = schema.safeParse({ name: '' }).error!;

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(400);
    const body = send.mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(Array.isArray(body.message)).toBe(true);
    expect(body.message[0]).toContain('名称');
    expect(body.message[0]).toContain('不能为空');
  });

  it('passes HttpException through with its status', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, send } = buildHost();

    filter.catch(new BadRequestException('key 已存在'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
  });

  it('falls back to 500 with a friendly message for unknown errors', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, send } = buildHost();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = send.mock.calls[0][0];
    expect(body.message).toBe('服务器内部错误，请稍后重试');
  });
});
