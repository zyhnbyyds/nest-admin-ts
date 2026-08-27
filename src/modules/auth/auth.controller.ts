import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { Public } from '../../common/auth/public.decorator.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { registerComponent } from '../../common/swagger/zod-schema.helper.js';

const loginSchema = z.object({
  username: z.string().min(1).max(64).openapi({ example: 'admin', description: '用户名' }),
  password: z.string().min(8).max(128).openapi({ example: '123456', description: '密码' }),
});
const refreshSchema = z.object({
  refreshToken: z.string().min(1).openapi({ example: 'eyJhbG...', description: '刷新令牌' }),
});

registerComponent('LoginRequest', loginSchema);
registerComponent('RefreshRequest', refreshSchema);

type LoginRequest = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

@ApiTags('认证管理')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ schema: { $ref: '#/components/schemas/LoginRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async login(@Body() body: unknown, @Req() request: LoginRequest) {
    const userAgent = request.headers?.['user-agent'];
    return this.authService.login(loginSchema.parse(body), {
      ip: request.ip,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: '刷新令牌' })
  @ApiBody({ schema: { $ref: '#/components/schemas/RefreshRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 401, description: '刷新令牌无效或已过期' })
  async refresh(@Body() body: unknown) {
    try {
      return await this.authService.refresh(
        refreshSchema.parse(body).refreshToken,
      );
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '退出登录' })
  @ApiBody({ schema: { $ref: '#/components/schemas/RefreshRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  async logout(@Body() body: unknown) {
    await this.authService.logout(refreshSchema.parse(body).refreshToken);
    return { success: true };
  }
}