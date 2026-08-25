import { Module } from '@nestjs/common';
import { CacheController } from './cache.controller.js';
@Module({ controllers: [CacheController] })
export class CacheModule {}
