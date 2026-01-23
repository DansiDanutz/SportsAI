import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ApifyModule } from '../apify/apify.module';

@Module({
  imports: [PrismaModule, IntegrationsModule, ApifyModule],
  controllers: [HealthController],
})
export class HealthModule {}

