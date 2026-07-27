import {
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramNotificationsService } from './telegram-notifications.service';

/**
 * Telegram Bot Webhook Controller
 * Handles /start command to link Telegram accounts to SportsAI users
 * 
 * Setup: Set webhook via Telegram Bot API:
 * POST https://api.telegram.org/bot<TOKEN>/setWebhook
 * { "url": "https://sportsapiai.onrender.com/api/telegram/webhook",
 *   "secret_token": "<TELEGRAM_WEBHOOK_SECRET>" }
 */
@Controller('api/telegram')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramNotificationsService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Body() update: any,
    @Headers('x-telegram-bot-api-secret-token') providedSecret?: string,
  ) {
    this.assertAuthenticWebhook(providedSecret);

    try {
      const message = update?.message;
      if (!message?.text) return { ok: true };

      const chatId = String(message.chat.id);
      const text = message.text.trim();

      // Handle /start <linkCode> — user clicks link from SportsAI settings
      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        if (parts.length === 2) {
          const linkCode = parts[1];
          await this.linkAccount(chatId, linkCode);
        } else {
          await this.telegramService.sendMessage(chatId, [
            '👋 <b>SportsAI Alerts Bot</b>',
            '',
            'To connect your account:',
            '1. Go to SportsAI Settings → Notifications',
            '2. Click "Connect Telegram"',
            '3. You\'ll be redirected here automatically',
            '',
            'Or paste your link code: <code>/start YOUR_CODE</code>',
          ].join('\n'));
        }
        return { ok: true };
      }

      // Handle /stop — unlink account
      if (text === '/stop') {
        await this.unlinkAccount(chatId);
        return { ok: true };
      }

      // Handle /status — check connection
      if (text === '/status') {
        const user = await this.prisma.user.findFirst({
          where: { telegramChatId: chatId },
          select: { email: true, subscriptionTier: true },
        });

        if (user) {
          await this.telegramService.sendMessage(chatId, [
            '✅ <b>Connected!</b>',
            `Account: ${user.email}`,
            `Plan: ${user.subscriptionTier}`,
          ].join('\n'));
        } else {
          await this.telegramService.sendMessage(chatId,
            '❌ Not connected. Use /start to link your account.');
        }
        return { ok: true };
      }

    } catch (error) {
      this.logger.error(`Webhook error: ${error}`);
    }

    return { ok: true };
  }

  private assertAuthenticWebhook(providedSecret?: string): void {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';

    if (!expectedSecret) {
      if (isProduction) {
        throw new ServiceUnavailableException(
          'Telegram webhook is disabled until its secret is configured',
        );
      }
      return;
    }

    const expected = Buffer.from(expectedSecret);
    const provided = Buffer.from(providedSecret || '');
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      throw new UnauthorizedException('Invalid Telegram webhook secret');
    }
  }

  private async linkAccount(chatId: string, linkCode: string) {
    try {
      // Find user by temporary link code stored in preferences
      const users = await this.prisma.user.findMany({
        where: { preferences: { contains: linkCode } },
      });

      const user = users.find((candidate) => {
        try {
          const preferences = JSON.parse(candidate.preferences || '{}');
          return preferences.telegramLinkCode === linkCode;
        } catch {
          return false;
        }
      });

      if (!user) {
        await this.telegramService.sendMessage(chatId,
          '❌ Invalid or expired link code. Please generate a new one from SportsAI Settings.');
        return;
      }

      // Update user with Telegram chat ID
      const prefs = JSON.parse(user.preferences || '{}');
      delete prefs.telegramLinkCode; // Remove used link code
      prefs.telegramConnected = true;
      prefs.telegramConnectedAt = new Date().toISOString();

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          telegramChatId: chatId,
          preferences: JSON.stringify(prefs),
        },
      });

      await this.telegramService.sendWelcome(chatId);
      this.logger.log(`Telegram linked for user ${user.id}`);
    } catch (error) {
      this.logger.error(`Link account error: ${error}`);
      await this.telegramService.sendMessage(chatId,
        '❌ Something went wrong. Please try again.');
    }
  }

  private async unlinkAccount(chatId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (!user) {
        await this.telegramService.sendMessage(chatId,
          'ℹ️ No account linked to this chat.');
        return;
      }

      const prefs = JSON.parse(user.preferences || '{}');
      prefs.telegramConnected = false;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          telegramChatId: null,
          preferences: JSON.stringify(prefs),
        },
      });

      await this.telegramService.sendMessage(chatId,
        '👋 Account unlinked. You won\'t receive alerts here anymore.');
    } catch (error) {
      this.logger.error(`Unlink error: ${error}`);
    }
  }
}
