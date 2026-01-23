import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MappingService } from './mapping.service';
import { TheOddsApiService } from './the-odds-api.service';
import { ApiSportsService } from './api-sports.service';
import { TheSportsDbService } from './the-sports-db.service';
import { SportmonksService } from './sportmonks.service';
import { NewsService } from './news.service';
import { SyncService } from './sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ApifyModule } from '../apify/apify.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    ApifyModule,
  ],
  controllers: [],
  providers: [
    MappingService,
    TheOddsApiService,
    ApiSportsService,
    TheSportsDbService,
    SportmonksService,
    NewsService,
    SyncService,
  ],
  exports: [
    MappingService,
    TheOddsApiService,
    ApiSportsService,
    TheSportsDbService,
    SportmonksService,
    NewsService,
    SyncService,
  ],
})
export class IntegrationsModule {}
