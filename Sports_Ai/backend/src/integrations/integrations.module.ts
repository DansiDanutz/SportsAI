import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MappingService } from './mapping.service';
import { TheOddsApiService } from './the-odds-api.service';
import { ApiSportsService } from './api-sports.service';
import { TheSportsDbService } from './the-sports-db.service';
import { SportmonksService } from './sportmonks.service';
import { SyncService } from './sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ArbitrageModule } from '../arbitrage/arbitrage.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ArbitrageModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    MappingService,
    TheOddsApiService,
    ApiSportsService,
    TheSportsDbService,
    SportmonksService,
    SyncService,
  ],
  exports: [
    MappingService,
    TheOddsApiService,
    ApiSportsService,
    TheSportsDbService,
    SportmonksService,
    SyncService,
  ],
})
export class IntegrationsModule {}
