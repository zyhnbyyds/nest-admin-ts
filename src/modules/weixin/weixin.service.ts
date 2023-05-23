import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WeixinService {
  private readonly token = 'weinxintttttttttt';
  async validateWeiXin(query: {
    signature: string;
    timestamp: string;
    nonce: string;
    echostr: string;
  }) {
    const { signature, timestamp, nonce, echostr } = query;
    const hash = crypto
      .createHash('sha1')
      .update([this.token, timestamp, nonce].sort().join(''))
      .digest('hex');
    if (signature === hash) {
      console.log(Number(echostr), echostr);
      return echostr;
    } else {
      return '校验失败';
    }
  }
}
