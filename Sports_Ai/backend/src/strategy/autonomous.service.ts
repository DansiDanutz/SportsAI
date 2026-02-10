import { Injectable, Logger } from '@nestjs/common';
import { BankrollService, RiskTier } from './bankroll.service';
import { MartingaleService } from './martingale.service';
import { HistoryService } from './history.service';
import { StrategyService, BettingPick } from './strategy.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import axios from 'axios';

export interface AutonomousConfig {
  enabled: boolean;
  maxActiveBets: number;
  scanIntervalHours: number;
  resolveIntervalHours: number;
  valueThreshold: number; // Minimum edge percentage
  arbitrageThreshold: number; // Maximum arbitrage margin
  minOdds: number;
  maxOdds: number;
  allowedSports: string[];
  allowedLeagues: string[];
  riskMode: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'HYBRID';
  martingaleEnabled: boolean;
  arbitrageEnabled: boolean;
  lastScan: string | null;
  lastResolve: string | null;
}

export interface AutonomousAuditLog {
  timestamp: string;
  action: 'scan' | 'place_bet' | 'resolve_bet' | 'error' | 'config_change';
  details: any;
  result: 'success' | 'error' | 'skipped';
  message: string;
}

export interface ValueBetAnalysis {
  event: string;
  league: string;
  pick: string;
  odds: number;
  impliedProbability: number;
  estimatedRealProbability: number;
  edge: number;
  expectedValue: number;
  confidence: number;
  recommendedStake: number;
  riskTier: RiskTier;
  strategy: 'VALUE' | 'ARBITRAGE' | 'MARTINGALE';
}

@Injectable()
export class AutonomousService {
  private readonly logger = new Logger(AutonomousService.name);
  private readonly configFilePath = join(process.cwd(), 'data', 'autonomous_config.json');
  private readonly auditLogPath = join(process.cwd(), 'data', 'autonomous_audit.json');
  
  constructor(
    private bankrollService: BankrollService,
    private martingaleService: MartingaleService,
    private historyService: HistoryService,
    private strategyService: StrategyService
  ) {
    this.initializeConfigFile();
  }

  /**
   * Initialize autonomous configuration file
   */
  private async initializeConfigFile(): Promise<void> {
    try {
      const dataDir = join(process.cwd(), 'data');
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      try {
        await fs.access(this.configFilePath);
        this.logger.log('Autonomous config file found');
      } catch {
        const defaultConfig: AutonomousConfig = {
          enabled: true,
          maxActiveBets: 10,
          scanIntervalHours: 1,
          resolveIntervalHours: 2,
          valueThreshold: 3.0, // 3% minimum edge
          arbitrageThreshold: 2.0, // 2% max arbitrage margin
          minOdds: 1.20,
          maxOdds: 5.00,
          allowedSports: ['Soccer', 'Basketball', 'Tennis'],
          allowedLeagues: [
            'English Premier League',
            'UEFA Champions League',
            'NBA',
            'ATP Tour'
          ],
          riskMode: 'HYBRID',
          martingaleEnabled: true,
          arbitrageEnabled: true,
          lastScan: null,
          lastResolve: null
        };
        
        await fs.writeFile(this.configFilePath, JSON.stringify(defaultConfig, null, 2));
        this.logger.log('Created autonomous config file');
      }

      // Initialize audit log
      try {
        await fs.access(this.auditLogPath);
      } catch {
        await fs.writeFile(this.auditLogPath, JSON.stringify([], null, 2));
        this.logger.log('Created autonomous audit log');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize autonomous files: ${error.message}`);
    }
  }

  /**
   * Get autonomous configuration
   */
  async getConfig(): Promise<AutonomousConfig> {
    try {
      const data = await fs.readFile(this.configFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to read config: ${error.message}`);
      throw new Error('Could not read autonomous config');
    }
  }

  /**
   * Update autonomous configuration
   */
  async updateConfig(config: Partial<AutonomousConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      await fs.writeFile(this.configFilePath, JSON.stringify(newConfig, null, 2));
      
      await this.auditLog('config_change', config, 'success', 'Configuration updated');
      this.logger.log('Autonomous configuration updated');
    } catch (error) {
      this.logger.error(`Failed to update config: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add entry to audit log
   */
  private async auditLog(
    action: string,
    details: any,
    result: 'success' | 'error' | 'skipped',
    message: string
  ): Promise<void> {
    try {
      const logEntry: AutonomousAuditLog = {
        timestamp: new Date().toISOString(),
        action: action as any,
        details,
        result,
        message
      };

      const logData = await fs.readFile(this.auditLogPath, 'utf-8');
      const logs: AutonomousAuditLog[] = JSON.parse(logData);
      logs.push(logEntry);

      // Keep only last 1000 entries
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      await fs.writeFile(this.auditLogPath, JSON.stringify(logs, null, 2));
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }
  }

  /**
   * Main autonomous scanning function
   */
  async runAutonomousScan(): Promise<{ betsPlaced: number; betsAnalyzed: number; errors: number }> {
    const config = await this.getConfig();
    
    if (!config.enabled) {
      await this.auditLog('scan', {}, 'skipped', 'Autonomous mode disabled');
      return { betsPlaced: 0, betsAnalyzed: 0, errors: 0 };
    }

    let betsPlaced = 0;
    let betsAnalyzed = 0;
    let errors = 0;

    try {
      this.logger.log('Starting autonomous scan...');

      // Check bankroll status
      const bankrollStats = await this.bankrollService.getStatistics();
      if (bankrollStats.isFrozen) {
        await this.auditLog('scan', { reason: bankrollStats.freezeReason }, 'skipped', 'Bankroll frozen');
        return { betsPlaced: 0, betsAnalyzed: 0, errors: 0 };
      }

      // Get current active bets
      const activeBets = await this.historyService.getActivePicks();
      if (activeBets.length >= config.maxActiveBets) {
        await this.auditLog('scan', { activeBets: activeBets.length }, 'skipped', 'Max active bets reached');
        return { betsPlaced: 0, betsAnalyzed: 0, errors: 0 };
      }

      // Fetch today's events
      const events = await this.fetchTodaysEvents();
      this.logger.log(`Found ${events.length} events to analyze`);

      // Analyze each event for value bets and arbitrage
      for (const event of events) {
        try {
          betsAnalyzed++;
          const analysis = await this.analyzeEventForValue(event);
          
          if (analysis && this.shouldPlaceBet(analysis, config)) {
            const betPlaced = await this.placeBet(analysis);
            if (betPlaced) {
              betsPlaced++;
            }
            
            // Stop if we've reached max bets
            if (activeBets.length + betsPlaced >= config.maxActiveBets) {
              break;
            }
          }
        } catch (error) {
          errors++;
          this.logger.error(`Error analyzing event ${event.strEvent}: ${error.message}`);
        }
      }

      // Update last scan time
      config.lastScan = new Date().toISOString();
      await this.updateConfig({ lastScan: config.lastScan });

      await this.auditLog('scan', { 
        betsPlaced, 
        betsAnalyzed, 
        errors,
        activeBets: activeBets.length
      }, 'success', `Scan completed: ${betsPlaced} bets placed, ${errors} errors`);

      this.logger.log(`Autonomous scan completed: ${betsPlaced} bets placed, ${betsAnalyzed} analyzed, ${errors} errors`);
      return { betsPlaced, betsAnalyzed, errors };
      
    } catch (error) {
      errors++;
      await this.auditLog('scan', { error: error.message }, 'error', 'Scan failed');
      this.logger.error(`Autonomous scan failed: ${error.message}`);
      return { betsPlaced: 0, betsAnalyzed, errors };
    }
  }

  /**
   * Fetch today's sports events
   */
  private async fetchTodaysEvents(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Try multiple leagues for better coverage
      const leagues = [
        '4328', // English Premier League
        '4346', // UEFA Champions League
        '4387', // NBA
      ];

      const events = [];
      
      for (const leagueId of leagues) {
        try {
          const response = await axios.get(
            `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&l=${leagueId}`
          );
          
          if (response.data?.events) {
            events.push(...response.data.events);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch events for league ${leagueId}: ${error.message}`);
        }
      }

      return events;
    } catch (error) {
      this.logger.error(`Failed to fetch events: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze event for value betting opportunities
   */
  private async analyzeEventForValue(event: any): Promise<ValueBetAnalysis | null> {
    try {
      // Simulate odds analysis (in real implementation, get from odds API)
      const homeOdds = 2.10 + (Math.random() - 0.5) * 0.4; // Simulate odds around 2.10
      const drawOdds = 3.20 + (Math.random() - 0.5) * 0.6; // Simulate odds around 3.20
      const awayOdds = 3.50 + (Math.random() - 0.5) * 0.8; // Simulate odds around 3.50

      // Calculate implied probabilities
      const homeImplied = 1 / homeOdds;
      const drawImplied = 1 / drawOdds;
      const awayImplied = 1 / awayOdds;

      // Estimate real probabilities (simplified model)
      const homeReal = this.estimateRealProbability(event, 'home');
      const drawReal = this.estimateRealProbability(event, 'draw');
      const awayReal = this.estimateRealProbability(event, 'away');

      // Find best value bet
      const bets = [
        {
          pick: `${event.strHomeTeam} Win`,
          odds: homeOdds,
          impliedProb: homeImplied,
          realProb: homeReal,
          edge: (homeReal - homeImplied) * 100
        },
        {
          pick: 'Draw',
          odds: drawOdds,
          impliedProb: drawImplied,
          realProb: drawReal,
          edge: (drawReal - drawImplied) * 100
        },
        {
          pick: `${event.strAwayTeam} Win`,
          odds: awayOdds,
          impliedProb: awayImplied,
          realProb: awayReal,
          edge: (awayReal - awayImplied) * 100
        }
      ];

      const bestBet = bets.reduce((best, current) => 
        current.edge > best.edge ? current : best
      );

      const config = await this.getConfig();
      
      if (bestBet.edge < config.valueThreshold) {
        return null; // No sufficient edge
      }

      // Calculate Kelly Criterion stake
      const kellyPercent = this.calculateKellyStake(bestBet.edge / 100, bestBet.odds);
      const unitSize = await this.bankrollService.getUnitSize();
      const recommendedStake = kellyPercent * unitSize;

      // Determine risk tier based on edge and odds
      let riskTier: RiskTier;
      if (bestBet.edge > 8 || bestBet.odds < 1.5) {
        riskTier = RiskTier.HIGH;
      } else if (bestBet.edge > 5) {
        riskTier = RiskTier.MEDIUM;
      } else {
        riskTier = RiskTier.LOW;
      }

      // Determine strategy
      let strategy: 'VALUE' | 'ARBITRAGE' | 'MARTINGALE';
      const martingaleService = this.martingaleService;
      const isSuitableForMartingale = await martingaleService.isSuitableForMartingale(bestBet.odds, 8);
      
      if (bestBet.edge > 15) {
        strategy = 'ARBITRAGE';
      } else if (isSuitableForMartingale && config.martingaleEnabled) {
        strategy = 'MARTINGALE';
      } else {
        strategy = 'VALUE';
      }

      return {
        event: event.strEvent,
        league: event.strLeague,
        pick: bestBet.pick,
        odds: bestBet.odds,
        impliedProbability: bestBet.impliedProb * 100,
        estimatedRealProbability: bestBet.realProb * 100,
        edge: bestBet.edge,
        expectedValue: recommendedStake * (bestBet.odds - 1) * bestBet.realProb - recommendedStake * (1 - bestBet.realProb),
        confidence: Math.min(10, Math.max(1, bestBet.edge + 2)), // Convert edge to confidence
        recommendedStake,
        riskTier,
        strategy
      };

    } catch (error) {
      this.logger.error(`Failed to analyze event ${event.strEvent}: ${error.message}`);
      return null;
    }
  }

  /**
   * Estimate real probability for outcome (simplified model)
   */
  private estimateRealProbability(event: any, outcome: 'home' | 'draw' | 'away'): number {
    // Simplified model - in real implementation, use team stats, form, etc.
    const baseProbs = {
      home: 0.40,
      draw: 0.25,
      away: 0.35
    };

    // Add some random variation to simulate real analysis
    const variation = (Math.random() - 0.5) * 0.1;
    return Math.max(0.05, Math.min(0.95, baseProbs[outcome] + variation));
  }

  /**
   * Calculate Kelly Criterion stake
   */
  private calculateKellyStake(edge: number, odds: number): number {
    // Kelly% = (edge * odds - 1) / (odds - 1)
    const kelly = (edge * odds - 1) / (odds - 1);
    
    // Use fractional Kelly (25% of full Kelly for safety)
    return Math.max(0, Math.min(0.05, kelly * 0.25)); // Cap at 5%
  }

  /**
   * Determine if bet should be placed
   */
  private shouldPlaceBet(analysis: ValueBetAnalysis, config: AutonomousConfig): boolean {
    return (
      analysis.edge >= config.valueThreshold &&
      analysis.odds >= config.minOdds &&
      analysis.odds <= config.maxOdds &&
      config.allowedLeagues.some(league => 
        analysis.league.toLowerCase().includes(league.toLowerCase())
      )
    );
  }

  /**
   * Place a bet based on analysis
   */
  private async placeBet(analysis: ValueBetAnalysis): Promise<boolean> {
    try {
      // Check if we can afford the bet
      const maxBetAmount = await this.bankrollService.getMaxBetAmount(analysis.riskTier);
      const finalStake = Math.min(analysis.recommendedStake, maxBetAmount);

      if (finalStake < 1) {
        await this.auditLog('place_bet', analysis, 'skipped', 'Stake too low');
        return false;
      }

      // Create betting pick
      const pick: BettingPick = {
        id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().split('T')[0],
        event: analysis.event,
        league: analysis.league,
        pick: analysis.pick,
        odds: analysis.odds,
        confidence: analysis.confidence,
        stake_amount_usd: finalStake,
        stake_percentage: (finalStake / (await this.bankrollService.getBankrollState()).current_bankroll) * 100,
        strategy: `AUTONOMOUS_${analysis.strategy}`,
        status: 'pending',
        result: null,
        profit_loss_usd: null,
        created_at: new Date().toISOString(),
        home_team: analysis.event.split(' vs ')[0],
        away_team: analysis.event.split(' vs ')[1],
        match_time: new Date().toISOString()
      };

      // Save the pick
      await this.historyService.savePick(pick);

      // If using martingale strategy, start sequence
      if (analysis.strategy === 'MARTINGALE') {
        await this.martingaleService.startMartingaleSequence(
          pick.id,
          finalStake,
          analysis.odds
        );
      }

      await this.auditLog('place_bet', { 
        betId: pick.id, 
        stake: finalStake, 
        strategy: analysis.strategy 
      }, 'success', `Bet placed: ${analysis.pick} @ ${analysis.odds}`);

      this.logger.log(`Autonomous bet placed: ${analysis.pick} @ ${analysis.odds} for $${finalStake.toFixed(2)}`);
      return true;

    } catch (error) {
      await this.auditLog('place_bet', analysis, 'error', error.message);
      this.logger.error(`Failed to place bet: ${error.message}`);
      return false;
    }
  }

  /**
   * Resolve completed bets
   */
  async resolveCompletedBets(): Promise<{ resolved: number; errors: number }> {
    const config = await this.getConfig();
    
    if (!config.enabled) {
      return { resolved: 0, errors: 0 };
    }

    let resolved = 0;
    let errors = 0;

    try {
      const activeBets = await this.historyService.getActivePicks();
      this.logger.log(`Checking ${activeBets.length} active bets for resolution`);

      for (const bet of activeBets) {
        try {
          const result = await this.checkBetResult(bet);
          
          if (result.status !== 'pending') {
            await this.historyService.updatePickStatus(
              bet.id, 
              result.status as 'won' | 'lost' | 'void',
              result.profit_loss
            );

            // Update bankroll
            await this.bankrollService.processBetResult(
              bet.id,
              bet.stake_amount_usd,
              result.status === 'won',
              bet.odds
            );

            // Handle martingale sequences
            if (bet.strategy.includes('MARTINGALE')) {
              await this.martingaleService.processMartingaleResult(
                bet.id,
                result.status === 'won',
                bet.odds
              );
            }

            resolved++;
            await this.auditLog('resolve_bet', { 
              betId: bet.id, 
              result: result.status, 
              pnl: result.profit_loss 
            }, 'success', `Bet resolved: ${result.status}`);
          }
        } catch (error) {
          errors++;
          this.logger.error(`Error resolving bet ${bet.id}: ${error.message}`);
        }
      }

      // Update last resolve time
      config.lastResolve = new Date().toISOString();
      await this.updateConfig({ lastResolve: config.lastResolve });

      this.logger.log(`Bet resolution completed: ${resolved} resolved, ${errors} errors`);
      return { resolved, errors };

    } catch (error) {
      this.logger.error(`Bet resolution failed: ${error.message}`);
      return { resolved, errors: errors + 1 };
    }
  }

  /**
   * Check result of a specific bet
   */
  private async checkBetResult(bet: BettingPick): Promise<{ status: string; profit_loss: number }> {
    try {
      // In real implementation, check result via API
      // For now, simulate random results based on confidence
      const winProbability = bet.confidence / 10;
      const isWon = Math.random() < winProbability;
      
      if (isWon) {
        return {
          status: 'won',
          profit_loss: bet.stake_amount_usd * (bet.odds - 1)
        };
      } else {
        return {
          status: 'lost',
          profit_loss: -bet.stake_amount_usd
        };
      }
    } catch (error) {
      this.logger.error(`Failed to check bet result for ${bet.id}: ${error.message}`);
      return { status: 'pending', profit_loss: 0 };
    }
  }

  /**
   * Get autonomous statistics
   */
  async getAutonomousStatistics(): Promise<{
    isEnabled: boolean;
    lastScan: string | null;
    lastResolve: string | null;
    totalAutonomousBets: number;
    todaysBets: number;
    activeBets: number;
    successRate: number;
    totalProfit: number;
    avgStake: number;
    scanIntervalHours: number;
    nextScanIn: string;
  }> {
    const config = await this.getConfig();
    const allBets = await this.historyService.getAllPicks();
    const autonomousBets = allBets.filter(bet => bet.strategy.startsWith('AUTONOMOUS_'));
    const todaysBets = autonomousBets.filter(bet => bet.date === new Date().toISOString().split('T')[0]);
    const activeBets = autonomousBets.filter(bet => bet.status === 'pending');
    const completedBets = autonomousBets.filter(bet => bet.status !== 'pending');
    const wonBets = completedBets.filter(bet => bet.status === 'won');
    
    const successRate = completedBets.length > 0 ? (wonBets.length / completedBets.length) * 100 : 0;
    const totalProfit = completedBets.reduce((sum, bet) => sum + (bet.profit_loss_usd || 0), 0);
    const avgStake = autonomousBets.length > 0 ? 
      autonomousBets.reduce((sum, bet) => sum + bet.stake_amount_usd, 0) / autonomousBets.length : 0;

    let nextScanIn = 'unknown';
    if (config.lastScan) {
      const lastScanTime = new Date(config.lastScan);
      const nextScanTime = new Date(lastScanTime.getTime() + config.scanIntervalHours * 60 * 60 * 1000);
      const now = new Date();
      const diffMs = nextScanTime.getTime() - now.getTime();
      
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        nextScanIn = `${hours}h ${minutes}m`;
      } else {
        nextScanIn = 'overdue';
      }
    }

    return {
      isEnabled: config.enabled,
      lastScan: config.lastScan,
      lastResolve: config.lastResolve,
      totalAutonomousBets: autonomousBets.length,
      todaysBets: todaysBets.length,
      activeBets: activeBets.length,
      successRate,
      totalProfit,
      avgStake,
      scanIntervalHours: config.scanIntervalHours,
      nextScanIn
    };
  }

  /**
   * Get recent audit logs
   */
  async getAuditLogs(limit: number = 50): Promise<AutonomousAuditLog[]> {
    try {
      const data = await fs.readFile(this.auditLogPath, 'utf-8');
      const logs: AutonomousAuditLog[] = JSON.parse(data);
      return logs.slice(-limit).reverse(); // Return latest first
    } catch (error) {
      this.logger.error(`Failed to read audit logs: ${error.message}`);
      return [];
    }
  }
}