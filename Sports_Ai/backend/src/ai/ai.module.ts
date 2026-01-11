import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { UsersModule } from '../users/users.module';
import { OpenRouterService } from './openrouter.service';
import { DailyTipsService } from './daily-tips.service';
import { SharpMoneyService } from './sharp-money.service';
import { LanguageService } from './language.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [UsersModule, PrismaModule],
  controllers: [AiController],
  providers: [OpenRouterService, DailyTipsService, SharpMoneyService, LanguageService],
  exports: [OpenRouterService, DailyTipsService, SharpMoneyService, LanguageService],
})
export class AiModule {}
