import { Module } from '@nestjs/common';
import { DictDataController } from './dict-data.controller';
import { DictDataService } from './dict-data.service';
@Module({
  controllers: [DictDataController],
  providers: [DictDataService],
  exports: [DictDataService],
})
export class DictDataModule {}
