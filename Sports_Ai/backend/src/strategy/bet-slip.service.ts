import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface BetSlipAnalysis {
  betSlipId: string;
  totalStake: number;
  potentialPayout: number;
  totalOdds: number;
  combinedProbability: number;
  expectedValue: number;
  variance: number;
  maxLoss: number;
  riskAnalysis: {
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    breakEvenProbability: number;
    profitProbability: number;
    averageReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  kellyRecommendation: {
    optimalStake: number;
    optimalStakePercentage: number;
    isRecommended: boolean;
    reasoning: string;
  };
  correlationWarnings: string[];
  recommendations: string[];
  timestamp: string;
}

interface BetSlipLeg {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  impliedProbability: number;
  estimatedTrueProbability?: number;
}

interface PortfolioRisk {
  totalExposure: number;
  diversificationScore: number;
  correlationMatrix: number[][];
  optimalWeights: number[];
  efficientFrontier: { risk: number; return: number }[];
}

@Injectable()
export class BetSlipService {
  private readonly logger = new Logger(BetSlipService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {}

  /**
   * Analyze a bet slip with multiple legs
   */
  async analyzeBetSlip(legs: BetSlipLeg[], totalStake: number, bankroll?: number): Promise<BetSlipAnalysis> {
    this.logger.log(`Analyzing bet slip with ${legs.length} legs and stake ${totalStake}`);
    
    try {
      // Validate inputs
      if (legs.length === 0) {
        throw new HttpException('Bet slip must contain at least one leg', HttpStatus.BAD_REQUEST);
      }

      if (totalStake <= 0) {
        throw new HttpException('Total stake must be positive', HttpStatus.BAD_REQUEST);
      }

      // Calculate basic bet slip metrics
      const totalOdds = legs.reduce((acc, leg) => acc * leg.odds, 1);
      const potentialPayout = totalStake * totalOdds;
      const combinedProbability = this.calculateCombinedProbability(legs);
      const expectedValue = (combinedProbability * potentialPayout) - totalStake;
      const variance = this.calculateVariance(legs, totalStake);
      const maxLoss = totalStake;

      // Perform risk analysis
      const riskAnalysis = this.performRiskAnalysis(legs, totalStake, potentialPayout, combinedProbability, variance);

      // Calculate Kelly optimal stake
      const kellyRecommendation = this.calculateKellyOptimalStake(legs, totalStake, combinedProbability, bankroll);

      // Check for correlation warnings
      const correlationWarnings = this.checkCorrelationWarnings(legs);

      // Generate recommendations
      const recommendations = this.generateRecommendations(legs, riskAnalysis, kellyRecommendation);

      const analysis: BetSlipAnalysis = {
        betSlipId: this.generateBetSlipId(),
        totalStake,
        potentialPayout,
        totalOdds: Math.round(totalOdds * 100) / 100,
        combinedProbability: Math.round(combinedProbability * 10000) / 100,
        expectedValue: Math.round(expectedValue * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        maxLoss,
        riskAnalysis,
        kellyRecommendation,
        correlationWarnings,
        recommendations,
        timestamp: new Date().toISOString()
      };

      // Store analysis in database
      await this.storeBetSlipAnalysis(analysis, legs);

      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze bet slip: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate combined probability for parlay/accumulator
   */
  private calculateCombinedProbability(legs: BetSlipLeg[]): number {
    // For independent events, multiply probabilities
    let combinedProb = 1;
    
    for (const leg of legs) {
      const trueProbability = leg.estimatedTrueProbability || (1 / leg.odds);
      combinedProb *= trueProbability;
    }

    // Apply correlation adjustment if legs are from same sport/league
    const correlationAdjustment = this.calculateCorrelationAdjustment(legs);
    
    return Math.max(0.001, combinedProb * correlationAdjustment);
  }

  /**
   * Calculate correlation adjustment for related bets
   */
  private calculateCorrelationAdjustment(legs: BetSlipLeg[]): number {
    // Check for correlations
    let adjustment = 1.0;
    
    // Same game correlations
    const sameGameLegs = this.groupBySameGame(legs);
    for (const [gameId, gameLegs] of sameGameLegs) {
      if (gameLegs.length > 1) {
        // Reduce probability for same-game parlays
        adjustment *= Math.pow(0.95, gameLegs.length - 1);
      }
    }

    // Same sport/league correlations
    const sameSportLegs = legs.filter(leg => 
      legs.some(other => other !== leg && this.areSameSport(leg, other))
    );
    
    if (sameSportLegs.length > 2) {
      adjustment *= Math.pow(0.98, sameSportLegs.length - 2);
    }

    return Math.max(0.7, adjustment); // Cap at 30% reduction
  }

  /**
   * Group legs by same game
   */
  private groupBySameGame(legs: BetSlipLeg[]): Map<string, BetSlipLeg[]> {
    const gameGroups = new Map<string, BetSlipLeg[]>();
    
    for (const leg of legs) {
      const gameId = `${leg.homeTeam}-vs-${leg.awayTeam}`;
      
      if (!gameGroups.has(gameId)) {
        gameGroups.set(gameId, []);
      }
      gameGroups.get(gameId)!.push(leg);
    }
    
    return gameGroups;
  }

  /**
   * Check if two legs are from the same sport
   */
  private areSameSport(leg1: BetSlipLeg, leg2: BetSlipLeg): boolean {
    // Simple heuristic based on team names or markets
    return leg1.market === leg2.market || 
           leg1.homeTeam === leg2.homeTeam || 
           leg1.awayTeam === leg2.awayTeam;
  }

  /**
   * Calculate variance for the bet slip
   */
  private calculateVariance(legs: BetSlipLeg[], totalStake: number): number {
    // For parlay bets, variance calculation is complex
    // Simplified approach: higher variance for longer parlays
    
    const baseVariance = totalStake * legs.length;
    const oddsVariance = legs.reduce((acc, leg) => acc + Math.pow(leg.odds - 2, 2), 0);
    
    return baseVariance + (oddsVariance * totalStake / 10);
  }

  /**
   * Perform comprehensive risk analysis
   */
  private performRiskAnalysis(
    legs: BetSlipLeg[], 
    totalStake: number, 
    potentialPayout: number, 
    combinedProbability: number,
    variance: number
  ): any {
    // Calculate break-even probability
    const breakEvenProbability = totalStake / potentialPayout;
    
    // Profit probability (slightly different from combined probability due to margins)
    const profitProbability = combinedProbability;
    
    // Average return calculation
    const averageReturn = (profitProbability * potentialPayout) + ((1 - profitProbability) * 0) - totalStake;
    
    // Max drawdown (worst case scenario)
    const maxDrawdown = totalStake;
    
    // Simplified Sharpe ratio
    const expectedReturn = averageReturn / totalStake;
    const riskFreeRate = 0.02; // 2% annual risk-free rate
    const standardDeviation = Math.sqrt(variance) / totalStake;
    const sharpeRatio = standardDeviation > 0 ? (expectedReturn - riskFreeRate) / standardDeviation : 0;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    
    if (legs.length === 1 && combinedProbability > 0.4) {
      riskLevel = 'low';
    } else if (legs.length <= 3 && combinedProbability > 0.2) {
      riskLevel = 'medium';
    } else if (legs.length <= 6 && combinedProbability > 0.05) {
      riskLevel = 'high';
    } else {
      riskLevel = 'extreme';
    }

    return {
      riskLevel,
      breakEvenProbability: Math.round(breakEvenProbability * 10000) / 100,
      profitProbability: Math.round(profitProbability * 10000) / 100,
      averageReturn: Math.round(averageReturn * 100) / 100,
      maxDrawdown,
      sharpeRatio: Math.round(sharpeRatio * 1000) / 1000
    };
  }

  /**
   * Calculate Kelly optimal stake
   */
  private calculateKellyOptimalStake(
    legs: BetSlipLeg[], 
    currentStake: number, 
    combinedProbability: number, 
    bankroll?: number
  ): any {
    if (!bankroll) {
      bankroll = currentStake * 20; // Assume bankroll is 20x current stake if not provided
    }

    // Kelly formula: f = (bp - q) / b
    // Where: f = fraction of bankroll to bet, b = odds received, p = probability of win, q = probability of loss
    const totalOdds = legs.reduce((acc, leg) => acc * leg.odds, 1);
    const b = totalOdds - 1; // Net odds
    const p = combinedProbability;
    const q = 1 - p;
    
    let kellyFraction = (b * p - q) / b;
    
    // Apply safety margin and cap at reasonable levels
    kellyFraction = Math.max(0, Math.min(0.25, kellyFraction * 0.25)); // 25% Kelly with 25% max
    
    const optimalStake = bankroll * kellyFraction;
    const optimalStakePercentage = kellyFraction * 100;
    
    // Determine if current stake is recommended
    const isRecommended = currentStake <= optimalStake * 1.5 && currentStake >= optimalStake * 0.5;
    
    let reasoning = '';
    if (kellyFraction <= 0) {
      reasoning = 'Kelly suggests no bet - negative expected value';
    } else if (currentStake > optimalStake * 2) {
      reasoning = 'Current stake is too high relative to Kelly optimal';
    } else if (currentStake < optimalStake * 0.25) {
      reasoning = 'Current stake is conservative relative to Kelly optimal';
    } else {
      reasoning = 'Current stake is within reasonable range of Kelly optimal';
    }

    return {
      optimalStake: Math.round(optimalStake * 100) / 100,
      optimalStakePercentage: Math.round(optimalStakePercentage * 100) / 100,
      isRecommended,
      reasoning
    };
  }

  /**
   * Check for correlation warnings
   */
  private checkCorrelationWarnings(legs: BetSlipLeg[]): string[] {
    const warnings: string[] = [];
    
    // Same game parlays
    const sameGameGroups = this.groupBySameGame(legs);
    for (const [gameId, gameLegs] of sameGameGroups) {
      if (gameLegs.length > 1) {
        warnings.push(`⚠️ Same-game parlay detected: ${gameLegs.length} bets on ${gameId.replace('-vs-', ' vs ')} are correlated`);
      }
    }
    
    // Heavy favorite combinations
    const heavyFavorites = legs.filter(leg => leg.odds < 1.3);
    if (heavyFavorites.length > 2) {
      warnings.push(`⚠️ Multiple heavy favorites detected: ${heavyFavorites.length} selections with odds < 1.30`);
    }
    
    // Same market types
    const marketGroups = new Map<string, number>();
    legs.forEach(leg => {
      marketGroups.set(leg.market, (marketGroups.get(leg.market) || 0) + 1);
    });
    
    for (const [market, count] of marketGroups) {
      if (count > 3) {
        warnings.push(`⚠️ Heavy concentration in ${market} market: ${count} selections`);
      }
    }
    
    // Long parlay warning
    if (legs.length > 8) {
      warnings.push(`⚠️ Very long parlay: ${legs.length} legs significantly reduce win probability`);
    }

    return warnings;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(legs: BetSlipLeg[], riskAnalysis: any, kellyRecommendation: any): string[] {
    const recommendations: string[] = [];
    
    // Risk level recommendations
    switch (riskAnalysis.riskLevel) {
      case 'low':
        recommendations.push('✅ Low risk bet slip - suitable for conservative betting');
        break;
      case 'medium':
        recommendations.push('⚡ Medium risk bet slip - monitor for value');
        break;
      case 'high':
        recommendations.push('⚠️ High risk bet slip - consider reducing stake');
        break;
      case 'extreme':
        recommendations.push('🚨 Extreme risk bet slip - lottery ticket territory');
        break;
    }
    
    // Expected value recommendations
    if (riskAnalysis.averageReturn > 0) {
      recommendations.push('💰 Positive expected value - mathematically profitable long-term');
    } else {
      recommendations.push('📉 Negative expected value - not recommended for consistent profits');
    }
    
    // Kelly recommendations
    if (!kellyRecommendation.isRecommended) {
      if (kellyRecommendation.optimalStake === 0) {
        recommendations.push('❌ Kelly criterion suggests avoiding this bet entirely');
      } else {
        recommendations.push(`💡 Consider reducing stake to ${kellyRecommendation.optimalStake} (Kelly optimal)`);
      }
    }
    
    // Probability recommendations
    if (riskAnalysis.profitProbability < 10) {
      recommendations.push('🎲 Win probability < 10% - entertainment value only');
    } else if (riskAnalysis.profitProbability < 25) {
      recommendations.push('🎯 Win probability < 25% - high variance play');
    }
    
    // Parlay-specific recommendations
    if (legs.length > 1) {
      recommendations.push('🔗 Consider single bets instead of parlays for better long-term returns');
      
      if (legs.length > 5) {
        recommendations.push('✂️ Consider splitting into smaller parlays for better success rate');
      }
    }
    
    // Sharpe ratio recommendations
    if (riskAnalysis.sharpeRatio > 0.5) {
      recommendations.push('📈 Good risk-adjusted returns expected');
    } else if (riskAnalysis.sharpeRatio < 0) {
      recommendations.push('📉 Poor risk-adjusted returns - high risk for low reward');
    }

    return recommendations;
  }

  /**
   * Store bet slip analysis in database
   */
  private async storeBetSlipAnalysis(analysis: BetSlipAnalysis, legs: BetSlipLeg[]): Promise<void> {
    try {
      // TODO: Add BetSlipAnalysis model to Prisma schema
      // await this.prisma.betSlipAnalysis.create({
      //   data: {
      //     betSlipId: analysis.betSlipId,
      //     totalStake: analysis.totalStake,
      //     potentialPayout: analysis.potentialPayout,
      //     totalOdds: analysis.totalOdds,
      //     combinedProbability: analysis.combinedProbability,
      //     expectedValue: analysis.expectedValue,
      //     riskLevel: analysis.riskAnalysis.riskLevel,
      //     legs: JSON.stringify(legs),
      //     analysis: JSON.stringify(analysis),
      //     createdAt: new Date(analysis.timestamp)
      //   }
      // });
    } catch (error) {
      this.logger.warn(`Failed to store bet slip analysis: ${error.message}`);
    }
  }

  /**
   * Get historical bet slip analyses
   */
  async getBetSlipHistory(limit: number = 20): Promise<any[]> {
    try {
      // TODO: Add BetSlipAnalysis model to Prisma schema
      // return await this.prisma.betSlipAnalysis.findMany({
      //   take: limit,
      //   orderBy: { createdAt: 'desc' }
      // });
      return [];
    } catch (error) {
      this.logger.warn(`Failed to fetch bet slip history: ${error.message}`);
      return [];
    }
  }

  /**
   * Optimize bet slip using portfolio theory
   */
  async optimizeBetSlip(legs: BetSlipLeg[], totalBankroll: number): Promise<any> {
    this.logger.log(`Optimizing bet slip with ${legs.length} legs for bankroll ${totalBankroll}`);
    
    try {
      // Calculate optimal weights using simplified portfolio optimization
      const expectedReturns = legs.map(leg => {
        const trueProbability = leg.estimatedTrueProbability || (1 / leg.odds);
        return trueProbability * leg.odds - 1; // Expected return
      });
      
      // Simple risk parity approach
      const optimalWeights = this.calculateOptimalWeights(legs, expectedReturns);
      
      // Calculate portfolio metrics
      const portfolioReturn = optimalWeights.reduce((sum, weight, i) => sum + weight * expectedReturns[i], 0);
      const portfolioRisk = this.calculatePortfolioRisk(legs, optimalWeights);
      
      const optimization = {
        originalWeights: legs.map(leg => leg.stake / legs.reduce((sum, l) => sum + l.stake, 0)),
        optimalWeights,
        expectedPortfolioReturn: Math.round(portfolioReturn * 10000) / 100,
        portfolioRisk: Math.round(portfolioRisk * 10000) / 100,
        improvementPotential: Math.round((portfolioReturn - expectedReturns.reduce((sum, ret) => sum + ret, 0) / legs.length) * 10000) / 100,
        recommendations: this.generateOptimizationRecommendations(optimalWeights, expectedReturns)
      };
      
      return optimization;
    } catch (error) {
      this.logger.error(`Failed to optimize bet slip: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate optimal weights using mean-variance optimization
   */
  private calculateOptimalWeights(legs: BetSlipLeg[], expectedReturns: number[]): number[] {
    // Simple equal-weight baseline
    const equalWeight = 1 / legs.length;
    
    // Adjust based on expected returns and risk
    const adjustedWeights = expectedReturns.map((ret, i) => {
      const leg = legs[i];
      const riskAdjustment = Math.min(2, Math.max(0.5, 1 / Math.sqrt(leg.odds))); // Lower risk for favorites
      const returnAdjustment = Math.min(2, Math.max(0.5, 1 + ret)); // Higher weight for better expected returns
      
      return equalWeight * riskAdjustment * returnAdjustment;
    });
    
    // Normalize weights to sum to 1
    const totalWeight = adjustedWeights.reduce((sum, weight) => sum + weight, 0);
    return adjustedWeights.map(weight => weight / totalWeight);
  }

  /**
   * Calculate portfolio risk (simplified)
   */
  private calculatePortfolioRisk(legs: BetSlipLeg[], weights: number[]): number {
    // Simplified portfolio risk calculation
    const weightedVariances = legs.map((leg, i) => {
      const variance = Math.pow(leg.odds - 1, 2); // Simplified variance based on odds
      return weights[i] * weights[i] * variance;
    });
    
    // Add correlation component (simplified)
    const correlationRisk = legs.length > 1 ? 0.1 * weights.reduce((sum, w) => sum + w * w, 0) : 0;
    
    return Math.sqrt(weightedVariances.reduce((sum, v) => sum + v, 0) + correlationRisk);
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(optimalWeights: number[], expectedReturns: number[]): string[] {
    const recommendations: string[] = [];
    
    optimalWeights.forEach((weight, i) => {
      const expectedReturn = expectedReturns[i];
      
      if (weight > 0.4) {
        recommendations.push(`🎯 High allocation to bet ${i + 1} (${(weight * 100).toFixed(1)}%) - strong expected value`);
      } else if (weight < 0.05 && expectedReturn < 0) {
        recommendations.push(`❌ Consider removing bet ${i + 1} - negative expected value`);
      }
    });
    
    const maxWeight = Math.max(...optimalWeights);
    const minWeight = Math.min(...optimalWeights);
    
    if (maxWeight / minWeight > 5) {
      recommendations.push('⚖️ Consider more balanced allocation across selections');
    }
    
    if (optimalWeights.every(w => w > 0.1 && w < 0.4)) {
      recommendations.push('✅ Well-balanced portfolio allocation');
    }
    
    return recommendations;
  }

  /**
   * Generate unique bet slip ID
   */
  private generateBetSlipId(): string {
    return `bs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Test the bet slip analyzer
   */
  async testBetSlipAnalyzer(): Promise<any> {
    const testLegs: BetSlipLeg[] = [
      {
        eventId: 'test1',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        market: 'Match Winner',
        selection: 'Arsenal',
        odds: 2.1,
        stake: 50,
        impliedProbability: 0.48,
        estimatedTrueProbability: 0.52
      },
      {
        eventId: 'test2',
        homeTeam: 'Liverpool',
        awayTeam: 'Manchester City',
        market: 'Match Winner',
        selection: 'Liverpool',
        odds: 1.9,
        stake: 50,
        impliedProbability: 0.53,
        estimatedTrueProbability: 0.55
      }
    ];

    try {
      const analysis = await this.analyzeBetSlip(testLegs, 100, 1000);
      
      return {
        status: 'success',
        testLegs,
        analysis
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        testLegs
      };
    }
  }
}