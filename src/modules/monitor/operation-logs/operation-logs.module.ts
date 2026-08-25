import { Module } from '@nestjs/common';
import { OperationLogsController } from './operation-logs.controller.js';
import { OperationLogsService } from './operation-logs.service.js';
@Module({ controllers: [OperationLogsController], providers: [OperationLogsService] })
export class OperationLogsModule {}
