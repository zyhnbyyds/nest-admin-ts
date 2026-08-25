import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator.js';
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth(): { code: number; data: { status: string }; message: string } {
    return { code: 0, data: { status: 'ok' }, message: 'ok' };
  }
}
