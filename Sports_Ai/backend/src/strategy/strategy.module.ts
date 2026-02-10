import { Module } from '@nestjs/common';
import { StrategyController } from './strategy.controller';
import { AutonomousController } from './autonomous.controller';
import { StrategyService } from './strategy.service';
import { HistoryService } from './history.service';
import { BankrollService } from './bankroll.service';
import { MartingaleService } from './martingale.service';
import { AutonomousService } from './autonomous.service';
import { BetSlipService } from './bet-slip.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StrategyController, AutonomousController],
  providers: [
    StrategyService, 
    HistoryService, 
    BankrollService, 
    MartingaleService, 
    AutonomousService,
    BetSlipService
  ],
  exports: [
    StrategyService, 
    HistoryService, 
    BankrollService, 
    MartingaleService, 
    AutonomousService,
    BetSlipService
  ],
})
export class StrategyModule {}