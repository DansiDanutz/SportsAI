import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SystemMetric {
  name: string;
  value: number | string;
  status: 'ok' | 'warning' | 'critical';
  detail?: string;
}

@Controller('api/monitoring')
export class MonitoringController {
  constructor(private prisma: PrismaService) {}

  /**
   * Comprehensive system metrics dashboard endpoint.
   * Returns DB stats, data freshness, and system health in one call.
   */
  @Get('metrics')
  async getMetrics(): Promise<{ status: string; timestamp: string; metrics: SystemMetric[]; uptime: number }> {
    const now = new Date();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers24h,
      totalEvents,
      liveEvents,
      upcomingEvents,
      oddsQuotes1h,
      oddsQuotes24h,
      totalAlerts,
      totalBets,
      recentInsights,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { lastLoginAt: { gte: oneDayAgo } } }),
      this.prisma.event.count(),
      this.prisma.event.count({ where: { status: 'live' } }),
      this.prisma.event.count({ where: { status: 'upcoming', startTimeUtc: { gte: now } } }),
      this.prisma.oddsQuote.count({ where: { timestamp: { gte: oneHourAgo } } }),
      this.prisma.oddsQuote.count({ where: { timestamp: { gte: oneDayAgo } } }),
      this.prisma.alertRule.count().catch(() => 0),
      this.prisma.arbitrageOpportunity.count().catch(() => 0),
      this.prisma.insightFeedback.count({ where: { createdAt: { gte: oneDayAgo } } }).catch(() => 0),
    ]);

    const metrics: SystemMetric[] = [
      {
        name: 'total_users',
        value: totalUsers,
        status: totalUsers > 0 ? 'ok' : 'warning',
      },
      {
        name: 'active_users_24h',
        value: activeUsers24h,
        status: activeUsers24h > 0 ? 'ok' : 'warning',
      },
      {
        name: 'total_events',
        value: totalEvents,
        status: totalEvents > 0 ? 'ok' : 'critical',
        detail: `${liveEvents} live, ${upcomingEvents} upcoming`,
      },
      {
        name: 'odds_quotes_1h',
        value: oddsQuotes1h,
        status: oddsQuotes1h > 0 ? 'ok' : 'warning',
        detail: 'Odds data freshness (last hour)',
      },
      {
        name: 'odds_quotes_24h',
        value: oddsQuotes24h,
        status: oddsQuotes24h > 100 ? 'ok' : oddsQuotes24h > 0 ? 'warning' : 'critical',
        detail: 'Odds data volume (last 24h)',
      },
      {
        name: 'total_alert_rules',
        value: totalAlerts,
        status: 'ok',
      },
      {
        name: 'total_arbitrage_opportunities',
        value: totalBets,
        status: 'ok',
      },
      {
        name: 'recent_insights_feedback',
        value: recentInsights,
        status: 'ok',
      },
    ];

    const hasCritical = metrics.some(m => m.status === 'critical');
    const hasWarning = metrics.some(m => m.status === 'warning');

    return {
      status: hasCritical ? 'critical' : hasWarning ? 'degraded' : 'healthy',
      timestamp: now.toISOString(),
      metrics,
      uptime: process.uptime(),
    };
  }

  /**
   * Quick liveness probe - returns instantly, no DB calls.
   */
  @Get('ping')
  ping() {
    return { pong: true, ts: Date.now() };
  }

  /**
   * Database connectivity check.
   */
  @Get('db')
  async dbCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'connected', latencyMs: 0 };
    } catch (e) {
      return { status: 'disconnected', error: (e as Error).message };
    }
  }
}
