import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { BettingPick } from './strategy.service';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);
  private readonly historyFilePath = join(process.cwd(), 'data', 'betting_history.json');

  constructor() {
    this.initializeHistoryFile();
  }

  /**
   * Initialize the history file if it doesn't exist
   */
  private async initializeHistoryFile(): Promise<void> {
    try {
      // Check if data directory exists
      const dataDir = join(process.cwd(), 'data');
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
        this.logger.log('Created data directory');
      }

      // Check if history file exists
      try {
        await fs.access(this.historyFilePath);
        this.logger.log('History file found');
      } catch {
        // Create initial empty history file
        await fs.writeFile(this.historyFilePath, JSON.stringify([], null, 2));
        this.logger.log('Created new betting history file');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize history file: ${error.message}`);
    }
  }

  /**
   * Save a betting pick to history
   */
  async savePick(pick: BettingPick): Promise<void> {
    try {
      const picks = await this.getAllPicks();
      
      // Check if pick already exists (by id)
      const existingIndex = picks.findIndex(p => p.id === pick.id);
      
      if (existingIndex >= 0) {
        // Update existing pick
        picks[existingIndex] = pick;
        this.logger.log(`Updated pick: ${pick.event} - ${pick.pick}`);
      } else {
        // Add new pick
        picks.push(pick);
        this.logger.log(`Saved new pick: ${pick.event} - ${pick.pick}`);
      }

      await fs.writeFile(this.historyFilePath, JSON.stringify(picks, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save pick: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all betting picks from history
   */
  async getAllPicks(): Promise<BettingPick[]> {
    try {
      const data = await fs.readFile(this.historyFilePath, 'utf8');
      const picks = JSON.parse(data) as BettingPick[];
      
      // Sort by created_at descending (most recent first)
      return picks.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      this.logger.error(`Failed to read history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get picks for a specific date
   */
  async getPicksByDate(date: string): Promise<BettingPick[]> {
    try {
      const allPicks = await this.getAllPicks();
      return allPicks.filter(pick => pick.date === date);
    } catch (error) {
      this.logger.error(`Failed to get picks for date ${date}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get picks by status
   */
  async getPicksByStatus(status: 'pending' | 'won' | 'lost' | 'void'): Promise<BettingPick[]> {
    try {
      const allPicks = await this.getAllPicks();
      return allPicks.filter(pick => pick.status === status);
    } catch (error) {
      this.logger.error(`Failed to get picks by status ${status}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get picks by strategy
   */
  async getPicksByStrategy(strategy: string): Promise<BettingPick[]> {
    try {
      const allPicks = await this.getAllPicks();
      return allPicks.filter(pick => pick.strategy === strategy);
    } catch (error) {
      this.logger.error(`Failed to get picks by strategy ${strategy}: ${error.message}`);
      return [];
    }
  }

  /**
   * Update pick result (win/loss)
   */
  async updatePickResult(
    pickId: string, 
    status: 'won' | 'lost' | 'void', 
    result?: string
  ): Promise<void> {
    try {
      const picks = await this.getAllPicks();
      const pickIndex = picks.findIndex(pick => pick.id === pickId);
      
      if (pickIndex === -1) {
        throw new Error(`Pick with id ${pickId} not found`);
      }

      const pick = picks[pickIndex];
      pick.status = status;
      pick.result = result || null;

      // Calculate profit/loss in USD
      if (status === 'won') {
        // Profit = (odds - 1) * stake amount
        pick.profit_loss_usd = (pick.odds - 1) * pick.stake_amount_usd;
      } else if (status === 'lost') {
        // Loss = -stake amount
        pick.profit_loss_usd = -pick.stake_amount_usd;
      } else {
        pick.profit_loss_usd = 0; // Void bet - return stake
      }

      await fs.writeFile(this.historyFilePath, JSON.stringify(picks, null, 2));
      
      this.logger.log(
        `Updated pick ${pickId}: ${status} - P&L: $${pick.profit_loss_usd}`
      );
    } catch (error) {
      this.logger.error(`Failed to update pick result: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active (pending) picks
   */
  async getActivePicks(): Promise<BettingPick[]> {
    return this.getPicksByStatus('pending');
  }

  /**
   * Update pick status with profit/loss
   */
  async updatePickStatus(
    pickId: string,
    status: 'won' | 'lost' | 'void',
    profitLoss?: number
  ): Promise<void> {
    try {
      const picks = await this.getAllPicks();
      const pickIndex = picks.findIndex(pick => pick.id === pickId);
      
      if (pickIndex === -1) {
        throw new Error(`Pick with id ${pickId} not found`);
      }

      const pick = picks[pickIndex];
      pick.status = status;
      
      if (profitLoss !== undefined) {
        pick.profit_loss_usd = profitLoss;
      } else {
        // Calculate profit/loss based on status and odds
        if (status === 'won') {
          pick.profit_loss_usd = (pick.odds - 1) * pick.stake_amount_usd;
        } else if (status === 'lost') {
          pick.profit_loss_usd = -pick.stake_amount_usd;
        } else {
          pick.profit_loss_usd = 0; // Void
        }
      }

      await fs.writeFile(this.historyFilePath, JSON.stringify(picks, null, 2));
      
      this.logger.log(
        `Updated pick status ${pickId}: ${status} - P&L: $${pick.profit_loss_usd?.toFixed(2) || '0.00'}`
      );
    } catch (error) {
      this.logger.error(`Failed to update pick status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get today's picks
   */
  async getTodaysPicks(): Promise<BettingPick[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getPicksByDate(today);
  }

  /**
   * Get recent picks (last N days)
   */
  async getRecentPicks(days: number = 7): Promise<BettingPick[]> {
    try {
      const allPicks = await this.getAllPicks();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return allPicks.filter(pick => 
        new Date(pick.created_at) >= cutoffDate
      );
    } catch (error) {
      this.logger.error(`Failed to get recent picks: ${error.message}`);
      return [];
    }
  }

  /**
   * Get picks with pagination
   */
  async getPicksPaginated(page: number = 1, limit: number = 10): Promise<{
    picks: BettingPick[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const allPicks = await this.getAllPicks();
      const total = allPicks.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const picks = allPicks.slice(startIndex, endIndex);
      
      return {
        picks,
        total,
        page,
        totalPages
      };
    } catch (error) {
      this.logger.error(`Failed to get paginated picks: ${error.message}`);
      return {
        picks: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
    }
  }

  /**
   * Delete a pick by ID
   */
  async deletePick(pickId: string): Promise<void> {
    try {
      const picks = await this.getAllPicks();
      const filteredPicks = picks.filter(pick => pick.id !== pickId);
      
      if (picks.length === filteredPicks.length) {
        throw new Error(`Pick with id ${pickId} not found`);
      }

      await fs.writeFile(this.historyFilePath, JSON.stringify(filteredPicks, null, 2));
      this.logger.log(`Deleted pick: ${pickId}`);
    } catch (error) {
      this.logger.error(`Failed to delete pick: ${error.message}`);
      throw error;
    }
  }

  /**
   * Backup history to a timestamped file
   */
  async backupHistory(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = join(
        process.cwd(), 
        'data', 
        `betting_history_backup_${timestamp}.json`
      );
      
      const data = await fs.readFile(this.historyFilePath, 'utf8');
      await fs.writeFile(backupPath, data);
      
      this.logger.log(`History backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.logger.error(`Failed to backup history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear all history (use with caution)
   */
  async clearHistory(): Promise<void> {
    try {
      // First create a backup
      await this.backupHistory();
      
      // Clear the history file
      await fs.writeFile(this.historyFilePath, JSON.stringify([], null, 2));
      
      this.logger.warn('All betting history cleared (backup created)');
    } catch (error) {
      this.logger.error(`Failed to clear history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get summary statistics
   */
  async getSummaryStats(): Promise<{
    totalPicks: number;
    pendingPicks: number;
    completedPicks: number;
    wonPicks: number;
    lostPicks: number;
    voidPicks: number;
    strategyCounts: Record<string, number>;
    leagueCounts: Record<string, number>;
  }> {
    try {
      const allPicks = await this.getAllPicks();
      
      const strategyCounts: Record<string, number> = {};
      const leagueCounts: Record<string, number> = {};
      
      let pendingPicks = 0;
      let completedPicks = 0;
      let wonPicks = 0;
      let lostPicks = 0;
      let voidPicks = 0;

      for (const pick of allPicks) {
        // Count by strategy
        strategyCounts[pick.strategy] = (strategyCounts[pick.strategy] || 0) + 1;
        
        // Count by league
        leagueCounts[pick.league] = (leagueCounts[pick.league] || 0) + 1;
        
        // Count by status
        switch (pick.status) {
          case 'pending':
            pendingPicks++;
            break;
          case 'won':
            wonPicks++;
            completedPicks++;
            break;
          case 'lost':
            lostPicks++;
            completedPicks++;
            break;
          case 'void':
            voidPicks++;
            completedPicks++;
            break;
        }
      }

      return {
        totalPicks: allPicks.length,
        pendingPicks,
        completedPicks,
        wonPicks,
        lostPicks,
        voidPicks,
        strategyCounts,
        leagueCounts
      };
    } catch (error) {
      this.logger.error(`Failed to get summary stats: ${error.message}`);
      return {
        totalPicks: 0,
        pendingPicks: 0,
        completedPicks: 0,
        wonPicks: 0,
        lostPicks: 0,
        voidPicks: 0,
        strategyCounts: {},
        leagueCounts: {}
      };
    }
  }
}