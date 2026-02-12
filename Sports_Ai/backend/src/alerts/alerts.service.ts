import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramNotificationsService } from '../notifications/telegram-notifications.service';

export interface OddsThresholdCondition {
  threshold: number;
  direction: 'below' | 'above';
  sportId?: string;
  marketKey?: string;
}

export interface ArbitrageCondition {
  minProfitMargin: number;
  sportId?: string;
}

export interface FavoriteTeamCondition {
  teamId: string;
  teamName: string;
}

export type AlertConditions = OddsThresholdCondition | ArbitrageCondition | FavoriteTeamCondition;

export interface CreateAlertDto {
  name: string;
  type: 'odds_threshold' | 'arbitrage_opportunity' | 'favorite_team_event';
  conditions: AlertConditions;
}

export interface UpdateAlertDto {
  name?: string;
  isActive?: boolean;
  conditions?: AlertConditions;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private telegramService: TelegramNotificationsService,
  ) {}

  async findAllByUser(userId: string) {
    return this.prisma.alertRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const alert = await this.prisma.alertRule.findFirst({
      where: { id, userId },
    });

    if (!alert) {
      throw new NotFoundException('Alert rule not found');
    }

    return alert;
  }

  async create(userId: string, dto: CreateAlertDto) {
    return this.prisma.alertRule.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        conditions: JSON.stringify(dto.conditions),
        isActive: true,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateAlertDto) {
    // Verify ownership
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Alert rule not found');
    }

    return this.prisma.alertRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.conditions !== undefined && { conditions: JSON.stringify(dto.conditions) }),
      },
    });
  }

  async delete(id: string, userId: string) {
    // Verify ownership
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Alert rule not found');
    }

    return this.prisma.alertRule.delete({
      where: { id },
    });
  }

  async toggle(id: string, userId: string) {
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Alert rule not found');
    }

    return this.prisma.alertRule.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
      },
    });
  }

  // Alert evaluation methods

  /**
   * Evaluate odds threshold alerts
   * Called when odds are updated
   */
  async evaluateOddsThresholdAlerts(eventId: string, currentOdds: number, marketKey: string, sportId?: string) {
    const alerts = await this.prisma.alertRule.findMany({
      where: {
        type: 'odds_threshold',
        isActive: true,
      },
    });

    for (const alert of alerts) {
      try {
        const conditions = JSON.parse(alert.conditions) as OddsThresholdCondition;

        // Check if the condition matches
        const matchesDirection =
          (conditions.direction === 'below' && currentOdds < conditions.threshold) ||
          (conditions.direction === 'above' && currentOdds > conditions.threshold);

        // Optional filters
        const matchesSport = !conditions.sportId || conditions.sportId === sportId;
        const matchesMarket = !conditions.marketKey || conditions.marketKey === marketKey;

        if (matchesDirection && matchesSport && matchesMarket) {
          // Trigger the alert
          await this.triggerAlert(alert.id, alert.userId, {
            type: 'odds_movement',
            title: `Odds Alert: ${alert.name}`,
            message: `Odds ${conditions.direction === 'below' ? 'dropped below' : 'rose above'} ${conditions.threshold} (current: ${currentOdds.toFixed(2)})`,
            data: JSON.stringify({ eventId, currentOdds, marketKey, threshold: conditions.threshold }),
          });
        }
      } catch (error) {
        console.error(`Error evaluating alert ${alert.id}:`, error);
      }
    }
  }

  /**
   * Evaluate arbitrage opportunity alerts
   * Called when new arbitrage opportunities are detected
   */
  async evaluateArbitrageAlerts(opportunityId: string, profitMargin: number, sportId?: string) {
    const alerts = await this.prisma.alertRule.findMany({
      where: {
        type: 'arbitrage_opportunity',
        isActive: true,
      },
    });

    for (const alert of alerts) {
      try {
        const conditions = JSON.parse(alert.conditions) as ArbitrageCondition;

        // Check if profit margin meets minimum
        const matchesProfit = profitMargin >= conditions.minProfitMargin;
        const matchesSport = !conditions.sportId || conditions.sportId === sportId;

        if (matchesProfit && matchesSport) {
          await this.triggerAlert(alert.id, alert.userId, {
            type: 'arbitrage',
            title: `Arbitrage Alert: ${alert.name}`,
            message: `New arbitrage opportunity found with ${profitMargin.toFixed(2)}% profit margin!`,
            data: JSON.stringify({ opportunityId, profitMargin }),
          });
        }
      } catch (error) {
        console.error(`Error evaluating alert ${alert.id}:`, error);
      }
    }
  }

  /**
   * Evaluate favorite team event alerts
   * Called when new events are added
   */
  async evaluateFavoriteTeamAlerts(eventId: string, teamId: string, teamName: string, eventDetails: { opponent: string; startTime: string; league: string }) {
    const alerts = await this.prisma.alertRule.findMany({
      where: {
        type: 'favorite_team_event',
        isActive: true,
      },
    });

    for (const alert of alerts) {
      try {
        const conditions = JSON.parse(alert.conditions) as FavoriteTeamCondition;

        if (conditions.teamId === teamId || conditions.teamName.toLowerCase() === teamName.toLowerCase()) {
          await this.triggerAlert(alert.id, alert.userId, {
            type: 'system',
            title: `Team Alert: ${conditions.teamName}`,
            message: `${conditions.teamName} vs ${eventDetails.opponent} - ${eventDetails.league} on ${eventDetails.startTime}`,
            data: JSON.stringify({ eventId, teamId, ...eventDetails }),
          });
        }
      } catch (error) {
        console.error(`Error evaluating alert ${alert.id}:`, error);
      }
    }
  }

  /**
   * Trigger an alert - creates notification and updates alert stats
   */
  private async triggerAlert(alertId: string, userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: string;
  }) {
    // Create in-app notification
    await this.notificationsService.create(userId, notification);

    // Send Telegram push notification if user has it connected
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true },
      });

      if (user?.telegramChatId && this.telegramService.isEnabled) {
        const data = notification.data ? JSON.parse(notification.data) : {};

        if (notification.type === 'arbitrage_opportunity' && data.profitMargin) {
          await this.telegramService.sendArbitrageAlert(user.telegramChatId, {
            profitMargin: data.profitMargin,
            event: data.event || notification.title,
            sport: data.sport || 'Unknown',
            bookmakers: data.bookmakers || [],
            odds: data.odds || [],
          });
        } else if (notification.type === 'odds_threshold') {
          await this.telegramService.sendOddsAlert(user.telegramChatId, {
            event: data.event || notification.title,
            market: data.market || 'Unknown',
            currentOdds: data.currentOdds || 0,
            threshold: data.threshold || 0,
            direction: data.direction || 'above',
          });
        } else if (notification.type === 'favorite_team_event') {
          await this.telegramService.sendTeamEventAlert(user.telegramChatId, {
            teamName: data.teamName || 'Unknown',
            opponent: data.opponent || 'Unknown',
            league: data.league || 'Unknown',
            startTime: data.startTime || 'TBD',
          });
        } else {
          // Generic fallback
          await this.telegramService.sendMessage(user.telegramChatId,
            `🔔 <b>${notification.title}</b>\n\n${notification.message}`);
        }
      }
    } catch (error) {
      // Don't let Telegram failures block alert processing
      this.logger.warn(`Telegram notification failed for user ${userId}: ${error}`);
    }

    // Update alert statistics
    await this.prisma.alertRule.update({
      where: { id: alertId },
      data: {
        triggeredCount: { increment: 1 },
        lastTriggeredAt: new Date(),
      },
    });
  }

  /**
   * Simulate an alert trigger for testing purposes
   */
  async simulateTrigger(id: string, userId: string) {
    const alert = await this.findById(id, userId);
    const conditions = JSON.parse(alert.conditions);

    let notification: { type: string; title: string; message: string; data?: string };

    switch (alert.type) {
      case 'odds_threshold':
        notification = {
          type: 'odds_movement',
          title: `Odds Alert: ${alert.name}`,
          message: `Test alert - Odds ${conditions.direction === 'below' ? 'dropped below' : 'rose above'} ${conditions.threshold}`,
          data: JSON.stringify({ test: true, threshold: conditions.threshold }),
        };
        break;
      case 'arbitrage_opportunity':
        notification = {
          type: 'arbitrage',
          title: `Arbitrage Alert: ${alert.name}`,
          message: `Test alert - Arbitrage opportunity with ${conditions.minProfitMargin}%+ profit detected`,
          data: JSON.stringify({ test: true, minProfitMargin: conditions.minProfitMargin }),
        };
        break;
      case 'favorite_team_event':
        notification = {
          type: 'system',
          title: `Team Alert: ${conditions.teamName}`,
          message: `Test alert - ${conditions.teamName} has an upcoming event`,
          data: JSON.stringify({ test: true, teamName: conditions.teamName }),
        };
        break;
      default:
        throw new Error(`Unknown alert type: ${alert.type}`);
    }

    await this.triggerAlert(id, userId, notification);

    return {
      success: true,
      message: 'Alert triggered successfully',
      notification,
    };
  }
}
