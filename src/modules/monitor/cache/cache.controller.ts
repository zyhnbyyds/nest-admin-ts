import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/auth/permissions.decorator';
import { RedisService } from '../../../common/cache/redis.service';

@ApiTags('缓存监控')
@Controller('monitor/cache')
export class CacheController {
  constructor(private readonly redis: RedisService) {}
  @Get()
  @RequirePermissions('monitor:cache:list')
  @ApiOperation({ summary: '获取Redis缓存信息' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiBearerAuth('access-token')
  async info() {
    return {
      enabled: this.redis.enabled,
      connected: await this.redis.ping(),
      dbsize: await this.redis.dbsize(),
    };
  }
}
