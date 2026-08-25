import { Module } from '@nestjs/common';
import { DictDataController } from './dict-data.controller.js';
import { DictDataService } from './dict-data.service.js';
@Module({ controllers: [DictDataController], providers: [DictDataService] })
export class DictDataModule {}
