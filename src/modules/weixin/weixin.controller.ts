import {
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
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
    @Res() res: any,
  ) {
    const echostr = await this.weixinService.validateWeiXin(query);
    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', 'text/plain')
      .send(echostr);
  }

  @Post('/vedilate')
  async getMessage(@Query() query: { openid: string }, @Req() body: any) {
    console.log(query, body);
    return '';
  }
}
