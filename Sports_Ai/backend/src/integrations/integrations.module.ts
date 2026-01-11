import { Module, Global } from '@nestjs/common';
import { MappingService } from './mapping.service';
import { TheOddsApiService } from './the-odds-api.service';
import { ApiSportsService } from './api-sports.service';
import { TheSportsDbService } from './the-sports-db.service';
import { SportmonksService } from './sportmonks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [
    MappingService,
    TheOddsApiService,
    ApiSportsService,
    TheSportsDbService,
    SportmonksService,
  ],
  exports: [
    MappingService,
    TheOddsApiService,
    ApiSportsService,
    TheSportsDbService,
    SportmonksService,
  ],
})
export class IntegrationsModule {}
