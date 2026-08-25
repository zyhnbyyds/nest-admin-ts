import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../../../common/auth/permissions.decorator.js';
import { RedisService } from '../../../common/cache/redis.service.js';

@Controller('monitor/cache')
export class CacheController {
  constructor(private readonly redis: RedisService) {}
  @Get() @RequirePermissions('monitor:cache:list') async info() {
    return {
      enabled: this.redis.enabled,
      connected: await this.redis.ping(),
      dbsize: await this.redis.dbsize(),
    };
  }
}
