import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Telegram Push Notification Service for SportsAI
 * Sends real-time alerts to users via Telegram Bot API
 */
@Injectable()
export class TelegramNotificationsService {
  private readonly logger = new Logger(TelegramNotificationsService.name);
  private readonly botToken: string | undefined;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram notifications disabled');
    }
  }

  get isEnabled(): boolean {
    return !!this.botToken;
  }

  /**
   * Send a text message to a Telegram chat
   */
  async sendMessage(chatId: string, text: string, options?: {
    parseMode?: 'HTML' | 'MarkdownV2';
    disableNotification?: boolean;
  }): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.debug('Telegram notifications disabled, skipping send');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options?.parseMode || 'HTML',
          disable_notification: options?.disableNotification || false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Telegram API error: ${response.status} — ${error}`);
        return false;
      }

      this.logger.debug(`Telegram message sent to ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send Telegram message: ${error}`);
      return false;
    }
  }

  /**
   * Format and send an arbitrage alert
   */
  async sendArbitrageAlert(chatId: string, data: {
    profitMargin: number;
    event: string;
    sport: string;
    bookmakers: string[];
    odds: number[];
    stake?: number;
  }): Promise<boolean> {
    const emoji = data.profitMargin >= 5 ? '🔥' : data.profitMargin >= 3 ? '⚡' : '📊';
    const profit = data.profitMargin.toFixed(2);

    const text = [
      `${emoji} <b>Arbitrage Alert!</b>`,
      ``,
      `<b>Event:</b> ${this.escapeHtml(data.event)}`,
      `<b>Sport:</b> ${this.escapeHtml(data.sport)}`,
      `<b>Profit Margin:</b> ${profit}%`,
      ``,
      ...data.bookmakers.map((bk, i) =>
        `📌 ${this.escapeHtml(bk)}: <b>${data.odds[i]?.toFixed(2) || 'N/A'}</b>`
      ),
      ``,
      data.stake
        ? `💰 Suggested stake: $${data.stake.toFixed(2)}`
        : `💡 Use our calculator for optimal stake`,
      ``,
      `⏰ Act fast — odds change quickly!`,
    ].join('\n');

    return this.sendMessage(chatId, text);
  }

  /**
   * Format and send an odds threshold alert
   */
  async sendOddsAlert(chatId: string, data: {
    event: string;
    market: string;
    currentOdds: number;
    threshold: number;
    direction: 'above' | 'below';
  }): Promise<boolean> {
    const arrow = data.direction === 'above' ? '📈' : '📉';
    const text = [
      `${arrow} <b>Odds Alert!</b>`,
      ``,
      `<b>Event:</b> ${this.escapeHtml(data.event)}`,
      `<b>Market:</b> ${this.escapeHtml(data.market)}`,
      `<b>Current Odds:</b> ${data.currentOdds.toFixed(2)}`,
      `<b>Threshold:</b> ${data.direction} ${data.threshold.toFixed(2)}`,
      ``,
      `🔔 Your alert condition has been met!`,
    ].join('\n');

    return this.sendMessage(chatId, text);
  }

  /**
   * Format and send a favorite team event alert
   */
  async sendTeamEventAlert(chatId: string, data: {
    teamName: string;
    opponent: string;
    league: string;
    startTime: string;
  }): Promise<boolean> {
    const text = [
      `⚽ <b>Team Alert!</b>`,
      ``,
      `<b>${this.escapeHtml(data.teamName)}</b> vs ${this.escapeHtml(data.opponent)}`,
      `<b>League:</b> ${this.escapeHtml(data.league)}`,
      `<b>Starts:</b> ${data.startTime}`,
      ``,
      `🎯 Check SportsAI for the best odds!`,
    ].join('\n');

    return this.sendMessage(chatId, text);
  }

  /**
   * Send a welcome message when user connects Telegram
   */
  async sendWelcome(chatId: string): Promise<boolean> {
    const text = [
      `🎉 <b>Welcome to SportsAI Alerts!</b>`,
      ``,
      `You'll now receive real-time notifications for:`,
      `📊 Arbitrage opportunities`,
      `📈 Odds threshold alerts`,
      `⚽ Favorite team events`,
      ``,
      `Manage your alerts at sports-ai-one.vercel.app`,
    ].join('\n');

    return this.sendMessage(chatId, text);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
