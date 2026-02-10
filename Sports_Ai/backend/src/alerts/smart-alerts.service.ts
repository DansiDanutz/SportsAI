import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OddsScraperService } from '../odds/odds-scraper.service';
import { AiPredictorService } from '../ai/ai-predictor.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface SmartAlert {
  id?: string;
  type: 'odds_shift' | 'arbitrage' | 'high_confidence_pick' | 'bankroll_milestone' | 'stop_loss';
  eventId?: string;
  homeTeam?: string;
  awayTeam?: string;
  sport?: string;
  message: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  isRead: boolean;
  userId?: string;
}

interface OddsShift {
  eventId: string;
  outcome: string;
  oldOdds: number;
  newOdds: number;
  changePercentage: number;
  bookmaker: string;
}

interface ArbitrageOpportunity {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  profitMargin: number;
  stakes: {
    home: { bookmaker: string; odds: number; stake: number };
    away: { bookmaker: string; odds: number; stake: number };
    draw?: { bookmaker: string; odds: number; stake: number };
  };
  guaranteedProfit: number;
}

@Injectable()
export class SmartAlertsService {
  private readonly logger = new Logger(SmartAlertsService.name);
  private previousOddsSnapshot: Map<string, any> = new Map();
  private userAlerts: Map<string, SmartAlert[]> = new Map();

  constructor(
    private prisma: PrismaService,
    private oddsScraperService: OddsScraperService,
    private aiPredictorService: AiPredictorService
  ) {}

  /**
   * Run smart alerts check every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkForAlerts() {
    this.logger.log('Running smart alerts check...');
    
    try {
      await Promise.all([
        this.checkOddsShifts(),
        this.checkArbitrageOpportunities(),
        this.checkHighConfidencePicks(),
        this.checkBankrollAlerts()
      ]);
      
      this.logger.log('Smart alerts check completed');
    } catch (error) {
      this.logger.error(`Smart alerts check failed: ${error.message}`);
    }
  }

  /**
   * Check for significant odds shifts (>5%)
   */
  private async checkOddsShifts() {
    try {
      const currentOdds = await this.oddsScraperService.getLiveOddsFromFile();
      
      for (const event of currentOdds) {
        const previousEvent = this.previousOddsSnapshot.get(event.eventId);
        
        if (!previousEvent) {
          this.previousOddsSnapshot.set(event.eventId, event);
          continue;
        }
        
        // Compare odds for each bookmaker and outcome
        for (const currentBookmaker of event.bookmakers) {
          const previousBookmaker = previousEvent.bookmakers.find(
            (bm: any) => bm.name === currentBookmaker.name
          );
          
          if (!previousBookmaker) continue;
          
          // Check home odds shift
          const homeShift = this.calculateOddsShift(
            previousBookmaker.homeOdds,
            currentBookmaker.homeOdds
          );
          
          if (Math.abs(homeShift) >= 5) {
            await this.createAlert({
              type: 'odds_shift',
              eventId: event.eventId,
              homeTeam: event.homeTeam,
              awayTeam: event.awayTeam,
              sport: event.sport,
              message: `🚨 Sharp Money Alert: ${event.homeTeam} odds shifted ${homeShift > 0 ? '+' : ''}${homeShift.toFixed(1)}% at ${currentBookmaker.name}`,
              data: {
                outcome: 'home',
                oldOdds: previousBookmaker.homeOdds,
                newOdds: currentBookmaker.homeOdds,
                changePercentage: homeShift,
                bookmaker: currentBookmaker.name,
                direction: homeShift > 0 ? 'up' : 'down'
              },
              priority: Math.abs(homeShift) >= 10 ? 'urgent' : 'high',
              timestamp: new Date().toISOString(),
              isRead: false
            });
          }
          
          // Check away odds shift
          const awayShift = this.calculateOddsShift(
            previousBookmaker.awayOdds,
            currentBookmaker.awayOdds
          );
          
          if (Math.abs(awayShift) >= 5) {
            await this.createAlert({
              type: 'odds_shift',
              eventId: event.eventId,
              homeTeam: event.homeTeam,
              awayTeam: event.awayTeam,
              sport: event.sport,
              message: `🚨 Sharp Money Alert: ${event.awayTeam} odds shifted ${awayShift > 0 ? '+' : ''}${awayShift.toFixed(1)}% at ${currentBookmaker.name}`,
              data: {
                outcome: 'away',
                oldOdds: previousBookmaker.awayOdds,
                newOdds: currentBookmaker.awayOdds,
                changePercentage: awayShift,
                bookmaker: currentBookmaker.name,
                direction: awayShift > 0 ? 'up' : 'down'
              },
              priority: Math.abs(awayShift) >= 10 ? 'urgent' : 'high',
              timestamp: new Date().toISOString(),
              isRead: false
            });
          }
        }
        
        // Update snapshot
        this.previousOddsSnapshot.set(event.eventId, event);
      }
    } catch (error) {
      this.logger.error(`Failed to check odds shifts: ${error.message}`);
    }
  }

  /**
   * Check for arbitrage opportunities
   */
  private async checkArbitrageOpportunities() {
    try {
      const liveOdds = await this.oddsScraperService.getLiveOddsFromFile();
      
      for (const event of liveOdds) {
        if (event.bookmakers.length < 2) continue;
        
        // Find best odds for each outcome across all bookmakers
        let bestHome = { odds: 0, bookmaker: '' };
        let bestAway = { odds: 0, bookmaker: '' };
        let bestDraw = { odds: 0, bookmaker: '' };
        
        for (const bookmaker of event.bookmakers) {
          if (bookmaker.homeOdds > bestHome.odds) {
            bestHome = { odds: bookmaker.homeOdds, bookmaker: bookmaker.name };
          }
          if (bookmaker.awayOdds > bestAway.odds) {
            bestAway = { odds: bookmaker.awayOdds, bookmaker: bookmaker.name };
          }
          if (bookmaker.drawOdds && bookmaker.drawOdds > bestDraw.odds) {
            bestDraw = { odds: bookmaker.drawOdds, bookmaker: bookmaker.name };
          }
        }
        
        // Calculate arbitrage opportunity
        const totalImpliedProb = (1 / bestHome.odds) + (1 / bestAway.odds) + 
          (bestDraw.odds > 0 ? (1 / bestDraw.odds) : 0);
        
        if (totalImpliedProb < 0.98) { // 2% profit margin minimum
          const profitMargin = (1 - totalImpliedProb) * 100;
          const totalStake = 100; // $100 example stake
          
          const arbitrageData: ArbitrageOpportunity = {
            eventId: event.eventId,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            profitMargin,
            stakes: {
              home: {
                bookmaker: bestHome.bookmaker,
                odds: bestHome.odds,
                stake: totalStake / (bestHome.odds * totalImpliedProb)
              },
              away: {
                bookmaker: bestAway.bookmaker,
                odds: bestAway.odds,
                stake: totalStake / (bestAway.odds * totalImpliedProb)
              }
            },
            guaranteedProfit: totalStake * profitMargin / 100
          };
          
          if (bestDraw.odds > 0) {
            arbitrageData.stakes.draw = {
              bookmaker: bestDraw.bookmaker,
              odds: bestDraw.odds,
              stake: totalStake / (bestDraw.odds * totalImpliedProb)
            };
          }
          
          await this.createAlert({
            type: 'arbitrage',
            eventId: event.eventId,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            sport: event.sport,
            message: `💰 ARBITRAGE ALERT: ${event.homeTeam} vs ${event.awayTeam} - ${profitMargin.toFixed(2)}% guaranteed profit!`,
            data: arbitrageData,
            priority: profitMargin >= 3 ? 'urgent' : 'high',
            timestamp: new Date().toISOString(),
            isRead: false
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check arbitrage opportunities: ${error.message}`);
    }
  }

  /**
   * Check for high confidence AI picks (>80%)
   */
  private async checkHighConfidencePicks() {
    try {
      // Get recent AI predictions
      const recentPredictions = await this.aiPredictorService.getPredictionHistory(10);
      
      for (const prediction of recentPredictions) {
        if (prediction.confidence >= 0.8) {
          const predictions = JSON.parse(prediction.predictions);
          const valueBets = JSON.parse(prediction.valueBets || '[]');
          
          // Find the highest probability outcome
          const outcomes = [
            { name: 'Home Win', probability: predictions.homeWinProbability },
            { name: 'Away Win', probability: predictions.awayWinProbability },
            { name: 'Draw', probability: predictions.drawProbability || 0 }
          ].sort((a, b) => b.probability - a.probability);
          
          const topOutcome = outcomes[0];
          const valueBeetsForOutcome = valueBets.filter((vb: any) => vb.isValueBet);
          
          if (valueBeetsForOutcome.length > 0) {
            await this.createAlert({
              type: 'high_confidence_pick',
              eventId: prediction.eventId,
              message: `🎯 HIGH CONFIDENCE PICK: ${topOutcome.name} (${(topOutcome.probability * 100).toFixed(1)}% confidence) - AI recommends ${valueBeetsForOutcome[0].outcome} at ${valueBeetsForOutcome[0].bestOdds}`,
              data: {
                confidence: prediction.confidence,
                recommendedOutcome: topOutcome,
                valueBets: valueBeetsForOutcome,
                reasoning: prediction.reasoning
              },
              priority: prediction.confidence >= 0.9 ? 'urgent' : 'high',
              timestamp: new Date().toISOString(),
              isRead: false
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check high confidence picks: ${error.message}`);
    }
  }

  /**
   * Check bankroll milestones and stop-loss alerts
   */
  private async checkBankrollAlerts() {
    try {
      // Get all active users with betting history
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
        include: {
          bettingHistory: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      
      for (const user of users) {
        if (!user.bettingHistory || user.bettingHistory.length === 0) continue;
        
        const currentBalance = user.bettingHistory[0]?.balance || 0;
        const initialBalance = user.initialBankroll || currentBalance;
        
        // Calculate profit/loss percentage
        const profitLossPercentage = ((currentBalance - initialBalance) / initialBalance) * 100;
        
        // Milestone alerts (every 25% gain)
        if (profitLossPercentage > 0 && profitLossPercentage % 25 < 1) {
          await this.createAlert({
            type: 'bankroll_milestone',
            message: `🎉 Milestone reached! Your bankroll is up ${profitLossPercentage.toFixed(1)}% (${currentBalance.toFixed(2)} total)`,
            data: {
              currentBalance,
              initialBalance,
              profitLossPercentage,
              type: 'milestone'
            },
            priority: 'medium',
            timestamp: new Date().toISOString(),
            isRead: false,
            userId: user.id
          });
        }
        
        // Stop-loss alerts (10%, 20%, 30% down)
        if (profitLossPercentage <= -10) {
          const alertType = profitLossPercentage <= -30 ? 'urgent' : 
                         profitLossPercentage <= -20 ? 'high' : 'medium';
          
          await this.createAlert({
            type: 'stop_loss',
            message: `⚠️ STOP LOSS WARNING: Your bankroll is down ${Math.abs(profitLossPercentage).toFixed(1)}% (${currentBalance.toFixed(2)} remaining)`,
            data: {
              currentBalance,
              initialBalance,
              profitLossPercentage,
              type: 'stop_loss',
              recommendedAction: profitLossPercentage <= -30 ? 'Stop betting immediately' : 'Consider reducing stake sizes'
            },
            priority: alertType as any,
            timestamp: new Date().toISOString(),
            isRead: false,
            userId: user.id
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check bankroll alerts: ${error.message}`);
    }
  }

  /**
   * Create and store alert
   */
  private async createAlert(alert: SmartAlert): Promise<void> {
    try {
      // Store in database
      await this.prisma.alert.create({
        data: {
          type: alert.type,
          eventId: alert.eventId,
          homeTeam: alert.homeTeam,
          awayTeam: alert.awayTeam,
          sport: alert.sport,
          message: alert.message,
          data: JSON.stringify(alert.data),
          priority: alert.priority,
          isRead: alert.isRead,
          userId: alert.userId,
          createdAt: new Date(alert.timestamp)
        }
      });
      
      // Add to in-memory cache for real-time access
      const userId = alert.userId || 'global';
      if (!this.userAlerts.has(userId)) {
        this.userAlerts.set(userId, []);
      }
      
      const userAlerts = this.userAlerts.get(userId)!;
      userAlerts.unshift(alert);
      
      // Keep only last 50 alerts per user
      if (userAlerts.length > 50) {
        userAlerts.splice(50);
      }
      
      this.logger.log(`Created ${alert.type} alert: ${alert.message}`);
    } catch (error) {
      this.logger.error(`Failed to create alert: ${error.message}`);
    }
  }

  /**
   * Get alerts for a user
   */
  async getAlertsForUser(userId: string, limit: number = 20): Promise<SmartAlert[]> {
    try {
      const alerts = await this.prisma.alert.findMany({
        where: {
          OR: [
            { userId: userId },
            { userId: null } // Global alerts
          ]
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      });
      
      return alerts.map(alert => ({
        id: alert.id,
        type: alert.type as any,
        eventId: alert.eventId,
        homeTeam: alert.homeTeam,
        awayTeam: alert.awayTeam,
        sport: alert.sport,
        message: alert.message,
        data: JSON.parse(alert.data || '{}'),
        priority: alert.priority as any,
        timestamp: alert.createdAt.toISOString(),
        isRead: alert.isRead,
        userId: alert.userId
      }));
    } catch (error) {
      this.logger.error(`Failed to get alerts for user ${userId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string, userId: string): Promise<boolean> {
    try {
      await this.prisma.alert.update({
        where: { 
          id: alertId,
          OR: [
            { userId: userId },
            { userId: null }
          ]
        },
        data: { isRead: true }
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to mark alert ${alertId} as read: ${error.message}`);
      return false;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(): Promise<any> {
    try {
      const stats = await this.prisma.alert.groupBy({
        by: ['type', 'priority'],
        _count: true,
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });
      
      return {
        last24Hours: stats,
        totalAlerts: stats.reduce((sum, stat) => sum + stat._count, 0),
        byType: stats.reduce((acc, stat) => {
          acc[stat.type] = (acc[stat.type] || 0) + stat._count;
          return acc;
        }, {}),
        byPriority: stats.reduce((acc, stat) => {
          acc[stat.priority] = (acc[stat.priority] || 0) + stat._count;
          return acc;
        }, {})
      };
    } catch (error) {
      this.logger.error(`Failed to get alert stats: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Calculate odds shift percentage
   */
  private calculateOddsShift(oldOdds: number, newOdds: number): number {
    if (oldOdds === 0) return 0;
    return ((newOdds - oldOdds) / oldOdds) * 100;
  }

  /**
   * Health check for alerts service
   */
  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      totalCachedAlerts: Array.from(this.userAlerts.values()).reduce((sum, alerts) => sum + alerts.length, 0),
      oddsSnapshotSize: this.previousOddsSnapshot.size,
      lastCheck: new Date().toISOString()
    };
  }
}