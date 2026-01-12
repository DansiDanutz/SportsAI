import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('healthz')
  healthz(): { status: string; service: string; version?: string; commit?: string } {
    // Render exposes RENDER_GIT_COMMIT in the runtime env for Git-based deploys.
    // We surface it so we can verify the running code matches the expected commit.
    const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT;
    const version = process.env.npm_package_version || process.env.APP_VERSION;
    return { status: 'ok', service: 'sportsai-backend', version, commit };
  }

  // Convenience alias (some tools default to /health)
  @Get('health')
  health(): { status: string; service: string; version?: string; commit?: string } {
    const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT;
    const version = process.env.npm_package_version || process.env.APP_VERSION;
    return { status: 'ok', service: 'sportsai-backend', version, commit };
  }
}

