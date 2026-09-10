import { Module } from '@nestjs/common';
import { DictTypesController } from './dict-types.controller';
import { DictTypesService } from './dict-types.service';
@Module({
  controllers: [DictTypesController],
  providers: [DictTypesService],
  exports: [DictTypesService],
})
export class DictTypesModule {}
