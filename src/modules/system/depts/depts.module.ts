import { Module } from '@nestjs/common';
import { DeptsController } from './depts.controller';
import { DeptsService } from './depts.service';
@Module({
  controllers: [DeptsController],
  providers: [DeptsService],
  exports: [DeptsService],
})
export class DeptsModule {}
