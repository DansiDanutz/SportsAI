import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TelegramNotificationsService } from './telegram-notifications.service';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [NotificationsController, TelegramWebhookController],
  providers: [NotificationsService, TelegramNotificationsService],
  exports: [NotificationsService, TelegramNotificationsService],
})
export class NotificationsModule {}
