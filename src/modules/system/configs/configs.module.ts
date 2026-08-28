import { Module } from '@nestjs/common';
import { ConfigsController } from './configs.controller';
import { ConfigsService } from './configs.service';
@Module({ controllers: [ConfigsController], providers: [ConfigsService] })
export class ConfigsModule {}
