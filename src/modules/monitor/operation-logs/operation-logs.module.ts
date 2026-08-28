import { Module } from '@nestjs/common';
import { OperationLogsController } from './operation-logs.controller';
import { OperationLogsService } from './operation-logs.service';
@Module({
  controllers: [OperationLogsController],
  providers: [OperationLogsService],
})
export class OperationLogsModule {}
