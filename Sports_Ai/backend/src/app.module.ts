import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ArbitrageModule } from './arbitrage/arbitrage.module';
import { CreditsModule } from './credits/credits.module';
import { OddsModule } from './odds/odds.module';
import { AiModule } from './ai/ai.module';
import { FavoritesModule } from './favorites/favorites.module';
import { PresetsModule } from './presets/presets.module';
import { AdminModule } from './admin/admin.module';
import { EventsModule } from './events/events.module';
import { InsightsModule } from './insights/insights.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TeamsModule } from './teams/teams.module';
import { AlertsModule } from './alerts/alerts.module';
import { SetupModule } from './setup/setup.module';
import { ApifyModule } from './apify/apify.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { HealthModule } from './health/health.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { FlashscoreModule } from './flashscore/flashscore.module';
import { StrategyModule } from './strategy/strategy.module';
import { WalletModule } from './wallet/wallet.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [
    // API Rate Limiting - 100 requests per minute per IP
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60000, // 1 minute window
      limit: 100, // 100 requests per window
    }, {
      name: 'short',
      ttl: 1000, // 1 second window
      limit: 10, // 10 requests per second (for burst protection)
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AiModule,
    ArbitrageModule,
    IntegrationsModule,
    CreditsModule,
    OddsModule,
    EventsModule,
    TeamsModule,
    FavoritesModule,
    AlertsModule,
    NotificationsModule,
    InsightsModule,
    PresetsModule,
    SetupModule,
    ApifyModule,
    FlashscoreModule,
    StrategyModule,
    WalletModule,
    LeaderboardModule,
    AdminModule,
    HealthModule,
    MonitoringModule,
  ],
  controllers: [],
  providers: [
    // Apply ThrottlerGuard globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
