import { Module } from '@nestjs/common';
import { WeixinService } from './weixin.service';
import { WeixinController } from './weixin.controller';

@Module({
  controllers: [WeixinController],
  providers: [WeixinService],
})
export class WeixinModule {}
