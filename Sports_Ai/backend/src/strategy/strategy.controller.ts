import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpStatus,
  HttpException,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StrategyService, BettingPick } from './strategy.service';
import { HistoryService } from './history.service';

@ApiTags('Strategy')
@Controller('api/strategy')
export class StrategyController {
  private readonly logger = new Logger(StrategyController.name);

  constructor(
    private readonly strategyService: StrategyService,
    private readonly historyService: HistoryService
  ) {}

  @Get('today')
  @ApiOperation({ summary: "Get today's betting picks" })
  @ApiResponse({ status: 200, description: 'Returns today\'s betting picks' })
  async getTodaysPicks(): Promise<BettingPick[]> {
    try {
      this.logger.log('Fetching today\'s picks');
      
      // First check if we already have picks for today
      const existingPicks = await this.historyService.getTodaysPicks();
      
      if (existingPicks.length > 0) {
        this.logger.log(`Found ${existingPicks.length} existing picks for today`);
        return existingPicks;
      }

      // Generate new picks for today
      this.logger.log('Generating new picks for today');
      const newPicks = await this.strategyService.generateTodaysPicks();
      
      return newPicks;
    } catch (error) {
      this.logger.error(`Failed to get today's picks: ${error.message}`);
      throw new HttpException(
        'Failed to generate today\'s picks',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get all past picks with W/L record' })
  @ApiResponse({ status: 200, description: 'Returns paginated betting history' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'won', 'lost', 'void'], description: 'Filter by status' })
  @ApiQuery({ name: 'strategy', required: false, type: String, description: 'Filter by strategy' })
  async getHistory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: 'pending' | 'won' | 'lost' | 'void',
    @Query('strategy') strategy?: string
  ): Promise<{
    picks: BettingPick[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const pageNum = page || 1;
      const limitNum = limit || 20;

      let picks: BettingPick[];

      if (status) {
        picks = await this.historyService.getPicksByStatus(status);
      } else if (strategy) {
        picks = await this.historyService.getPicksByStrategy(strategy);
      } else {
        picks = await this.historyService.getAllPicks();
      }

      // Apply pagination
      const total = picks.length;
      const totalPages = Math.ceil(total / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedPicks = picks.slice(startIndex, endIndex);

      return {
        picks: paginatedPicks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get history: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve betting history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics including win rate, ROI, streak, profit stats' })
  @ApiResponse({ status: 200, description: 'Returns comprehensive performance metrics' })
  async getPerformance() {
    try {
      const metrics = await this.strategyService.getPerformanceMetrics();
      const summaryStats = await this.historyService.getSummaryStats();

      return {
        performance: metrics,
        summary: summaryStats,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get performance metrics: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve performance metrics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get picks for next 7 days' })
  @ApiResponse({ status: 200, description: 'Returns upcoming betting picks' })
  async getUpcomingPicks(): Promise<BettingPick[]> {
    try {
      const upcomingPicks = await this.strategyService.getUpcomingPicks();
      return upcomingPicks;
    } catch (error) {
      this.logger.error(`Failed to get upcoming picks: ${error.message}`);
      throw new HttpException(
        'Failed to generate upcoming picks',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('resolve/:id')
  @ApiOperation({ summary: 'Mark a pick as won/lost for updating results' })
  @ApiParam({ name: 'id', description: 'Pick ID' })
  @ApiResponse({ status: 200, description: 'Pick result updated successfully' })
  async resolvePick(
    @Param('id') pickId: string,
    @Body() body: {
      status: 'won' | 'lost' | 'void';
      result?: string;
    }
  ): Promise<{ message: string; pick?: BettingPick }> {
    try {
      const { status, result } = body;

      if (!['won', 'lost', 'void'].includes(status)) {
        throw new HttpException(
          'Status must be won, lost, or void',
          HttpStatus.BAD_REQUEST
        );
      }

      await this.historyService.updatePickResult(pickId, status, result);

      // Get the updated pick
      const allPicks = await this.historyService.getAllPicks();
      const updatedPick = allPicks.find(pick => pick.id === pickId);

      this.logger.log(`Pick ${pickId} resolved as ${status}`);

      return {
        message: `Pick resolved as ${status}`,
        pick: updatedPick
      };
    } catch (error) {
      this.logger.error(`Failed to resolve pick ${pickId}: ${error.message}`);
      
      if (error.message.includes('not found')) {
        throw new HttpException(
          `Pick with ID ${pickId} not found`,
          HttpStatus.NOT_FOUND
        );
      }
      
      throw new HttpException(
        'Failed to resolve pick',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('arbitrage')
  @ApiOperation({ summary: 'Get arbitrage opportunities' })
  @ApiResponse({ status: 200, description: 'Returns arbitrage betting opportunities' })
  async getArbitrageOpportunities(): Promise<BettingPick[]> {
    try {
      const arbitragePicks = await this.strategyService.detectArbitrage();
      return arbitragePicks;
    } catch (error) {
      this.logger.error(`Failed to get arbitrage opportunities: ${error.message}`);
      throw new HttpException(
        'Failed to detect arbitrage opportunities',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get detailed statistics and breakdowns' })
  @ApiResponse({ status: 200, description: 'Returns detailed betting statistics' })
  async getDetailedStats() {
    try {
      const allPicks = await this.historyService.getAllPicks();
      const summaryStats = await this.historyService.getSummaryStats();
      const performanceMetrics = await this.strategyService.getPerformanceMetrics();

      // Calculate additional statistics
      const recentPicks = await this.historyService.getRecentPicks(30); // Last 30 days
      const completedRecentPicks = recentPicks.filter(pick => 
        pick.status === 'won' || pick.status === 'lost'
      );

      const recentWinRate = completedRecentPicks.length > 0 
        ? (completedRecentPicks.filter(pick => pick.status === 'won').length / completedRecentPicks.length) * 100
        : 0;

      // Strategy performance breakdown
      const strategyPerformance: Record<string, any> = {};
      
      for (const strategy in summaryStats.strategyCounts) {
        const strategyPicks = await this.historyService.getPicksByStrategy(strategy);
        const completedStrategyPicks = strategyPicks.filter(pick => 
          pick.status === 'won' || pick.status === 'lost'
        );
        
        if (completedStrategyPicks.length > 0) {
          const wins = completedStrategyPicks.filter(pick => pick.status === 'won').length;
          const winRate = (wins / completedStrategyPicks.length) * 100;
          const totalProfit = completedStrategyPicks.reduce((sum, pick) => 
            sum + (pick.profit_loss || 0), 0
          );

          strategyPerformance[strategy] = {
            totalPicks: strategyPicks.length,
            completedPicks: completedStrategyPicks.length,
            wins,
            winRate: Math.round(winRate * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100
          };
        }
      }

      return {
        overall: performanceMetrics,
        recent: {
          picks: recentPicks.length,
          completed: completedRecentPicks.length,
          winRate: Math.round(recentWinRate * 100) / 100
        },
        strategies: strategyPerformance,
        leagues: summaryStats.leagueCounts,
        summary: summaryStats,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get detailed stats: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve detailed statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('generate-picks')
  @ApiOperation({ summary: 'Force generate new picks for today' })
  @ApiResponse({ status: 200, description: 'New picks generated successfully' })
  async generateNewPicks(): Promise<{
    message: string;
    picks: BettingPick[];
    count: number;
  }> {
    try {
      this.logger.log('Force generating new picks');
      const newPicks = await this.strategyService.generateTodaysPicks();
      
      return {
        message: 'New picks generated successfully',
        picks: newPicks,
        count: newPicks.length
      };
    } catch (error) {
      this.logger.error(`Failed to generate new picks: ${error.message}`);
      throw new HttpException(
        'Failed to generate new picks',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('pick/:id')
  @ApiOperation({ summary: 'Get a specific pick by ID' })
  @ApiParam({ name: 'id', description: 'Pick ID' })
  @ApiResponse({ status: 200, description: 'Returns the specific pick' })
  async getPick(@Param('id') pickId: string): Promise<BettingPick> {
    try {
      const allPicks = await this.historyService.getAllPicks();
      const pick = allPicks.find(p => p.id === pickId);
      
      if (!pick) {
        throw new HttpException(
          `Pick with ID ${pickId} not found`,
          HttpStatus.NOT_FOUND
        );
      }

      return pick;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Failed to get pick ${pickId}: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve pick',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}