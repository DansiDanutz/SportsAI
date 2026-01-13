import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { UsersModule } from '../users/users.module';
import { OpenRouterService } from './openrouter.service';
import { DailyTipsService } from './daily-tips.service';
import { SharpMoneyService } from './sharp-money.service';
import { StrangeBetsService } from './strange-bets.service';
import { TicketGeneratorService } from './ticket-generator.service';
import { LanguageService } from './language.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [UsersModule, PrismaModule, IntegrationsModule],
  controllers: [AiController],
  providers: [
    OpenRouterService,
    DailyTipsService,
    SharpMoneyService,
    StrangeBetsService,
    TicketGeneratorService,
    LanguageService,
  ],
  exports: [
    OpenRouterService,
    DailyTipsService,
    SharpMoneyService,
    StrangeBetsService,
    TicketGeneratorService,
    LanguageService,
  ],
})
export class AiModule {}
