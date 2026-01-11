import { Module } from '@nestjs/common';
import { ApifyService } from './apify.service';
import { ApifyController } from './apify.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [ApifyController],
  providers: [ApifyService],
  exports: [ApifyService],
})
export class ApifyModule {}
