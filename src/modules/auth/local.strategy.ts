import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginFormParams } from './dto/login-auth.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(loginForm: LoginFormParams): Promise<any> {
    const user = await this.authService.login(loginForm);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
