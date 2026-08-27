import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/public.decorator.js';
@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '成功' })
  getHealth(): { code: number; data: { status: string }; message: string } {
    return { code: 0, data: { status: 'ok' }, message: 'ok' };
  }
}
