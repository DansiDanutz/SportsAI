import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, RequireAdmin } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';

@Controller('api/wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  /**
   * Get user's wallet balance and details
  */
  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Request() req: any) {
    try {
      const userId = req.user.id;

      const balance = await this.walletService.getUserBalance(userId);
      const wallet = await this.walletService.getUserWallet(userId);

      return {
        success: true,
        data: {
          ...balance,
          email: wallet.email,
          memberSince: wallet.createdAt,
          lastUpdated: wallet.lastUpdated
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get balance',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user's deposit history
  */
  @Get('deposits')
  @UseGuards(JwtAuthGuard)
  async getDeposits(@Request() req: any, @Query('limit') limit?: string) {
    try {
      const userId = req.user.id;
      const wallet = await this.walletService.getUserWallet(userId);
      const limitNum = limit ? parseInt(limit) : 50;
      
      const deposits = wallet.depositHistory
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limitNum);

      return {
        success: true,
        data: {
          deposits,
          totalDeposited: wallet.totalDeposited,
          depositCount: wallet.depositHistory.length
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get deposits',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user's withdrawal history
  */
  @Get('withdrawals')
  @UseGuards(JwtAuthGuard)
  async getWithdrawals(@Request() req: any, @Query('limit') limit?: string) {
    try {
      const userId = req.user.id;
      const wallet = await this.walletService.getUserWallet(userId);
      const limitNum = limit ? parseInt(limit) : 50;
      
      const withdrawals = wallet.withdrawalHistory
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limitNum);

      return {
        success: true,
        data: {
          withdrawals,
          totalWithdrawn: withdrawals
            .filter(w => w.status === 'completed')
            .reduce((sum, w) => sum + w.amount, 0),
          withdrawalCount: wallet.withdrawalHistory.length
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get withdrawals',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user's profit share history
  */
  @Get('profit-share')
  @UseGuards(JwtAuthGuard)
  async getProfitShare(@Request() req: any, @Query('limit') limit?: string) {
    try {
      const userId = req.user.id;
      const wallet = await this.walletService.getUserWallet(userId);
      const limitNum = limit ? parseInt(limit) : 24; // Default last 24 months
      
      const profits = wallet.profitHistory
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limitNum);

      const totalProfit = profits.reduce((sum, p) => sum + p.userShare, 0);
      const totalPlatformFees = profits.reduce((sum, p) => sum + p.platformFee, 0);

      return {
        success: true,
        data: {
          profitHistory: profits,
          summary: {
            totalUserProfit: totalProfit,
            totalPlatformFees,
            profitShare: `${this.walletService['USER_PROFIT_SHARE']}%`, // 90%
            platformShare: `${this.walletService['PLATFORM_FEE']}%`, // 10%
            monthsActive: profits.length,
            averageMonthlyProfit: profits.length > 0 ? totalProfit / profits.length : 0
          }
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get profit share',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Make a deposit
  */
  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  async deposit(
    @Request() _req: any,
    @Body() _body: {
      amount: number;
      method?: string;
      email?: string;
    },
  ) {
    throw new ServiceUnavailableException(
      'Deposits are disabled until a verified payment provider is configured',
    );
  }

  /**
   * Request a withdrawal
  */
  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async withdraw(
    @Request() req: any,
    @Body() body: { amount: number },
  ) {
    try {
      const userId = req.user.id;
      const { amount } = body;

      if (!amount || amount <= 0) {
        throw new HttpException('Valid withdrawal amount required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.walletService.requestWithdrawal(userId, amount);

      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
      }

      return {
        success: true,
        message: result.message,
        data: {
          withdrawalId: result.withdrawalId,
          amount,
          status: 'pending',
          requestTime: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Withdrawal request failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Approve withdrawal (admin only)
  */
  @Put('approve-withdrawal/:withdrawalId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequireAdmin()
  async approveWithdrawal(
    @Param('withdrawalId') withdrawalId: string,
    @Request() req: any,
  ) {
    try {
      const approvedBy = req.user.id;

      const result = await this.walletService.approveWithdrawal(withdrawalId, approvedBy);

      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
      }

      return {
        success: true,
        message: result.message,
        data: {
          withdrawalId,
          approvedBy,
          approvedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Withdrawal approval failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get public fund statistics
   */
  @Get('/fund/stats')
  async getFundStats() {
    try {
      const stats = await this.walletService.getFundStatistics();

      return {
        success: true,
        data: {
          fundMetrics: {
            aum: stats.aum,
            totalInvestors: stats.totalUsers,
            activeInvestors: stats.activeUsers,
            totalDeposited: stats.totalDeposited,
            currentBalance: stats.currentBalance,
            totalProfit: stats.totalProfit
          },
          performance: {
            monthlyROI: stats.monthlyROI,
            yearlyROI: stats.yearlyROI,
            winRate: stats.winRate,
            sharpeRatio: stats.sharpeRatio,
            maxDrawdown: stats.maxDrawdown
          },
          fundInfo: {
            status: stats.status,
            founded: stats.founded,
            daysSinceInception: stats.daysSinceInception,
            strategy: 'Autonomous Betting Fund - Martingale + Arbitrage Hybrid',
            profitShare: '90% to investors, 10% platform fee',
            minimumDeposit: '$100'
          }
        }
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get fund statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get fund performance history
   */
  @Get('/fund/performance')
  async getFundPerformance(@Query('months') months?: string) {
    try {
      const fundState = await this.walletService.getFundState();
      const monthsLimit = months ? parseInt(months) : 12; // Default last 12 months
      
      const recentReturns = fundState.monthlyReturns
        .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
        .slice(0, monthsLimit)
        .reverse(); // Show chronological order

      const totalReturn = recentReturns.reduce((sum, month) => sum + month.profit, 0);
      const avgMonthlyROI = recentReturns.length > 0 ? 
        recentReturns.reduce((sum, month) => sum + month.roi, 0) / recentReturns.length : 0;

      return {
        success: true,
        data: {
          monthlyReturns: recentReturns,
          summary: {
            totalPeriods: recentReturns.length,
            totalReturn,
            averageMonthlyROI: avgMonthlyROI,
            bestMonth: recentReturns.length > 0 ? 
              Math.max(...recentReturns.map(m => m.roi)) : 0,
            worstMonth: recentReturns.length > 0 ? 
              Math.min(...recentReturns.map(m => m.roi)) : 0,
            profitableMonths: recentReturns.filter(m => m.roi > 0).length,
            totalInvestorPayouts: recentReturns.reduce((sum, month) => 
              sum + (month.profit * 0.9), 0), // 90% to investors
            totalPlatformFees: recentReturns.reduce((sum, month) => 
              sum + month.platformFees, 0)
          }
        }
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get fund performance',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get pending withdrawals (admin only)
   */
  @Get('/admin/pending-withdrawals')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequireAdmin()
  async getPendingWithdrawals() {
    try {
      const allWallets = await this.walletService.getAllWallets();
      const pendingWithdrawals = [];

      for (const wallet of allWallets) {
        const pending = wallet.withdrawalHistory.filter(w => w.status === 'pending');
        for (const withdrawal of pending) {
          pendingWithdrawals.push({
            ...withdrawal,
            userId: wallet.userId,
            email: wallet.email,
            currentBalance: wallet.currentBalance
          });
        }
      }

      // Sort by timestamp (oldest first)
      pendingWithdrawals.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        success: true,
        data: {
          pendingWithdrawals,
          totalPending: pendingWithdrawals.length,
          totalAmount: pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0)
        }
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get pending withdrawals',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Process monthly profit distribution (admin only)
   */
  @Post('/admin/distribute-profits')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequireAdmin()
  async distributeProfits(
    @Request() req: any,
    @Body() body: {
      totalProfit: number;
      month: string;
    },
  ) {
    try {
      const { totalProfit, month } = body;
      const adminId = req.user.id;

      if (!totalProfit || !month) {
        throw new HttpException(
          'Total profit and month required',
          HttpStatus.BAD_REQUEST
        );
      }

      if (totalProfit <= 0) {
        throw new HttpException('Profit must be positive', HttpStatus.BAD_REQUEST);
      }

      const result = await this.walletService.distributeMonthlyProfits(totalProfit, month);

      return {
        success: true,
        message: `Monthly profits distributed successfully for ${month}`,
        data: {
          month,
          totalProfit,
          usersProcessed: result.usersProcessed,
          totalDistributed: result.totalDistributed,
          platformFees: result.platformFees,
          distributedBy: adminId,
          distributedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Profit distribution failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
