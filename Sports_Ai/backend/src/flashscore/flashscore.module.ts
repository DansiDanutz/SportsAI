import { Module } from '@nestjs/common';
import { FlashscoreController } from './flashscore.controller';
import { FlashscoreService } from './flashscore.service';

@Module({
  controllers: [FlashscoreController],
  providers: [FlashscoreService],
  exports: [FlashscoreService],
})
export class FlashscoreModule {}

