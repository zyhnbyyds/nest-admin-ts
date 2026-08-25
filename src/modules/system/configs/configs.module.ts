import { Module } from '@nestjs/common';
import { ConfigsController } from './configs.controller.js';
import { ConfigsService } from './configs.service.js';
@Module({ controllers: [ConfigsController], providers: [ConfigsService] })
export class ConfigsModule {}
