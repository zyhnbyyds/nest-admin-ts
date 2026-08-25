import { Module } from '@nestjs/common';
import { OnlineController } from './online.controller.js';
import { OnlineService } from './online.service.js';
@Module({
  controllers: [OnlineController],
  providers: [OnlineService],
  exports: [OnlineService],
})
export class OnlineModule {}
