import {
  Body,
  Controller,
  HttpCode,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { Public } from '../../common/auth/public.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { registerComponent } from '../../common/swagger/zod-schema.helper';

const loginSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(64)
    .openapi({ example: 'admin', description: '用户名' }),
  password: z
    .string()
    .min(8)
    .max(128)
    .openapi({ example: '123456', description: '密码' }),
});
const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(64)
    .openapi({ example: 'zhangsan', description: '用户名（3-64 个字符）' }),
  displayName: z
    .string()
    .min(1)
    .max(64)
    .openapi({ example: '张三', description: '显示名称' }),
  password: z
    .string()
    .min(8)
    .max(128)
    .openapi({ example: 'password123', description: '密码（最少 8 位）' }),
  email: z
    .string()
    .email()
    .optional()
    .openapi({ example: 'zhangsan@example.com', description: '邮箱' }),
  phone: z
    .string()
    .max(20)
    .optional()
    .openapi({ example: '13800138000', description: '手机号' }),
});
const refreshSchema = z.object({
  refreshToken: z
    .string()
    .min(1)
    .openapi({ example: 'eyJhbG...', description: '刷新令牌' }),
});
const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1)
    .max(64)
    .optional()
    .openapi({ example: '张三', description: '显示名称' }),
  email: z
    .email()
    .nullable()
    .optional()
    .openapi({ example: 'zhangsan@example.com', description: '邮箱' }),
  phone: z
    .string()
    .max(20)
    .nullable()
    .optional()
    .openapi({ example: '13800138000', description: '手机号' }),
});
const changePasswordSchema = z.object({
  oldPassword: z
    .string()
    .min(1)
    .openapi({ example: 'admin123456', description: '原密码' }),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .openapi({ example: 'newpassword123', description: '新密码（最少 8 位）' }),
});

registerComponent('LoginRequest', loginSchema);
registerComponent('RegisterRequest', registerSchema);
registerComponent('RefreshRequest', refreshSchema);
registerComponent('UpdateProfileRequest', updateProfileSchema);
registerComponent('ChangePasswordRequest', changePasswordSchema);

type LoginRequest = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};
type AuthRequest = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  user?: { id: number };
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

  @Post('register')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ schema: { $ref: '#/components/schemas/RegisterRequest' } })
  @ApiResponse({ status: 200, description: '注册成功并返回令牌' })
  @ApiResponse({ status: 409, description: '用户名已存在' })
  async register(@Body() body: unknown, @Req() request: LoginRequest) {
    const userAgent = request.headers?.['user-agent'];
    return this.authService.register(registerSchema.parse(body), {
      ip: request.ip,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    });
  }

  @Patch('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '更新当前用户资料' })
  @ApiBody({ schema: { $ref: '#/components/schemas/UpdateProfileRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  async updateProfile(@Body() body: unknown, @Req() request: AuthRequest) {
    await this.authService.updateProfile(
      request.user?.id ?? 0,
      updateProfileSchema.parse(body),
    );
    return { success: true };
  }

  @Patch('password')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '修改当前用户密码' })
  @ApiBody({ schema: { $ref: '#/components/schemas/ChangePasswordRequest' } })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 401, description: '原密码错误' })
  async changePassword(@Body() body: unknown, @Req() request: AuthRequest) {
    await this.authService.changePassword(
      request.user?.id ?? 0,
      changePasswordSchema.parse(body),
    );
    return { success: true };
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
