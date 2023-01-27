import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as log4js from 'log4js';
import { inspect } from 'util';

interface ReturnData {
  data: any;
  code: number;
  message: string | null;
}

const logger = log4js.getLogger();
logger.level = 'all';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ReturnData> {
    const host = context.switchToHttp();
    const req = host.getRequest<Request>();
    const res = host.getResponse<Response>();
    const startTime = Date.now();
    if (res.statusCode === HttpStatus.CREATED && req.method === 'POST') {
      return next.handle().pipe(
        map((data) => {
          logger.info(
            `${req.method} ${req.url} ${inspect(req.body)} ==> ${
              res.statusCode
            } ${Date.now() - startTime}ms`,
          );
          return { data, code: 201, message: '创建成功' };
        }),
      );
    } else if (req.method === 'PATCH') {
      return next.handle().pipe(
        map((data) => {
          logger.info(
            `method="${req.method}" url="${req.url}" params=${inspect(
              req.body,
            )} spend="${Date.now() - startTime}ms"`,
          );
          return { data, code: 200, message: '修改成功' };
        }),
      );
    } else if (req.method === 'DELETE') {
      return next.handle().pipe(
        map((data) => {
          logger.info(
            `${req.method} ${req.url} ==> ${Date.now() - startTime}ms`,
          );
          return { data, code: 203, message: '删除成功' };
        }),
      );
    }

    return next.handle().pipe(
      map((data) => {
        logger.info(
          `${req.method} ${req.url} ==> ${res.statusCode} ${
            Date.now() - startTime
          }ms`,
        );
        return { data, code: 200, message: '获取成功' };
      }),
    );
  }
}
