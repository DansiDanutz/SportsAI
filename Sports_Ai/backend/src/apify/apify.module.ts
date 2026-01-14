import { Module } from '@nestjs/common';
import { ApifyService } from './apify.service';
import { ApifyController } from './apify.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { FlashscoreModule } from '../flashscore/flashscore.module';

@Module({
  imports: [PrismaModule, UsersModule, FlashscoreModule],
  controllers: [ApifyController],
  providers: [ApifyService],
  exports: [ApifyService],
})
export class ApifyModule {}
