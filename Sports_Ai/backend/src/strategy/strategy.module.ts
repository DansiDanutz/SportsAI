import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { StrategyController } from './strategy.controller';
import { AutonomousController } from './autonomous.controller';
import { PortfolioController } from './portfolio.controller';
import { StrategyService } from './strategy.service';
import { HistoryService } from './history.service';
import { BankrollService } from './bankroll.service';
import { MartingaleService } from './martingale.service';
import { AutonomousService } from './autonomous.service';
import { BetSlipService } from './bet-slip.service';
import { DailyAccumulatorsService } from './daily-accumulators.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [StrategyController, AutonomousController, PortfolioController],
  providers: [
    StrategyService, 
    HistoryService, 
    BankrollService, 
    MartingaleService, 
    AutonomousService,
    BetSlipService,
    DailyAccumulatorsService
  ],
  exports: [
    StrategyService, 
    HistoryService, 
    BankrollService, 
    MartingaleService, 
    AutonomousService,
    BetSlipService,
    DailyAccumulatorsService
  ],
})
export class StrategyModule {}