import { Controller, Get } from '@nestjs/common';
@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { code: number; data: { status: string }; message: string } { return { code: 0, data: { status: 'ok' }, message: 'ok' }; }
}
