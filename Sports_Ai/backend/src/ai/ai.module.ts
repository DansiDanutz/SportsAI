import { Module, Global } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiFacadeService } from './ai.facade.service';
import { UsersModule } from '../users/users.module';
import { OpenRouterService } from './openrouter.service';
import { ZaiService } from './zai.service';
import { LlmService } from './llm.service';
import { DailyTipsService } from './daily-tips.service';
import { SharpMoneyService } from './sharp-money.service';
import { StrangeBetsService } from './strange-bets.service';
import { TicketGeneratorService } from './ticket-generator.service';
import { LanguageService } from './language.service';
import { AiQueueService } from './ai-queue.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Global()
@Module({
  imports: [UsersModule, PrismaModule, IntegrationsModule],
  controllers: [AiController],
  providers: [
    AiFacadeService,
    OpenRouterService,
    ZaiService,
    LlmService,
    DailyTipsService,
    SharpMoneyService,
    StrangeBetsService,
    TicketGeneratorService,
    LanguageService,
    AiQueueService,
  ],
  exports: [
    AiFacadeService,
    OpenRouterService,
    ZaiService,
    LlmService,
    DailyTipsService,
    SharpMoneyService,
    StrangeBetsService,
    TicketGeneratorService,
    LanguageService,
    AiQueueService,
  ],
})
export class AiModule {}
