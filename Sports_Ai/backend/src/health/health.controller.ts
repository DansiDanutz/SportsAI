import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('healthz')
  healthz() {
    return { status: 'ok' };
  }

  // Convenience alias (some tools default to /health)
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

