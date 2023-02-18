import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { authSecret } from 'config/authTokenSecret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: authSecret.secret,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.userId,
      userName: payload.userName,
      authList: payload.authList,
    };
  }
}
