import { authSecret } from './../../../config/authTokenSecret';
import { UserService } from './../user/user.service';
import { Injectable } from '@nestjs/common';
import { LoginFormParams } from './dto/login-auth.dto';
import { JwtService } from '@nestjs/jwt';
import * as log4js from 'log4js';

const logger = log4js.getLogger();
logger.level = 'all';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}
  async login(loginParams: LoginFormParams) {
    const user = await this.userService.findOneByUserName(loginParams.userName);
    if (user && user.password === loginParams.password) {
      const payload = { userName: user.userName, userId: user.id };
      logger.info(`${user.userName} 上线了~`);
      return {
        refreshToken: this.jwtService.sign(payload, {
          expiresIn: '8d',
        }),
        token: this.jwtService.sign(payload),
      };
    }
    return null;
  }

  async refreshToken(refreshToken: string) {
    const res = await this.jwtService.verify(refreshToken, {
      secret: authSecret.secret,
    });

    if (res) {
      const user = await this.userService.findOneByUserName(res.userName);
      return await this.login({
        userName: user.userName,
        password: user.password,
      });
    }
    return null;
  }
}
