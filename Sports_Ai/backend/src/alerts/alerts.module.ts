import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlertsController } from './alerts.controller';
import { SmartAlertsService } from './smart-alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { OddsScraperService } from '../odds/odds-scraper.service';
import { AiPredictorService } from '../ai/ai-predictor.service';
import { OddsService } from '../odds/odds.service';
import { TheOddsApiService } from '../integrations/the-odds-api.service';
import { FreeApisService } from '../integrations/free-apis.service';
import { OpenRouterService } from '../ai/openrouter.service';
import { ConfigService } from '@nestjs/config';
import { TelegramNotificationsService } from '../notifications/telegram-notifications.service';

@Module({
  imports: [ConfigModule],
  controllers: [AlertsController],
  providers: [
    SmartAlertsService,
    PrismaService,
    OddsScraperService,
    AiPredictorService,
    OddsService,
    TheOddsApiService,
    FreeApisService,
    OpenRouterService,
    ConfigService,
    TelegramNotificationsService,
  ],
  exports: [SmartAlertsService]
})
export class AlertsModule {}