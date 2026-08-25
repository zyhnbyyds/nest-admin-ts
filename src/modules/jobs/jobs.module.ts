import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
@Module({ controllers: [JobsController], providers: [JobsService] })
export class JobsModule {}
