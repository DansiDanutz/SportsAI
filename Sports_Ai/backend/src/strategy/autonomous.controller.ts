import { Controller, Get, Post, Put, Body, Query, HttpStatus, HttpException } from '@nestjs/common';
import { AutonomousService } from './autonomous.service';
import { BankrollService } from './bankroll.service';
import { MartingaleService } from './martingale.service';

@Controller('api/autonomous')
export class AutonomousController {
  constructor(
    private autonomousService: AutonomousService,
    private bankrollService: BankrollService,
    private martingaleService: MartingaleService
  ) {}

  /**
   * Get autonomous engine status
   */
  @Get('status')
  async getStatus() {
    try {
      const config = await this.autonomousService.getConfig();
      const stats = await this.autonomousService.getAutonomousStatistics();
      const bankrollStats = await this.bankrollService.getStatistics();
      const martingaleStats = await this.martingaleService.getMartingaleStatistics();

      return {
        success: true,
        data: {
          autonomous: stats,
          bankroll: bankrollStats,
          martingale: martingaleStats,
          config: {
            enabled: config.enabled,
            riskMode: config.riskMode,
            maxActiveBets: config.maxActiveBets,
            valueThreshold: config.valueThreshold,
            scanInterval: config.scanIntervalHours,
            lastScan: config.lastScan,
            lastResolve: config.lastResolve
          }
        }
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get autonomous status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Run autonomous scan manually
   */
  @Post('scan')
  async runScan() {
    try {
      const result = await this.autonomousService.runAutonomousScan();
      
      return {
        success: true,
        message: 'Autonomous scan completed',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Autonomous scan failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Resolve completed bets manually
   */
  @Post('resolve')
  async resolveBets() {
    try {
      const result = await this.autonomousService.resolveCompletedBets();
      
      return {
        success: true,
        message: 'Bet resolution completed',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Bet resolution failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update autonomous configuration
   */
  @Put('config')
  async updateConfig(@Body() config: any) {
    try {
      await this.autonomousService.updateConfig(config);
      
      return {
        success: true,
        message: 'Configuration updated successfully'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Configuration update failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Enable/disable autonomous engine
   */
  @Put('toggle')
  async toggleEngine(@Body() body: { enabled: boolean }) {
    try {
      const { enabled } = body;
      await this.autonomousService.updateConfig({ enabled });
      
      return {
        success: true,
        message: `Autonomous engine ${enabled ? 'enabled' : 'disabled'}`
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Toggle failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get audit logs
   */
  @Get('audit')
  async getAuditLogs(@Query('limit') limit?: string) {
    try {
      const limitNum = limit ? parseInt(limit) : 50;
      const logs = await this.autonomousService.getAuditLogs(limitNum);
      
      return {
        success: true,
        data: {
          logs,
          total: logs.length
        }
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get audit logs',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get bankroll statistics
   */
  @Get('bankroll')
  async getBankrollStats() {
    try {
      const stats = await this.bankrollService.getStatistics();
      const state = await this.bankrollService.getBankrollState();
      
      return {
        success: true,
        data: {
          ...stats,
          mode: state.mode,
          startDate: state.start_date,
          currency: state.currency,
          dailyPnL: state.daily_pnl.slice(-30), // Last 30 days
          weeklyPnL: state.weekly_pnl.slice(-12), // Last 12 weeks
          monthlyPnL: state.monthly_pnl.slice(-12) // Last 12 months
        }
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get bankroll statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get martingale statistics
   */
  @Get('martingale')
  async getMartingaleStats() {
    try {
      const stats = await this.martingaleService.getMartingaleStatistics();
      const activeSequences = await this.martingaleService.getActiveSequences();
      const recoverySequences = await this.martingaleService.getRecoveryModeSequences();
      
      return {
        success: true,
        data: {
          ...stats,
          activeSequencesDetail: activeSequences,
          recoverySequencesDetail: recoverySequences
        }
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get martingale statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Freeze/unfreeze bankroll
   */
  @Put('bankroll/freeze')
  async freezeBankroll(@Body() body: { freeze: boolean; reason?: string }) {
    try {
      const { freeze, reason } = body;
      
      if (freeze) {
        if (!reason) {
          throw new HttpException('Reason required for freezing', HttpStatus.BAD_REQUEST);
        }
        await this.bankrollService.freezeBankroll(reason);
      } else {
        await this.bankrollService.unfreezeBankroll();
      }
      
      return {
        success: true,
        message: freeze ? 'Bankroll frozen' : 'Bankroll unfrozen'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Freeze operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Set martingale mode
   */
  @Put('martingale/mode')
  async setMartingaleMode(@Body() body: { mode: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'HYBRID' }) {
    try {
      const { mode } = body;
      await this.martingaleService.setMartingaleMode(mode);
      
      return {
        success: true,
        message: `Martingale mode set to ${mode}`
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Mode change failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Enable/disable martingale
   */
  @Put('martingale/toggle')
  async toggleMartingale(@Body() body: { enabled: boolean }) {
    try {
      const { enabled } = body;
      await this.martingaleService.setMartingaleEnabled(enabled);
      
      return {
        success: true,
        message: `Martingale ${enabled ? 'enabled' : 'disabled'}`
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Martingale toggle failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get system health check
   */
  @Get('health')
  async getHealth() {
    try {
      const bankrollStats = await this.bankrollService.getStatistics();
      const autonomousStats = await this.autonomousService.getAutonomousStatistics();
      const config = await this.autonomousService.getConfig();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        bankroll: {
          frozen: bankrollStats.isFrozen,
          balance: bankrollStats.currentBalance,
          roi: bankrollStats.roi
        },
        autonomous: {
          enabled: autonomousStats.isEnabled,
          activeBets: autonomousStats.activeBets,
          lastScan: autonomousStats.lastScan,
          nextScanIn: autonomousStats.nextScanIn
        },
        alerts: []
      };

      // Add health alerts
      if (bankrollStats.isFrozen) {
        health.alerts.push({
          level: 'error',
          message: `Bankroll frozen: ${bankrollStats.freezeReason}`
        });
        health.status = 'unhealthy';
      }

      if (bankrollStats.roi < -10) {
        health.alerts.push({
          level: 'warning',
          message: `Low ROI: ${bankrollStats.roi.toFixed(2)}%`
        });
      }

      if (autonomousStats.nextScanIn === 'overdue') {
        health.alerts.push({
          level: 'warning',
          message: 'Autonomous scan is overdue'
        });
      }

      if (bankrollStats.currentBalance < 1000) {
        health.alerts.push({
          level: 'error',
          message: 'Low bankroll balance'
        });
        health.status = 'unhealthy';
      }

      return {
        success: true,
        data: health
      };
    } catch (error) {
      return {
        success: false,
        data: {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message
        }
      };
    }
  }
}