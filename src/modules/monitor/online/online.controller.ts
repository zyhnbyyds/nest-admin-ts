import { Controller, Delete, Get, Param, ParseIntPipe } from '@nestjs/common';
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { OnlineService } from './online.service.js';

@Controller('monitor/online')
export class OnlineController {
  constructor(private readonly online: OnlineService) {}
  @Get() @RequirePermissions('monitor:online:list') list() {
    return this.online.list();
  }
  @Delete(':userId') @RequirePermissions('monitor:online:delete') forceLogout(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.online.forceLogout(userId);
  }
}
