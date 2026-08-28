import { Controller, Delete, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/auth/permissions.decorator';
import { OnlineService } from './online.service';

@ApiTags('在线用户')
@Controller('monitor/online')
export class OnlineController {
  constructor(private readonly online: OnlineService) {}
  @Get()
  @RequirePermissions('monitor:online:list')
  @ApiOperation({ summary: '获取在线用户列表' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  list() {
    return this.online.list();
  }
  @Delete(':userId')
  @RequirePermissions('monitor:online:delete')
  @ApiOperation({ summary: '强制下线' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  forceLogout(@Param('userId', ParseIntPipe) userId: number) {
    return this.online.forceLogout(userId);
  }
}
