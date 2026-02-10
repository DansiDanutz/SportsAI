import { Injectable, Logger } from '@nestjs/common';
import { BankrollService, RiskTier } from './bankroll.service';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface MartingaleSequence {
  id: string;
  startDate: string;
  currentLevel: number;
  maxLevels: number;
  baseStake: number;
  accumulatedLoss: number;
  nextRequiredStake: number;
  totalRisked: number;
  status: 'active' | 'completed_win' | 'completed_loss' | 'aborted';
  bets: Array<{
    betId: string;
    level: number;
    stake: number;
    odds: number;
    result: 'pending' | 'win' | 'loss';
    pnl: number;
    timestamp: string;
  }>;
  recoveryMode: boolean; // True when 3+ levels deep, switch to arbitrage
}

export interface MartingaleState {
  mode: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'HYBRID';
  enabled: boolean;
  activeSequences: MartingaleSequence[];
  completedSequences: MartingaleSequence[];
  totalSequences: number;
  successfulSequences: number;
  maxConcurrentSequences: number;
  safetySettings: {
    maxLevels: number;
    maxBankrollPercentage: number;
    highProbabilityThreshold: number; // Only use martingale on odds < this value
    recoveryModeThreshold: number; // Switch to arbitrage at this level
  };
  lastUpdated: string;
}

@Injectable()
export class MartingaleService {
  private readonly logger = new Logger(MartingaleService.name);
  private readonly martingaleFilePath = join(process.cwd(), 'data', 'martingale.json');

  // Martingale levels: $100 → $200 → $400 → $800 → $1600
  private readonly MARTINGALE_LEVELS = [100, 200, 400, 800, 1600];
  private readonly MAX_LEVELS = 5;
  private readonly HIGH_PROBABILITY_THRESHOLD = 1.50; // Only use martingale on odds < 1.50
  private readonly SAFETY_CAP_PERCENTAGE = 15; // Never exceed 15% of bankroll per step
  private readonly RECOVERY_MODE_THRESHOLD = 3; // Switch to arbitrage after 3 levels

  constructor(private bankrollService: BankrollService) {
    this.initializeMartingaleFile();
  }

  /**
   * Initialize martingale state file
   */
  private async initializeMartingaleFile(): Promise<void> {
    try {
      const dataDir = join(process.cwd(), 'data');
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      try {
        await fs.access(this.martingaleFilePath);
        this.logger.log('Martingale state file found');
      } catch {
        const defaultState: MartingaleState = {
          mode: 'HYBRID',
          enabled: true,
          activeSequences: [],
          completedSequences: [],
          totalSequences: 0,
          successfulSequences: 0,
          maxConcurrentSequences: 3,
          safetySettings: {
            maxLevels: this.MAX_LEVELS,
            maxBankrollPercentage: this.SAFETY_CAP_PERCENTAGE,
            highProbabilityThreshold: this.HIGH_PROBABILITY_THRESHOLD,
            recoveryModeThreshold: this.RECOVERY_MODE_THRESHOLD
          },
          lastUpdated: new Date().toISOString()
        };
        
        await fs.writeFile(this.martingaleFilePath, JSON.stringify(defaultState, null, 2));
        this.logger.log('Created new martingale state file');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize martingale file: ${error.message}`);
    }
  }

  /**
   * Get current martingale state
   */
  async getMartingaleState(): Promise<MartingaleState> {
    try {
      const data = await fs.readFile(this.martingaleFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to read martingale state: ${error.message}`);
      throw new Error('Could not read martingale state');
    }
  }

  /**
   * Update martingale state
   */
  async updateMartingaleState(state: MartingaleState): Promise<void> {
    try {
      state.lastUpdated = new Date().toISOString();
      await fs.writeFile(this.martingaleFilePath, JSON.stringify(state, null, 2));
    } catch (error) {
      this.logger.error(`Failed to update martingale state: ${error.message}`);
      throw new Error('Could not update martingale state');
    }
  }

  /**
   * Check if bet is suitable for martingale strategy
   */
  isSuitableForMartingale(odds: number, confidence: number): boolean {
    return odds <= this.HIGH_PROBABILITY_THRESHOLD && confidence >= 8;
  }

  /**
   * Calculate next martingale stake
   */
  async calculateMartingaleStake(
    sequence: MartingaleSequence | null,
    baseStake: number,
    odds: number
  ): Promise<{ stake: number; level: number; canProceed: boolean; reason?: string }> {
    const bankrollStats = await this.bankrollService.getStatistics();
    
    // If no active sequence, start with base stake
    if (!sequence) {
      const maxBetAmount = await this.bankrollService.getMaxBetAmount(RiskTier.HIGH);
      if (baseStake > maxBetAmount) {
        return {
          stake: 0,
          level: 0,
          canProceed: false,
          reason: 'Base stake exceeds risk limits'
        };
      }
      return { stake: baseStake, level: 1, canProceed: true };
    }

    // Calculate next level stake
    const nextLevel = sequence.currentLevel + 1;
    
    if (nextLevel > this.MAX_LEVELS) {
      return {
        stake: 0,
        level: nextLevel,
        canProceed: false,
        reason: 'Maximum martingale levels reached'
      };
    }

    // Calculate required stake to recover all losses plus profit
    // Required stake = (accumulated loss + desired profit) / (odds - 1)
    const desiredProfit = baseStake; // We want to win the original base stake
    const requiredStake = (sequence.accumulatedLoss + desiredProfit) / (odds - 1);
    
    // Safety check: never exceed percentage of bankroll
    const maxAllowedStake = (bankrollStats.currentBalance * this.SAFETY_CAP_PERCENTAGE) / 100;
    
    if (requiredStake > maxAllowedStake) {
      return {
        stake: 0,
        level: nextLevel,
        canProceed: false,
        reason: `Required stake $${requiredStake.toFixed(2)} exceeds safety cap of $${maxAllowedStake.toFixed(2)}`
      };
    }

    // Check if we should switch to recovery mode
    if (nextLevel >= this.RECOVERY_MODE_THRESHOLD) {
      return {
        stake: requiredStake,
        level: nextLevel,
        canProceed: true,
        reason: 'Entering recovery mode - consider arbitrage opportunities'
      };
    }

    return {
      stake: requiredStake,
      level: nextLevel,
      canProceed: true
    };
  }

  /**
   * Start new martingale sequence
   */
  async startMartingaleSequence(
    betId: string,
    baseStake: number,
    odds: number
  ): Promise<MartingaleSequence> {
    const state = await this.getMartingaleState();
    
    // Check if we can start new sequence
    if (state.activeSequences.length >= state.maxConcurrentSequences) {
      throw new Error('Maximum concurrent martingale sequences reached');
    }

    const sequence: MartingaleSequence = {
      id: `mg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startDate: new Date().toISOString(),
      currentLevel: 1,
      maxLevels: this.MAX_LEVELS,
      baseStake,
      accumulatedLoss: 0,
      nextRequiredStake: baseStake,
      totalRisked: baseStake,
      status: 'active',
      bets: [{
        betId,
        level: 1,
        stake: baseStake,
        odds,
        result: 'pending',
        pnl: 0,
        timestamp: new Date().toISOString()
      }],
      recoveryMode: false
    };

    state.activeSequences.push(sequence);
    state.totalSequences++;
    await this.updateMartingaleState(state);

    this.logger.log(`Started martingale sequence ${sequence.id} with base stake $${baseStake}`);
    return sequence;
  }

  /**
   * Process bet result for martingale sequence
   */
  async processMartingaleResult(
    betId: string,
    isWin: boolean,
    actualOdds: number
  ): Promise<{ sequence: MartingaleSequence; nextAction?: 'continue' | 'complete' | 'abort' }> {
    const state = await this.getMartingaleState();
    
    // Find the sequence containing this bet
    const sequence = state.activeSequences.find(seq => 
      seq.bets.some(bet => bet.betId === betId)
    );

    if (!sequence) {
      throw new Error(`Martingale sequence not found for bet ${betId}`);
    }

    // Find the specific bet
    const bet = sequence.bets.find(b => b.betId === betId);
    if (!bet) {
      throw new Error(`Bet ${betId} not found in sequence ${sequence.id}`);
    }

    // Update bet result
    bet.result = isWin ? 'win' : 'loss';
    bet.pnl = isWin ? bet.stake * (actualOdds - 1) : -bet.stake;

    if (isWin) {
      // Sequence completed successfully
      sequence.status = 'completed_win';
      const totalPnl = sequence.bets.reduce((sum, b) => sum + b.pnl, 0);
      
      // Move to completed sequences
      const activeIndex = state.activeSequences.indexOf(sequence);
      state.activeSequences.splice(activeIndex, 1);
      state.completedSequences.push(sequence);
      state.successfulSequences++;

      await this.updateMartingaleState(state);
      
      this.logger.log(`Martingale sequence ${sequence.id} completed successfully. Total P&L: $${totalPnl.toFixed(2)}`);
      return { sequence, nextAction: 'complete' };
    } else {
      // Loss - update sequence for next level
      sequence.accumulatedLoss += bet.stake;
      sequence.currentLevel++;

      // Check if we should continue or abort
      const nextStakeCalc = await this.calculateMartingaleStake(
        sequence,
        sequence.baseStake,
        actualOdds
      );

      if (!nextStakeCalc.canProceed || sequence.currentLevel > this.MAX_LEVELS) {
        // Abort sequence
        sequence.status = 'completed_loss';
        const activeIndex = state.activeSequences.indexOf(sequence);
        state.activeSequences.splice(activeIndex, 1);
        state.completedSequences.push(sequence);

        await this.updateMartingaleState(state);
        
        this.logger.warn(`Martingale sequence ${sequence.id} aborted. Reason: ${nextStakeCalc.reason || 'Max levels reached'}`);
        return { sequence, nextAction: 'abort' };
      } else {
        // Prepare for next level
        sequence.nextRequiredStake = nextStakeCalc.stake;
        sequence.totalRisked += nextStakeCalc.stake;
        
        // Check if entering recovery mode
        if (sequence.currentLevel >= this.RECOVERY_MODE_THRESHOLD) {
          sequence.recoveryMode = true;
        }

        await this.updateMartingaleState(state);
        
        this.logger.log(`Martingale sequence ${sequence.id} continuing to level ${sequence.currentLevel}. Next stake: $${nextStakeCalc.stake.toFixed(2)}`);
        return { sequence, nextAction: 'continue' };
      }
    }
  }

  /**
   * Add bet to existing martingale sequence
   */
  async addBetToSequence(
    sequenceId: string,
    betId: string,
    stake: number,
    odds: number
  ): Promise<void> {
    const state = await this.getMartingaleState();
    const sequence = state.activeSequences.find(seq => seq.id === sequenceId);

    if (!sequence) {
      throw new Error(`Active martingale sequence ${sequenceId} not found`);
    }

    sequence.bets.push({
      betId,
      level: sequence.currentLevel,
      stake,
      odds,
      result: 'pending',
      pnl: 0,
      timestamp: new Date().toISOString()
    });

    await this.updateMartingaleState(state);
  }

  /**
   * Get sequences in recovery mode (for arbitrage prioritization)
   */
  async getRecoveryModeSequences(): Promise<MartingaleSequence[]> {
    const state = await this.getMartingaleState();
    return state.activeSequences.filter(seq => seq.recoveryMode);
  }

  /**
   * Get martingale statistics
   */
  async getMartingaleStatistics(): Promise<{
    totalSequences: number;
    successfulSequences: number;
    successRate: number;
    activeSequences: number;
    sequencesInRecovery: number;
    totalRisked: number;
    totalProfit: number;
    avgSequenceLength: number;
    largestLoss: number;
    isEnabled: boolean;
    mode: string;
  }> {
    const state = await this.getMartingaleState();
    
    const allSequences = [...state.activeSequences, ...state.completedSequences];
    const totalRisked = allSequences.reduce((sum, seq) => sum + seq.totalRisked, 0);
    const totalProfit = state.completedSequences.reduce((sum, seq) => {
      return sum + seq.bets.reduce((betSum, bet) => betSum + bet.pnl, 0);
    }, 0);
    
    const avgSequenceLength = allSequences.length > 0 ? 
      allSequences.reduce((sum, seq) => sum + seq.bets.length, 0) / allSequences.length : 0;
    
    const largestLoss = Math.max(0, ...state.completedSequences
      .filter(seq => seq.status === 'completed_loss')
      .map(seq => Math.abs(seq.bets.reduce((sum, bet) => sum + bet.pnl, 0))));

    return {
      totalSequences: state.totalSequences,
      successfulSequences: state.successfulSequences,
      successRate: state.totalSequences > 0 ? (state.successfulSequences / state.totalSequences) * 100 : 0,
      activeSequences: state.activeSequences.length,
      sequencesInRecovery: state.activeSequences.filter(seq => seq.recoveryMode).length,
      totalRisked,
      totalProfit,
      avgSequenceLength,
      largestLoss,
      isEnabled: state.enabled,
      mode: state.mode
    };
  }

  /**
   * Enable/disable martingale strategy
   */
  async setMartingaleEnabled(enabled: boolean): Promise<void> {
    const state = await this.getMartingaleState();
    state.enabled = enabled;
    await this.updateMartingaleState(state);
    this.logger.log(`Martingale strategy ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Change martingale mode
   */
  async setMartingaleMode(mode: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'HYBRID'): Promise<void> {
    const state = await this.getMartingaleState();
    state.mode = mode;
    await this.updateMartingaleState(state);
    this.logger.log(`Martingale mode changed to ${mode}`);
  }

  /**
   * Get current active sequences
   */
  async getActiveSequences(): Promise<MartingaleSequence[]> {
    const state = await this.getMartingaleState();
    return state.activeSequences;
  }
}