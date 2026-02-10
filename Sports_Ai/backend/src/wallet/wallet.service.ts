import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface UserWallet {
  userId: string;
  email: string;
  totalDeposited: number;
  currentBalance: number;
  sharePercentage: number; // % of the total fund
  depositHistory: DepositRecord[];
  withdrawalHistory: WithdrawalRecord[];
  profitHistory: ProfitRecord[];
  createdAt: string;
  lastUpdated: string;
}

export interface DepositRecord {
  id: string;
  amount: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  txId?: string;
  method: string; // 'bank_transfer', 'crypto', 'card'
}

export interface WithdrawalRecord {
  id: string;
  amount: number;
  timestamp: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  reason?: string;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
}

export interface ProfitRecord {
  id: string;
  date: string;
  fundProfit: number; // Total fund profit for the period
  userShare: number; // 90% of fund profit * user's share
  platformFee: number; // 10% of fund profit * user's share
  accumulatedProfit: number; // Running total
}

export interface FundState {
  totalAUM: number; // Assets under management
  totalDeposited: number;
  totalWithdrawn: number;
  totalUsers: number;
  activeUsers: number;
  currentBalance: number;
  unrealizedPnL: number;
  totalProfitGenerated: number;
  totalProfitDistributed: number; // 90% to users
  totalPlatformFees: number; // 10% to platform
  monthlyReturns: Array<{
    month: string;
    startBalance: number;
    endBalance: number;
    profit: number;
    roi: number;
    usersPaid: number;
    platformFees: number;
  }>;
  lastSettlement: string | null;
  nextSettlement: string;
  founded: string;
  status: 'active' | 'paused' | 'closed';
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly walletsFilePath = join(process.cwd(), 'data', 'wallets.json');
  private readonly fundStateFilePath = join(process.cwd(), 'data', 'fund_state.json');
  
  private readonly MINIMUM_DEPOSIT = 100;
  private readonly USER_PROFIT_SHARE = 90; // 90% to users
  private readonly PLATFORM_FEE = 10; // 10% to platform

  constructor() {
    this.initializeWalletFiles();
  }

  /**
   * Initialize wallet and fund state files
   */
  private async initializeWalletFiles(): Promise<void> {
    try {
      const dataDir = join(process.cwd(), 'data');
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      // Initialize wallets file
      try {
        await fs.access(this.walletsFilePath);
        this.logger.log('Wallets file found');
      } catch {
        await fs.writeFile(this.walletsFilePath, JSON.stringify([], null, 2));
        this.logger.log('Created new wallets file');
      }

      // Initialize fund state file
      try {
        await fs.access(this.fundStateFilePath);
        this.logger.log('Fund state file found');
      } catch {
        const defaultFundState: FundState = {
          totalAUM: 10000, // Starting with $10K bankroll
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalUsers: 0,
          activeUsers: 0,
          currentBalance: 10000,
          unrealizedPnL: 0,
          totalProfitGenerated: 0,
          totalProfitDistributed: 0,
          totalPlatformFees: 0,
          monthlyReturns: [],
          lastSettlement: null,
          nextSettlement: this.getNextMonthFirstDay(),
          founded: new Date().toISOString().split('T')[0],
          status: 'active'
        };
        
        await fs.writeFile(this.fundStateFilePath, JSON.stringify(defaultFundState, null, 2));
        this.logger.log('Created new fund state file');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize wallet files: ${error.message}`);
    }
  }

  /**
   * Get all user wallets
   */
  async getAllWallets(): Promise<UserWallet[]> {
    try {
      const data = await fs.readFile(this.walletsFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to read wallets: ${error.message}`);
      return [];
    }
  }

  /**
   * Get fund state
   */
  async getFundState(): Promise<FundState> {
    try {
      const data = await fs.readFile(this.fundStateFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to read fund state: ${error.message}`);
      throw new Error('Could not read fund state');
    }
  }

  /**
   * Update fund state
   */
  async updateFundState(state: FundState): Promise<void> {
    try {
      await fs.writeFile(this.fundStateFilePath, JSON.stringify(state, null, 2));
    } catch (error) {
      this.logger.error(`Failed to update fund state: ${error.message}`);
      throw new Error('Could not update fund state');
    }
  }

  /**
   * Get or create user wallet
   */
  async getUserWallet(userId: string, email?: string): Promise<UserWallet> {
    const wallets = await this.getAllWallets();
    let wallet = wallets.find(w => w.userId === userId);

    if (!wallet && email) {
      // Create new wallet
      wallet = {
        userId,
        email,
        totalDeposited: 0,
        currentBalance: 0,
        sharePercentage: 0,
        depositHistory: [],
        withdrawalHistory: [],
        profitHistory: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      wallets.push(wallet);
      await this.saveWallets(wallets);

      // Update fund state
      const fundState = await this.getFundState();
      fundState.totalUsers++;
      if (wallet.currentBalance > 0) {
        fundState.activeUsers++;
      }
      await this.updateFundState(fundState);

      this.logger.log(`Created new wallet for user ${userId}`);
    }

    if (!wallet) {
      throw new Error(`Wallet not found for user ${userId}`);
    }

    return wallet;
  }

  /**
   * Save wallets to file
   */
  private async saveWallets(wallets: UserWallet[]): Promise<void> {
    try {
      await fs.writeFile(this.walletsFilePath, JSON.stringify(wallets, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save wallets: ${error.message}`);
      throw new Error('Could not save wallets');
    }
  }

  /**
   * Process deposit
   */
  async processDeposit(
    userId: string,
    amount: number,
    method: string = 'bank_transfer'
  ): Promise<{ success: boolean; message: string; depositId?: string }> {
    try {
      if (amount < this.MINIMUM_DEPOSIT) {
        return {
          success: false,
          message: `Minimum deposit is $${this.MINIMUM_DEPOSIT}`
        };
      }

      const wallets = await this.getAllWallets();
      const wallet = wallets.find(w => w.userId === userId);
      
      if (!wallet) {
        return {
          success: false,
          message: 'User wallet not found'
        };
      }

      const depositId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const depositRecord: DepositRecord = {
        id: depositId,
        amount,
        timestamp: new Date().toISOString(),
        status: 'completed', // In real implementation, this would be 'pending'
        method
      };

      // Update wallet
      wallet.depositHistory.push(depositRecord);
      wallet.totalDeposited += amount;
      wallet.currentBalance += amount;
      wallet.lastUpdated = new Date().toISOString();

      // Recalculate share percentages for all users
      await this.recalculateSharePercentages(wallets);
      await this.saveWallets(wallets);

      // Update fund state
      const fundState = await this.getFundState();
      fundState.totalAUM += amount;
      fundState.totalDeposited += amount;
      fundState.currentBalance += amount;
      
      // Check if this user became active
      const wasInactive = wallet.currentBalance - amount <= 0;
      if (wasInactive && wallet.currentBalance > 0) {
        fundState.activeUsers++;
      }
      
      await this.updateFundState(fundState);

      this.logger.log(`Deposit processed: $${amount} for user ${userId}`);
      
      return {
        success: true,
        message: `Deposit of $${amount} processed successfully`,
        depositId
      };

    } catch (error) {
      this.logger.error(`Failed to process deposit: ${error.message}`);
      return {
        success: false,
        message: 'Deposit processing failed'
      };
    }
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(
    userId: string,
    amount: number
  ): Promise<{ success: boolean; message: string; withdrawalId?: string }> {
    try {
      const wallets = await this.getAllWallets();
      const wallet = wallets.find(w => w.userId === userId);
      
      if (!wallet) {
        return {
          success: false,
          message: 'User wallet not found'
        };
      }

      if (amount > wallet.currentBalance) {
        return {
          success: false,
          message: 'Insufficient balance'
        };
      }

      if (amount < 10) {
        return {
          success: false,
          message: 'Minimum withdrawal is $10'
        };
      }

      const withdrawalId = `wit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const withdrawalRecord: WithdrawalRecord = {
        id: withdrawalId,
        amount,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      wallet.withdrawalHistory.push(withdrawalRecord);
      wallet.lastUpdated = new Date().toISOString();
      await this.saveWallets(wallets);

      this.logger.log(`Withdrawal requested: $${amount} for user ${userId}`);
      
      return {
        success: true,
        message: `Withdrawal of $${amount} requested successfully. Pending approval.`,
        withdrawalId
      };

    } catch (error) {
      this.logger.error(`Failed to request withdrawal: ${error.message}`);
      return {
        success: false,
        message: 'Withdrawal request failed'
      };
    }
  }

  /**
   * Approve withdrawal
   */
  async approveWithdrawal(
    withdrawalId: string,
    approvedBy: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const wallets = await this.getAllWallets();
      
      for (const wallet of wallets) {
        const withdrawal = wallet.withdrawalHistory.find(w => w.id === withdrawalId);
        
        if (withdrawal) {
          if (withdrawal.status !== 'pending') {
            return {
              success: false,
              message: 'Withdrawal already processed'
            };
          }

          if (withdrawal.amount > wallet.currentBalance) {
            return {
              success: false,
              message: 'Insufficient balance'
            };
          }

          // Process withdrawal
          withdrawal.status = 'approved';
          withdrawal.approvedBy = approvedBy;
          withdrawal.approvedAt = new Date().toISOString();

          wallet.currentBalance -= withdrawal.amount;
          wallet.lastUpdated = new Date().toISOString();

          // Recalculate share percentages
          await this.recalculateSharePercentages(wallets);
          await this.saveWallets(wallets);

          // Update fund state
          const fundState = await this.getFundState();
          fundState.totalAUM -= withdrawal.amount;
          fundState.totalWithdrawn += withdrawal.amount;
          fundState.currentBalance -= withdrawal.amount;
          
          // Check if user became inactive
          if (wallet.currentBalance <= 0) {
            fundState.activeUsers = Math.max(0, fundState.activeUsers - 1);
          }
          
          await this.updateFundState(fundState);

          this.logger.log(`Withdrawal approved: $${withdrawal.amount} for ${withdrawal.id}`);
          
          return {
            success: true,
            message: `Withdrawal of $${withdrawal.amount} approved`
          };
        }
      }

      return {
        success: false,
        message: 'Withdrawal not found'
      };

    } catch (error) {
      this.logger.error(`Failed to approve withdrawal: ${error.message}`);
      return {
        success: false,
        message: 'Withdrawal approval failed'
      };
    }
  }

  /**
   * Recalculate share percentages based on current balances
   */
  private async recalculateSharePercentages(wallets: UserWallet[]): Promise<void> {
    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.currentBalance, 0);
    
    for (const wallet of wallets) {
      wallet.sharePercentage = totalBalance > 0 ? (wallet.currentBalance / totalBalance) * 100 : 0;
    }
  }

  /**
   * Distribute monthly profits (90/10 split)
   */
  async distributeMonthlyProfits(
    totalFundProfit: number,
    month: string
  ): Promise<{ usersProcessed: number; totalDistributed: number; platformFees: number }> {
    try {
      const wallets = await this.getAllWallets();
      const activeWallets = wallets.filter(w => w.currentBalance > 0);
      
      let totalDistributed = 0;
      let usersProcessed = 0;
      const platformFees = totalFundProfit * (this.PLATFORM_FEE / 100);

      for (const wallet of activeWallets) {
        const userProfitShare = totalFundProfit * (this.USER_PROFIT_SHARE / 100) * (wallet.sharePercentage / 100);
        const userPlatformFee = totalFundProfit * (this.PLATFORM_FEE / 100) * (wallet.sharePercentage / 100);

        if (userProfitShare > 0) {
          const profitRecord: ProfitRecord = {
            id: `pft_${month}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            date: month,
            fundProfit: totalFundProfit,
            userShare: userProfitShare,
            platformFee: userPlatformFee,
            accumulatedProfit: wallet.profitHistory.reduce((sum, p) => sum + p.userShare, 0) + userProfitShare
          };

          wallet.profitHistory.push(profitRecord);
          wallet.currentBalance += userProfitShare;
          wallet.lastUpdated = new Date().toISOString();

          totalDistributed += userProfitShare;
          usersProcessed++;
        }
      }

      // Recalculate share percentages after profit distribution
      await this.recalculateSharePercentages(wallets);
      await this.saveWallets(wallets);

      // Update fund state
      const fundState = await this.getFundState();
      fundState.totalProfitGenerated += totalFundProfit;
      fundState.totalProfitDistributed += totalDistributed;
      fundState.totalPlatformFees += platformFees;
      fundState.lastSettlement = new Date().toISOString();
      fundState.nextSettlement = this.getNextMonthFirstDay();
      
      // Add monthly return record
      fundState.monthlyReturns.push({
        month,
        startBalance: fundState.currentBalance - totalFundProfit,
        endBalance: fundState.currentBalance,
        profit: totalFundProfit,
        roi: ((totalFundProfit / (fundState.currentBalance - totalFundProfit)) * 100),
        usersPaid: usersProcessed,
        platformFees
      });

      await this.updateFundState(fundState);

      this.logger.log(`Monthly profits distributed: $${totalDistributed} to ${usersProcessed} users, $${platformFees} platform fees`);
      
      return {
        usersProcessed,
        totalDistributed,
        platformFees
      };

    } catch (error) {
      this.logger.error(`Failed to distribute profits: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user balance including unrealized P&L
   */
  async getUserBalance(userId: string): Promise<{
    currentBalance: number;
    totalDeposited: number;
    unrealizedPnL: number;
    sharePercentage: number;
    totalProfit: number;
    pendingWithdrawals: number;
  }> {
    const wallet = await this.getUserWallet(userId);
    const fundState = await this.getFundState();
    
    const unrealizedPnL = fundState.unrealizedPnL * (wallet.sharePercentage / 100);
    const totalProfit = wallet.profitHistory.reduce((sum, p) => sum + p.userShare, 0);
    const pendingWithdrawals = wallet.withdrawalHistory
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + w.amount, 0);

    return {
      currentBalance: wallet.currentBalance,
      totalDeposited: wallet.totalDeposited,
      unrealizedPnL,
      sharePercentage: wallet.sharePercentage,
      totalProfit,
      pendingWithdrawals
    };
  }

  /**
   * Get fund statistics
   */
  async getFundStatistics(): Promise<{
    aum: number;
    totalUsers: number;
    activeUsers: number;
    totalDeposited: number;
    totalWithdrawn: number;
    currentBalance: number;
    totalProfit: number;
    monthlyROI: number;
    yearlyROI: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
    status: string;
    founded: string;
    daysSinceInception: number;
  }> {
    const fundState = await this.getFundState();
    const foundedDate = new Date(fundState.founded);
    const daysSinceInception = Math.floor((Date.now() - foundedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate monthly and yearly ROI
    const monthlyReturns = fundState.monthlyReturns;
    const lastMonthROI = monthlyReturns.length > 0 ? monthlyReturns[monthlyReturns.length - 1].roi : 0;
    const yearlyROI = monthlyReturns.length > 0 ? 
      monthlyReturns.reduce((sum, month) => sum + month.roi, 0) / monthlyReturns.length * 12 : 0;

    // Calculate win rate and Sharpe ratio (simplified)
    const positiveMonths = monthlyReturns.filter(m => m.roi > 0).length;
    const winRate = monthlyReturns.length > 0 ? (positiveMonths / monthlyReturns.length) * 100 : 0;
    
    const avgROI = monthlyReturns.length > 0 ? 
      monthlyReturns.reduce((sum, m) => sum + m.roi, 0) / monthlyReturns.length : 0;
    const roiStdDev = this.calculateStandardDeviation(monthlyReturns.map(m => m.roi));
    const sharpeRatio = roiStdDev > 0 ? avgROI / roiStdDev : 0;

    // Calculate max drawdown (simplified)
    let peakBalance = fundState.totalDeposited;
    let maxDrawdown = 0;
    for (const month of monthlyReturns) {
      if (month.endBalance > peakBalance) {
        peakBalance = month.endBalance;
      }
      const drawdown = ((peakBalance - month.endBalance) / peakBalance) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return {
      aum: fundState.totalAUM,
      totalUsers: fundState.totalUsers,
      activeUsers: fundState.activeUsers,
      totalDeposited: fundState.totalDeposited,
      totalWithdrawn: fundState.totalWithdrawn,
      currentBalance: fundState.currentBalance,
      totalProfit: fundState.totalProfitGenerated,
      monthlyROI: lastMonthROI,
      yearlyROI,
      winRate,
      sharpeRatio,
      maxDrawdown,
      status: fundState.status,
      founded: fundState.founded,
      daysSinceInception
    };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Get first day of next month
   */
  private getNextMonthFirstDay(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  /**
   * Update unrealized P&L from bankroll changes
   */
  async updateUnrealizedPnL(currentBankroll: number, startingBankroll: number): Promise<void> {
    const fundState = await this.getFundState();
    fundState.unrealizedPnL = currentBankroll - startingBankroll;
    fundState.currentBalance = currentBankroll;
    await this.updateFundState(fundState);
  }
}