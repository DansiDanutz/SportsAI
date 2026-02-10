import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { LiveDataController } from './live-data.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, IntegrationsModule, ConfigModule],
  controllers: [EventsController, LiveDataController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
