import { Module } from '@nestjs/common';
import { OnlineController } from './online.controller';
import { OnlineService } from './online.service';
@Module({
  controllers: [OnlineController],
  providers: [OnlineService],
  exports: [OnlineService],
})
export class OnlineModule {}
