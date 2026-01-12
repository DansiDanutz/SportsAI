import { Module } from '@nestjs/common';
import { ArbitrageController } from './arbitrage.controller';
import { ArbitrageService } from './arbitrage.service';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CreditsModule } from '../credits/credits.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [UsersModule, PrismaModule, CreditsModule, AiModule],
  controllers: [ArbitrageController],
  providers: [ArbitrageService],
  exports: [ArbitrageService],
})
export class ArbitrageModule {}
