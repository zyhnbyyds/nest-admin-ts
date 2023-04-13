import { Controller, Get, Query } from '@nestjs/common';
import { WeixinService } from './weixin.service';

@Controller('weixin')
export class WeixinController {
  constructor(private readonly weixinService: WeixinService) {}

  @Get('/vedilate')
  /** 校验微信后台 */
  async vedilateWeiXin(
    @Query()
    query: {
      signature: string;
      timestamp: string;
      nonce: string;
      echostr: string;
    },
  ) {
    console.log(await this.weixinService.validateWeiXin(query));
    return await this.weixinService.validateWeiXin(query);
  }
}
