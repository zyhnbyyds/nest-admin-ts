import { Module } from '@nestjs/common';
import { CacheController } from './cache.controller';
@Module({ controllers: [CacheController] })
export class CacheModule {}
