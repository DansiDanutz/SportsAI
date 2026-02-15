import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MonitoringController],
})
export class MonitoringModule {}
