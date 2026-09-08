import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { BaseCrudTool } from '../base/base-crud.tool';
import { RedisService } from '../../../common/cache/redis.service';

/** cache.info Tool：查询 Redis 缓存信息 */
@Injectable()
export class CacheInfoTool extends BaseCrudTool<RedisService> {
  name = 'cache.info';
  description = '查询 Redis 缓存运行信息（是否启用、连接状态、键数量）。';
  permission = 'monitor:cache:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = { type: 'object', properties: {} };
  action = 'list' as const;

  constructor(service: RedisService) {
    super(service);
  }

  protected override async doList() {
    return {
      enabled: this.service.enabled,
      connected: await this.service.ping(),
      dbsize: await this.service.dbsize(),
    };
  }
}
