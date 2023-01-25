import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as log4js from 'log4js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, next: ArgumentsHost) {
    const host = next.switchToHttp();
    const response = host.getResponse<Response>();
    const request = host.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const logger = log4js.getLogger();
    logger.debug(
      `error==>${request.method} ${request.url} reason==>${
        exception instanceof HttpException
          ? exception.message
          : '服务器发生异常~'
      }`,
    );
    response.status(status).json({
      code: status,
      msg: exception instanceof HttpException ? exception.message : exception,
      data: null,
    });
  }
}
