import { Module } from '@nestjs/common';
import { DictTypesController } from './dict-types.controller.js';
import { DictTypesService } from './dict-types.service.js';
@Module({ controllers: [DictTypesController], providers: [DictTypesService] })
export class DictTypesModule {}
