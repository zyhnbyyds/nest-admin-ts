import { Controller, Post, Body, HttpCode, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginFormParams } from './dto/login-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('/login')
  async login(@Body() createAuthDto: LoginFormParams) {
    return this.authService.login(createAuthDto);
  }

  @Post('/updateToken')
  async refreshToken(@Body() updateToken: { refreshToken: string }) {
    return this.authService.refreshToken(updateToken.refreshToken);
  }

  @Get('list')
  @HttpCode(200)
  getAuthList(@Req() req: any) {
    console.log(req.user);
  }
}
