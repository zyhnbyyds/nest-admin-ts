import { Module } from '@nestjs/common';
import { MenusController } from './menus.controller.js';
import { MenusService } from './menus.service.js';
@Module({
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
