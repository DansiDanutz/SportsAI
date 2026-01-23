import { Module } from '@nestjs/common';
import { OddsController } from './odds.controller';
import { BookmakerController } from './bookmaker.controller';
import { OddsService } from './odds.service';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [UsersModule, PrismaModule],
  controllers: [OddsController, BookmakerController],
  providers: [OddsService],
  exports: [OddsService],
})
export class OddsModule {}
