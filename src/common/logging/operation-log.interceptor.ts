import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { DatabaseService } from '../../database/database.service';
import { operationLogs } from '../../database/schema/index';

type LogRequest = {
  method?: string;
  url?: string;
  ip?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  user?: { id?: number };
};
type LogEntry = {
  userId: number | undefined;
  controller: string;
  handler: string;
  method: string;
  url: string;
  ip: string | undefined;
  requestBody: unknown;
  responseBody: unknown;
  status: 'success' | 'failure';
  errorMessage: string | undefined;
  durationMs: number;
};

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SENSITIVE = /password|secret|token|authorization/i;

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(private readonly database: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<LogRequest>();
    const method = (request.method ?? 'GET').toUpperCase();
    const url = request.url ?? '';
    if (!MUTATING.has(method) || url.includes('/auth/')) return next.handle();
    const startedAt = Date.now();
    const entry: LogEntry = {
      userId: request.user?.id,
      controller: context.getClass().name,
      handler: context.getHandler().name,
      method,
      url,
      ip: resolveIp(request),
      requestBody: sanitize(request.body),
      responseBody: undefined,
      status: 'success',
      errorMessage: undefined,
      durationMs: 0,
    };
    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          void this.write({
            ...entry,
            responseBody,
            durationMs: Date.now() - startedAt,
          });
        },
        error: (error: unknown) => {
          void this.write({
            ...entry,
            status: 'failure',
            errorMessage: messageOf(error),
            durationMs: Date.now() - startedAt,
          });
        },
      }),
    );
  }

  private async write(entry: LogEntry): Promise<void> {
    try {
      await this.database.db.insert(operationLogs).values({
        userId: entry.userId ?? null,
        title: `${entry.controller}.${entry.handler}`,
        businessType: businessType(entry.method),
        method: `${entry.controller}.${entry.handler}`,
        requestMethod: entry.method,
        url: entry.url.slice(0, 500),
        ip: entry.ip ?? null,
        requestBody: entry.requestBody ?? null,
        responseBody: entry.responseBody ?? null,
        status: entry.status,
        errorMessage: entry.errorMessage ?? null,
        durationMs: entry.durationMs,
      });
    } catch {
      /* best-effort audit logging */
    }
  }
}

function businessType(method: string): string {
  if (method === 'POST') return 'insert';
  if (method === 'PATCH' || method === 'PUT') return 'update';
  if (method === 'DELETE') return 'delete';
  return 'other';
}

/** 解析真实客户端 IP：优先取 x-forwarded-for 最左侧地址（代理后 request.ip 是代理 IP） */
function resolveIp(request: LogRequest): string | undefined {
  const forwarded = request.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  return request.ip;
}

function messageOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 2000);
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(value as Record<string, unknown>))
      result[key] = SENSITIVE.test(key) ? '***' : sanitize(field);
    return result;
  }
  return value;
}
