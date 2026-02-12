import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [ConfigModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService], // Export for use in other modules
})
export class WalletModule {}