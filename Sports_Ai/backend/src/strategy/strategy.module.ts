import { Module } from '@nestjs/common';
import { StrategyController } from './strategy.controller';
import { StrategyService } from './strategy.service';
import { HistoryService } from './history.service';

@Module({
  controllers: [StrategyController],
  providers: [StrategyService, HistoryService],
  exports: [StrategyService, HistoryService],
})
export class StrategyModule {}