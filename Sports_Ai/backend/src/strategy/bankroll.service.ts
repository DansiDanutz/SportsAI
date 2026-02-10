import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface BankrollState {
  starting_bankroll: number;
  current_bankroll: number;
  currency: string;
  start_date: string;
  mode: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'HYBRID';
  daily_pnl: Array<{
    date: string;
    starting_balance: number;
    ending_balance: number;
    pnl: number;
    bets_placed: number;
    wins: number;
    losses: number;
  }>;
  weekly_pnl: Array<{
    week_start: string;
    week_end: string;
    pnl: number;
    roi_percent: number;
  }>;
  monthly_pnl: Array<{
    month: string;
    pnl: number;
    roi_percent: number;
  }>;
  total_profit: number;
  total_bets: number;
  wins: number;
  losses: number;
  max_drawdown: number;
  current_drawdown: number;
  peak_balance: number;
  frozen: boolean;
  freeze_reason: string | null;
  last_updated: string;
}

export enum RiskTier {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  ARBITRAGE = 'ARBITRAGE'
}

export interface RiskLimits {
  tier: RiskTier;
  max_percentage: number;
  max_usd: number;
  description: string;
}

@Injectable()
export class BankrollService {
  private readonly logger = new Logger(BankrollService.name);
  private readonly bankrollFilePath = join(process.cwd(), 'data', 'bankroll.json');
  
  // Risk tier limits
  private readonly RISK_TIERS: Record<RiskTier, RiskLimits> = {
    [RiskTier.LOW]: {
      tier: RiskTier.LOW,
      max_percentage: 1,
      max_usd: 100,
      description: 'Conservative bets, 1% max risk'
    },
    [RiskTier.MEDIUM]: {
      tier: RiskTier.MEDIUM,
      max_percentage: 2,
      max_usd: 200,
      description: 'Balanced bets, 2% max risk'
    },
    [RiskTier.HIGH]: {
      tier: RiskTier.HIGH,
      max_percentage: 5,
      max_usd: 500,
      description: 'Aggressive bets, 3-5% max risk'
    },
    [RiskTier.ARBITRAGE]: {
      tier: RiskTier.ARBITRAGE,
      max_percentage: 10,
      max_usd: 1000,
      description: 'Risk-free arbitrage, up to 10%'
    }
  };

  // Stop loss limits
  private readonly DAILY_STOP_LOSS = 5; // 5% daily loss
  private readonly WEEKLY_STOP_LOSS = 15; // 15% weekly loss
  private readonly MONTHLY_STOP_LOSS = 25; // 25% monthly loss

  constructor() {
    this.initializeBankrollFile();
  }

  /**
   * Initialize bankroll file with default $10,000 starting balance
   */
  private async initializeBankrollFile(): Promise<void> {
    try {
      const dataDir = join(process.cwd(), 'data');
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      try {
        await fs.access(this.bankrollFilePath);
        this.logger.log('Bankroll file found');
      } catch {
        const defaultBankroll: BankrollState = {
          starting_bankroll: 10000,
          current_bankroll: 10000,
          currency: 'USD',
          start_date: new Date().toISOString().split('T')[0],
          mode: 'HYBRID',
          daily_pnl: [],
          weekly_pnl: [],
          monthly_pnl: [],
          total_profit: 0,
          total_bets: 0,
          wins: 0,
          losses: 0,
          max_drawdown: 0,
          current_drawdown: 0,
          peak_balance: 10000,
          frozen: false,
          freeze_reason: null,
          last_updated: new Date().toISOString()
        };
        
        await fs.writeFile(this.bankrollFilePath, JSON.stringify(defaultBankroll, null, 2));
        this.logger.log('Created new bankroll file with $10,000 starting balance');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize bankroll file: ${error.message}`);
    }
  }

  /**
   * Get current bankroll state
   */
  async getBankrollState(): Promise<BankrollState> {
    try {
      const data = await fs.readFile(this.bankrollFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to read bankroll state: ${error.message}`);
      throw new Error('Could not read bankroll state');
    }
  }

  /**
   * Update bankroll state
   */
  async updateBankrollState(state: BankrollState): Promise<void> {
    try {
      state.last_updated = new Date().toISOString();
      await fs.writeFile(this.bankrollFilePath, JSON.stringify(state, null, 2));
    } catch (error) {
      this.logger.error(`Failed to update bankroll state: ${error.message}`);
      throw new Error('Could not update bankroll state');
    }
  }

  /**
   * Get maximum bet amount for risk tier
   */
  async getMaxBetAmount(tier: RiskTier): Promise<number> {
    const state = await this.getBankrollState();
    
    if (state.frozen) {
      return 0;
    }

    const riskLimit = this.RISK_TIERS[tier];
    const percentageAmount = (state.current_bankroll * riskLimit.max_percentage) / 100;
    
    // Return the smaller of percentage-based amount or absolute USD limit
    return Math.min(percentageAmount, riskLimit.max_usd);
  }

  /**
   * Calculate unit size (1% of current bankroll)
   */
  async getUnitSize(): Promise<number> {
    const state = await this.getBankrollState();
    return state.current_bankroll * 0.01; // 1%
  }

  /**
   * Process bet result and update bankroll
   */
  async processBetResult(betId: string, amount: number, isWin: boolean, odds: number): Promise<void> {
    try {
      const state = await this.getBankrollState();
      
      let pnl: number;
      if (isWin) {
        pnl = amount * (odds - 1); // Profit from winning bet
        state.wins++;
      } else {
        pnl = -amount; // Loss of stake amount
        state.losses++;
      }

      // Update bankroll
      state.current_bankroll += pnl;
      state.total_profit += pnl;
      state.total_bets++;

      // Update peak balance and drawdown
      if (state.current_bankroll > state.peak_balance) {
        state.peak_balance = state.current_bankroll;
        state.current_drawdown = 0;
      } else {
        const drawdownAmount = state.peak_balance - state.current_bankroll;
        const drawdownPercent = (drawdownAmount / state.peak_balance) * 100;
        state.current_drawdown = drawdownPercent;
        
        if (drawdownPercent > state.max_drawdown) {
          state.max_drawdown = drawdownPercent;
        }
      }

      // Update daily P&L
      const today = new Date().toISOString().split('T')[0];
      let dailyEntry = state.daily_pnl.find(d => d.date === today);
      
      if (!dailyEntry) {
        dailyEntry = {
          date: today,
          starting_balance: state.current_bankroll - pnl,
          ending_balance: state.current_bankroll,
          pnl: pnl,
          bets_placed: 1,
          wins: isWin ? 1 : 0,
          losses: isWin ? 0 : 1
        };
        state.daily_pnl.push(dailyEntry);
      } else {
        dailyEntry.ending_balance = state.current_bankroll;
        dailyEntry.pnl += pnl;
        dailyEntry.bets_placed++;
        if (isWin) {
          dailyEntry.wins++;
        } else {
          dailyEntry.losses++;
        }
      }

      // Check stop-loss conditions
      await this.checkStopLossConditions(state);

      await this.updateBankrollState(state);
      
      this.logger.log(`Bet processed: ${isWin ? 'WIN' : 'LOSS'} | Amount: $${amount} | P&L: $${pnl.toFixed(2)} | New Balance: $${state.current_bankroll.toFixed(2)}`);
    } catch (error) {
      this.logger.error(`Failed to process bet result: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check stop-loss conditions and freeze if necessary
   */
  private async checkStopLossConditions(state: BankrollState): Promise<void> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Check daily stop-loss
    const dailyEntry = state.daily_pnl.find(d => d.date === todayStr);
    if (dailyEntry && dailyEntry.pnl < 0) {
      const dailyLossPercent = Math.abs(dailyEntry.pnl / dailyEntry.starting_balance) * 100;
      if (dailyLossPercent >= this.DAILY_STOP_LOSS) {
        state.frozen = true;
        state.freeze_reason = `Daily stop-loss triggered: ${dailyLossPercent.toFixed(2)}% loss`;
        this.logger.warn(`BANKROLL FROZEN: ${state.freeze_reason}`);
        return;
      }
    }

    // Check weekly stop-loss
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const weeklyPnL = state.daily_pnl
      .filter(d => d.date >= weekStartStr)
      .reduce((sum, d) => sum + d.pnl, 0);
    
    if (weeklyPnL < 0) {
      const weeklyStartBalance = state.daily_pnl.find(d => d.date === weekStartStr)?.starting_balance || state.current_bankroll;
      const weeklyLossPercent = Math.abs(weeklyPnL / weeklyStartBalance) * 100;
      if (weeklyLossPercent >= this.WEEKLY_STOP_LOSS) {
        state.frozen = true;
        state.freeze_reason = `Weekly stop-loss triggered: ${weeklyLossPercent.toFixed(2)}% loss`;
        this.logger.warn(`BANKROLL FROZEN: ${state.freeze_reason}`);
        return;
      }
    }

    // Check monthly stop-loss
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    
    const monthlyPnL = state.daily_pnl
      .filter(d => d.date >= monthStartStr)
      .reduce((sum, d) => sum + d.pnl, 0);
    
    if (monthlyPnL < 0) {
      const monthlyStartBalance = state.daily_pnl.find(d => d.date === monthStartStr)?.starting_balance || state.current_bankroll;
      const monthlyLossPercent = Math.abs(monthlyPnL / monthlyStartBalance) * 100;
      if (monthlyLossPercent >= this.MONTHLY_STOP_LOSS) {
        state.frozen = true;
        state.freeze_reason = `Monthly stop-loss triggered: ${monthlyLossPercent.toFixed(2)}% loss`;
        this.logger.warn(`BANKROLL FROZEN: ${state.freeze_reason}`);
        return;
      }
    }
  }

  /**
   * Calculate risk of ruin probability
   */
  async calculateRiskOfRuin(winRate: number, averageOdds: number): Promise<number> {
    const state = await this.getBankrollState();
    
    // Simplified risk of ruin calculation
    // RoR = ((1-p)/p)^(bankroll/averageBetSize)
    // where p = win probability, considering odds
    
    const winProbability = winRate / 100;
    const lossProbability = 1 - winProbability;
    const averageBetSize = await this.getUnitSize();
    const bankrollInUnits = state.current_bankroll / averageBetSize;
    
    if (winProbability >= 0.5) {
      return 0; // No risk if win rate >= 50%
    }
    
    const riskRatio = lossProbability / winProbability;
    const riskOfRuin = Math.pow(riskRatio, bankrollInUnits);
    
    return Math.min(riskOfRuin * 100, 100); // Return as percentage, max 100%
  }

  /**
   * Get current statistics
   */
  async getStatistics(): Promise<{
    currentBalance: number;
    totalProfit: number;
    totalBets: number;
    winRate: number;
    roi: number;
    maxDrawdown: number;
    currentDrawdown: number;
    unitSize: number;
    riskOfRuin: number;
    isFrozen: boolean;
    freezeReason: string | null;
  }> {
    const state = await this.getBankrollState();
    const winRate = state.total_bets > 0 ? (state.wins / state.total_bets) * 100 : 0;
    const roi = ((state.current_bankroll - state.starting_bankroll) / state.starting_bankroll) * 100;
    const unitSize = await this.getUnitSize();
    const riskOfRuin = await this.calculateRiskOfRuin(winRate, 2.0); // Assuming average odds of 2.0

    return {
      currentBalance: state.current_bankroll,
      totalProfit: state.total_profit,
      totalBets: state.total_bets,
      winRate,
      roi,
      maxDrawdown: state.max_drawdown,
      currentDrawdown: state.current_drawdown,
      unitSize,
      riskOfRuin,
      isFrozen: state.frozen,
      freezeReason: state.freeze_reason
    };
  }

  /**
   * Manually freeze/unfreeze bankroll
   */
  async freezeBankroll(reason: string): Promise<void> {
    const state = await this.getBankrollState();
    state.frozen = true;
    state.freeze_reason = reason;
    await this.updateBankrollState(state);
    this.logger.warn(`Bankroll manually frozen: ${reason}`);
  }

  async unfreezeBankroll(): Promise<void> {
    const state = await this.getBankrollState();
    state.frozen = false;
    state.freeze_reason = null;
    await this.updateBankrollState(state);
    this.logger.log('Bankroll unfrozen');
  }
}