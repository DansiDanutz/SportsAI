import { Module, Global } from '@nestjs/common';
import { AiController } from './ai.controller';
import { UsersModule } from '../users/users.module';
import { OpenRouterService } from './openrouter.service';
import { ZaiService } from './zai.service';
import { LlmService } from './llm.service';
import { DailyTipsService } from './daily-tips.service';
import { SharpMoneyService } from './sharp-money.service';
import { StrangeBetsService } from './strange-bets.service';
import { TicketGeneratorService } from './ticket-generator.service';
import { LanguageService } from './language.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [UsersModule, PrismaModule],
  controllers: [AiController],
  providers: [
    OpenRouterService,
    ZaiService,
    LlmService,
    DailyTipsService,
    SharpMoneyService,
    StrangeBetsService,
    TicketGeneratorService,
    LanguageService,
  ],
  exports: [
    OpenRouterService,
    ZaiService,
    LlmService,
    DailyTipsService,
    SharpMoneyService,
    StrangeBetsService,
    TicketGeneratorService,
    LanguageService,
  ],
})
export class AiModule {}
