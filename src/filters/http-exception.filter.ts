import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as log4js from 'log4js';

const logger = log4js.getLogger();
logger.level = 'all';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    logger.error(
      `error==>${request.method} ${request.url} reason==>${exception.message}`,
    );

    response.status(status).json({
      code: status,
      data: null,
      msg: exception.message,
    });
  }
}
