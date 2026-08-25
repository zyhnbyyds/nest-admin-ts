import { Module } from '@nestjs/common';
import { DeptsController } from './depts.controller.js';
import { DeptsService } from './depts.service.js';
@Module({ controllers: [DeptsController], providers: [DeptsService] })
export class DeptsModule {}
