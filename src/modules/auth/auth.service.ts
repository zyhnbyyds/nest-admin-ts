import { UserService } from './../user/user.service';
import { Injectable } from '@nestjs/common';
import { LoginFormParams } from './dto/login-auth.dto';
import { JwtService } from '@nestjs/jwt';

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
      return { token: this.jwtService.sign(payload) };
    }
    return null;
  }
  test() {
    return 'test';
  }
}
