import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { Public } from '../../common/auth/public.decorator.js';

const loginSchema = z.object({ username: z.string().min(1).max(64), password: z.string().min(8).max(128) });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login') @HttpCode(200)
  @Public()
  async login(@Body() body: unknown) { return this.authService.login(loginSchema.parse(body)); }
  @Post('refresh') @HttpCode(200)
  @Public()
  async refresh(@Body() body: unknown) {
    try { return await this.authService.refresh(refreshSchema.parse(body).refreshToken); }
    catch { throw new UnauthorizedException('Refresh token is invalid or expired'); }
  }
}
