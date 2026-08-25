import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
@Module({ controllers: [RolesController], providers: [RolesService] })
export class RolesModule {}
