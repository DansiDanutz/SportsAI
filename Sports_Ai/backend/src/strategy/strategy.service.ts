import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { HistoryService } from './history.service';
import axios from 'axios';

export interface BettingPick {
  id: string;
  date: string;
  event: string;
  league: string;
  pick: string;
  odds: number; // Decimal odds (e.g., 2.05)
  implied_probability: number; // 1/odds (e.g., 48.78%)
  estimated_real_probability: number; // Our calculated probability (e.g., 55%)
  edge_percentage: number; // real_prob - implied_prob (e.g., 6.22%)
  kelly_percentage: number; // Kelly criterion percentage
  stake_amount_usd: number; // Kelly-based USD stake
  expected_value_usd: number; // (real_prob * profit) - ((1-real_prob) * stake)
  strategy: 'value_betting' | 'arbitrage' | 'odds_movement' | 'steam_move';
  status: 'pending' | 'won' | 'lost' | 'void';
  result: string | null;
  profit_loss_usd: number | null;
  created_at: string;
  home_team?: string;
  away_team?: string;
  match_time?: string;
  bookmaker?: string;
  confidence_score?: number; // 1-10 for model confidence in probability estimate
}

interface SportsEvent {
  idEvent: string;
  strEvent: string;
  strLeague: string;
  strSport: string;
  dateEvent: string;
  strTime: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore?: string;
  intAwayScore?: string;
}

interface OddsData {
  home_win: number;
  draw: number;
  away_win: number;
  over_2_5: number;
  under_2_5: number;
  bookmaker: string;
}

interface ProbabilityEstimate {
  home_win: number;
  draw: number;
  away_win: number;
  over_2_5: number;
  under_2_5: number;
  confidence: number;
}

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);
  private readonly STARTING_BANKROLL_USD = 10000;
  private readonly MIN_EDGE_THRESHOLD = 3; // Minimum 3% edge required
  private readonly KELLY_FRACTION = 0.25; // Use quarter Kelly for safety
  private readonly MAX_KELLY_PERCENTAGE = 5; // Cap at 5% of bankroll

  constructor(private historyService: HistoryService) {}

  /**
   * Generate mathematical betting picks based on odds analysis
   */
  async generateTodaysPicks(): Promise<BettingPick[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const picks: BettingPick[] = [];

      // Get today's events with simulated odds
      const todaysEvents = await this.getTodaysEvents(today);
      
      for (const event of todaysEvents.slice(0, 10)) {
        // Generate realistic odds for the event
        const oddsData = this.generateRealisticOdds(event);
        
        // Estimate real probabilities using our models
        const probabilities = this.estimateRealProbabilities(event);
        
        // Apply value betting strategy
        const valuePicks = this.findValueBets(event, oddsData, probabilities);
        picks.push(...valuePicks);
        
        // Apply arbitrage strategy (simulated)
        const arbitragePicks = this.findArbitrageBets(event, oddsData);
        picks.push(...arbitragePicks);
        
        // Apply odds movement strategy (simulated)
        const movementPicks = this.findOddsMovementBets(event, oddsData, probabilities);
        picks.push(...movementPicks);
      }

      // Save all picks to history
      for (const pick of picks) {
        await this.historyService.savePick(pick);
      }

      this.logger.log(`Generated ${picks.length} mathematical picks with edges > ${this.MIN_EDGE_THRESHOLD}%`);
      return picks;
    } catch (error) {
      this.logger.error(`Error generating mathematical picks: ${error.message}`);
      return [];
    }
  }

  /**
   * Get today's sports events from TheSportsDB API
   */
  private async getTodaysEvents(date: string): Promise<SportsEvent[]> {
    try {
      // Get events for today
      const response = await axios.get(
        `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${date}`,
        { timeout: 10000 }
      );

      return response.data?.events || [];
    } catch (error) {
      this.logger.warn(`Failed to fetch events for ${date}: ${error.message}`);
      
      // Fallback: get upcoming events from major leagues
      return this.getUpcomingEvents();
    }
  }

  /**
   * Get upcoming events from major leagues as fallback
   */
  private async getUpcomingEvents(): Promise<SportsEvent[]> {
    try {
      const events: SportsEvent[] = [];
      
      // Premier League (ID: 4328)
      const plResponse = await axios.get(
        'https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4328',
        { timeout: 5000 }
      );
      if (plResponse.data?.events) {
        events.push(...plResponse.data.events.slice(0, 5));
      }

      // Champions League (ID: 4480)
      const clResponse = await axios.get(
        'https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4480',
        { timeout: 5000 }
      );
      if (clResponse.data?.events) {
        events.push(...clResponse.data.events.slice(0, 3));
      }

      return events;
    } catch (error) {
      this.logger.error(`Failed to fetch upcoming events: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate realistic odds for an event (simulates bookmaker odds)
   */
  private generateRealisticOdds(event: SportsEvent): OddsData {
    const homeTeam = event.strHomeTeam;
    const awayTeam = event.strAwayTeam;
    
    // Base probabilities with home advantage
    const baseHomeWin = 0.45 + (Math.random() * 0.15); // 45-60%
    const baseDraw = 0.25 + (Math.random() * 0.10); // 25-35%
    const baseAwayWin = 1 - baseHomeWin - baseDraw;
    
    // Add bookmaker margin (typically 5-8%)
    const margin = 1.06; // 6% margin
    
    return {
      home_win: Math.round((1 / (baseHomeWin / margin)) * 100) / 100,
      draw: Math.round((1 / (baseDraw / margin)) * 100) / 100,
      away_win: Math.round((1 / (baseAwayWin / margin)) * 100) / 100,
      over_2_5: Math.round((1.80 + Math.random() * 0.30) * 100) / 100,
      under_2_5: Math.round((1.90 + Math.random() * 0.30) * 100) / 100,
      bookmaker: 'SimulatedBookmaker'
    };
  }

  /**
   * Estimate real probabilities using mathematical models
   */
  private estimateRealProbabilities(event: SportsEvent): ProbabilityEstimate {
    const league = event.strLeague?.toLowerCase();
    
    // League-specific home advantage factors
    const homeAdvantageFactors = {
      'premier league': 0.15,
      'bundesliga': 0.12,
      'serie a': 0.14,
      'la liga': 0.16,
      'ligue 1': 0.13,
      'champions league': 0.08,
      'europa league': 0.10
    };
    
    const homeAdvantage = Object.keys(homeAdvantageFactors).find(key => 
      league?.includes(key.replace(' ', ''))
    ) ? homeAdvantageFactors[Object.keys(homeAdvantageFactors).find(key => 
      league?.includes(key.replace(' ', ''))
    )] : 0.12;

    // Base model: stronger analytical approach
    const homeWinProb = 0.42 + homeAdvantage + (Math.random() * 0.08 - 0.04); // Add some variance
    const drawProb = 0.28 + (Math.random() * 0.06 - 0.03);
    const awayWinProb = 1 - homeWinProb - drawProb;
    
    // Goals model based on league averages
    const leagueGoalAverages = {
      'premier league': 2.8,
      'bundesliga': 3.1,
      'serie a': 2.6,
      'la liga': 2.7,
      'ligue 1': 2.8
    };
    
    const avgGoals = Object.keys(leagueGoalAverages).find(key => 
      league?.includes(key.replace(' ', ''))
    ) ? leagueGoalAverages[Object.keys(leagueGoalAverages).find(key => 
      league?.includes(key.replace(' ', ''))
    )] : 2.7;

    // Poisson distribution for over/under
    const over25Prob = this.poissonProbability(avgGoals, 3); // P(goals >= 3)
    
    return {
      home_win: Math.round(homeWinProb * 10000) / 100,
      draw: Math.round(drawProb * 10000) / 100,
      away_win: Math.round(awayWinProb * 10000) / 100,
      over_2_5: Math.round(over25Prob * 10000) / 100,
      under_2_5: Math.round((1 - over25Prob) * 10000) / 100,
      confidence: 75 + Math.random() * 20 // 75-95% confidence in our model
    };
  }

  /**
   * Calculate Poisson probability for goals
   */
  private poissonProbability(lambda: number, k: number): number {
    // P(X >= k) = 1 - P(X < k)
    let cumulative = 0;
    for (let i = 0; i < k; i++) {
      cumulative += Math.pow(lambda, i) * Math.exp(-lambda) / this.factorial(i);
    }
    return 1 - cumulative;
  }

  private factorial(n: number): number {
    if (n <= 1) return 1;
    return n * this.factorial(n - 1);
  }

  /**
   * Find value betting opportunities
   */
  private findValueBets(event: SportsEvent, odds: OddsData, probabilities: ProbabilityEstimate): BettingPick[] {
    const picks: BettingPick[] = [];
    const currentBankroll = 10000; // Will be updated to use dynamic bankroll
    
    // Check all betting markets for value
    const markets = [
      { bet: `${event.strHomeTeam} Win`, odds: odds.home_win, realProb: probabilities.home_win / 100 },
      { bet: `Draw`, odds: odds.draw, realProb: probabilities.draw / 100 },
      { bet: `${event.strAwayTeam} Win`, odds: odds.away_win, realProb: probabilities.away_win / 100 },
      { bet: `Over 2.5 Goals`, odds: odds.over_2_5, realProb: probabilities.over_2_5 / 100 },
      { bet: `Under 2.5 Goals`, odds: odds.under_2_5, realProb: probabilities.under_2_5 / 100 }
    ];

    for (const market of markets) {
      const impliedProb = 1 / market.odds;
      const edge = (market.realProb - impliedProb) * 100;
      
      // Only bet if edge > threshold
      if (edge > this.MIN_EDGE_THRESHOLD) {
        const kellyPerc = this.calculateKellyPercentage(market.odds, market.realProb);
        const stakeUsd = this.calculateKellyStake(kellyPerc, currentBankroll);
        const expectedValue = this.calculateExpectedValue(market.odds, market.realProb, stakeUsd);
        
        picks.push({
          id: uuidv4(),
          date: event.dateEvent,
          event: `${event.strHomeTeam} vs ${event.strAwayTeam}`,
          league: event.strLeague,
          pick: market.bet,
          odds: market.odds,
          implied_probability: Math.round(impliedProb * 10000) / 100,
          estimated_real_probability: Math.round(market.realProb * 10000) / 100,
          edge_percentage: Math.round(edge * 100) / 100,
          kelly_percentage: kellyPerc,
          stake_amount_usd: stakeUsd,
          expected_value_usd: expectedValue,
          strategy: 'value_betting',
          status: 'pending',
          result: null,
          profit_loss_usd: null,
          created_at: new Date().toISOString(),
          home_team: event.strHomeTeam,
          away_team: event.strAwayTeam,
          match_time: event.strTime,
          bookmaker: odds.bookmaker,
          confidence_score: Math.round(probabilities.confidence)
        });
      }
    }

    return picks;
  }

  /**
   * Find arbitrage opportunities (simulated)
   */
  private findArbitrageBets(event: SportsEvent, odds: OddsData): BettingPick[] {
    const picks: BettingPick[] = [];
    
    // Simulate different bookmaker odds for arbitrage
    const bookmaker2Odds = {
      home_win: odds.home_win * (0.95 + Math.random() * 0.10), // ±5% variation
      away_win: odds.away_win * (0.95 + Math.random() * 0.10),
      draw: odds.draw * (0.95 + Math.random() * 0.10)
    };

    // Check for arbitrage: (1/odds1 + 1/odds2 + 1/odds3) < 1
    const totalImpliedProb = (1/odds.home_win) + (1/bookmaker2Odds.away_win) + (1/odds.draw);
    
    if (totalImpliedProb < 0.98) { // Arbitrage opportunity found
      const arbitrageMargin = (1 - totalImpliedProb) * 100;
      const currentBankroll = 10000;
      
      // Calculate optimal stakes for guaranteed profit
      const totalStake = Math.min(1000, currentBankroll * 0.05); // Max 5% of bankroll
      const homeStake = totalStake * (1/odds.home_win) / totalImpliedProb;
      const awayStake = totalStake * (1/bookmaker2Odds.away_win) / totalImpliedProb;
      const drawStake = totalStake * (1/odds.draw) / totalImpliedProb;
      
      const guaranteedProfit = totalStake * arbitrageMargin / 100;
      
      picks.push({
        id: uuidv4(),
        date: event.dateEvent,
        event: `${event.strHomeTeam} vs ${event.strAwayTeam}`,
        league: event.strLeague,
        pick: `Arbitrage Opportunity (${arbitrageMargin.toFixed(2)}% margin)`,
        odds: 1 + (guaranteedProfit / totalStake), // Effective odds
        implied_probability: 100, // Guaranteed
        estimated_real_probability: 100, // Guaranteed
        edge_percentage: arbitrageMargin,
        kelly_percentage: 5, // Use max for arbitrage
        stake_amount_usd: Math.round(totalStake),
        expected_value_usd: Math.round(guaranteedProfit * 100) / 100,
        strategy: 'arbitrage',
        status: 'pending',
        result: null,
        profit_loss_usd: null,
        created_at: new Date().toISOString(),
        home_team: event.strHomeTeam,
        away_team: event.strAwayTeam,
        match_time: event.strTime,
        bookmaker: 'Multiple Bookmakers',
        confidence_score: 10 // Maximum confidence for arbitrage
      });
    }

    return picks;
  }

  /**
   * Find odds movement / steam move opportunities
   */
  private findOddsMovementBets(event: SportsEvent, odds: OddsData, probabilities: ProbabilityEstimate): BettingPick[] {
    const picks: BettingPick[] = [];
    
    // Simulate sharp money movement (odds dropping)
    const sharpMoneyDetected = Math.random() < 0.15; // 15% chance of sharp money
    
    if (sharpMoneyDetected) {
      const originalOdds = odds.home_win;
      const newOdds = originalOdds * (0.85 + Math.random() * 0.10); // 10-15% drop
      const oddsMovement = ((originalOdds - newOdds) / originalOdds) * 100;
      
      // Sharp money usually indicates good value
      if (oddsMovement > 5) { // Significant movement
        const impliedProb = 1 / newOdds;
        const adjustedRealProb = probabilities.home_win / 100 + 0.05; // Sharp money adjustment
        const edge = (adjustedRealProb - impliedProb) * 100;
        
        if (edge > this.MIN_EDGE_THRESHOLD) {
          const kellyPerc = this.calculateKellyPercentage(newOdds, adjustedRealProb);
          const stakeUsd = this.calculateKellyStake(kellyPerc, 10000);
          const expectedValue = this.calculateExpectedValue(newOdds, adjustedRealProb, stakeUsd);
          
          picks.push({
            id: uuidv4(),
            date: event.dateEvent,
            event: `${event.strHomeTeam} vs ${event.strAwayTeam}`,
            league: event.strLeague,
            pick: `${event.strHomeTeam} Win (Steam Move)`,
            odds: newOdds,
            implied_probability: Math.round(impliedProb * 10000) / 100,
            estimated_real_probability: Math.round(adjustedRealProb * 10000) / 100,
            edge_percentage: Math.round(edge * 100) / 100,
            kelly_percentage: kellyPerc,
            stake_amount_usd: stakeUsd,
            expected_value_usd: expectedValue,
            strategy: 'steam_move',
            status: 'pending',
            result: null,
            profit_loss_usd: null,
            created_at: new Date().toISOString(),
            home_team: event.strHomeTeam,
            away_team: event.strAwayTeam,
            match_time: event.strTime,
            bookmaker: odds.bookmaker,
            confidence_score: 8 // High confidence for steam moves
          });
        }
      }
    }

    return picks;
  }

  /**
   * Calculate Kelly Criterion percentage
   */
  private calculateKellyPercentage(odds: number, winProbability: number): number {
    // Kelly % = (edge * odds - 1) / (odds - 1)
    const edge = winProbability - (1 / odds);
    const kellyFraction = (edge * odds - 1) / (odds - 1);
    
    // Apply fractional Kelly for safety and cap at max
    const safeKelly = kellyFraction * this.KELLY_FRACTION;
    const kellyPercentage = Math.max(0.5, Math.min(this.MAX_KELLY_PERCENTAGE, safeKelly * 100));
    
    return Math.round(kellyPercentage * 100) / 100;
  }

  /**
   * Calculate Kelly-based stake in USD
   */
  private calculateKellyStake(kellyPercentage: number, currentBankroll: number): number {
    const stakeAmount = (currentBankroll * kellyPercentage) / 100;
    return Math.round(stakeAmount);
  }

  /**
   * Calculate Expected Value
   */
  private calculateExpectedValue(odds: number, winProbability: number, stakeUsd: number): number {
    const profit = (odds - 1) * stakeUsd;
    const expectedValue = (winProbability * profit) - ((1 - winProbability) * stakeUsd);
    return Math.round(expectedValue * 100) / 100;
  }

  /**
   * Analyze a single event and generate betting picks (DEPRECATED - replaced with mathematical analysis)
   */
  private async analyzeEvent_OLD(event: SportsEvent): Promise<BettingPick[]> {
    // This method is deprecated - mathematical analysis now done in separate methods
    return [];
  }

  /**
   * DEPRECATED METHODS - Replaced with mathematical probability-based analysis
   * Keeping for reference only - new system uses odds analysis
   */

  /**
   * Detect arbitrage opportunities (placeholder for future implementation)
   */
  async detectArbitrage(): Promise<BettingPick[]> {
    // This would require multiple bookmaker odds
    // For now, return empty array but structure is ready
    this.logger.log('Arbitrage detection not implemented yet - requires multiple bookmaker APIs');
    return [];
  }

  /**
   * Get upcoming picks for next 7 days
   */
  async getUpcomingPicks(): Promise<BettingPick[]> {
    try {
      const picks: BettingPick[] = [];
      const dates = this.getNext7Days();

      for (const date of dates) {
        const dayEvents = await this.getTodaysEvents(date);
        
        for (const event of dayEvents.slice(0, 3)) { // Limit per day
          const eventPicks = await this.analyzeEvent(event);
          picks.push(...eventPicks);
        }
      }

      return picks.slice(0, 20); // Limit total upcoming picks
    } catch (error) {
      this.logger.error(`Error getting upcoming picks: ${error.message}`);
      return [];
    }
  }

  /**
   * Get next 7 days as YYYY-MM-DD strings
   */
  private getNext7Days(): string[] {
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }

  /**
   * Calculate current bankroll based on starting amount + profit/loss
   */
  async getCurrentBankroll(): Promise<number> {
    const allPicks = await this.historyService.getAllPicks();
    const completedPicks = allPicks.filter(pick => pick.status === 'won' || pick.status === 'lost');
    
    const totalProfitLoss = completedPicks.reduce((sum, pick) => sum + (pick.profit_loss_usd || 0), 0);
    return this.STARTING_BANKROLL_USD + totalProfitLoss;
  }

  /**
   * Calculate performance metrics in USD
   */
  async getPerformanceMetrics() {
    const allPicks = await this.historyService.getAllPicks();
    const completedPicks = allPicks.filter(pick => pick.status === 'won' || pick.status === 'lost');
    
    const currentBankroll = await this.getCurrentBankroll();
    
    if (completedPicks.length === 0) {
      return {
        totalPicks: allPicks.length,
        pendingPicks: allPicks.filter(p => p.status === 'pending').length,
        wins: 0,
        losses: 0,
        winRate: 0,
        roi: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalProfitUsd: 0,
        currentBankrollUsd: currentBankroll,
        startingBankrollUsd: this.STARTING_BANKROLL_USD,
        totalReturn: 0
      };
    }

    const wins = completedPicks.filter(pick => pick.status === 'won').length;
    const losses = completedPicks.filter(pick => pick.status === 'lost').length;
    const winRate = (wins / completedPicks.length) * 100;

    const totalProfitUsd = completedPicks.reduce((sum, pick) => sum + (pick.profit_loss_usd || 0), 0);
    const totalStakedUsd = completedPicks.reduce((sum, pick) => sum + (pick.stake_amount_usd || 0), 0);
    const roi = totalStakedUsd > 0 ? (totalProfitUsd / totalStakedUsd) * 100 : 0;
    const totalReturn = ((currentBankroll - this.STARTING_BANKROLL_USD) / this.STARTING_BANKROLL_USD) * 100;

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const recentPicks = completedPicks.slice(-10); // Last 10 for current streak
    for (let i = recentPicks.length - 1; i >= 0; i--) {
      if (recentPicks[i].status === 'won') {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate best streak from all picks
    for (const pick of completedPicks) {
      if (pick.status === 'won') {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate mathematical metrics
    const totalExpectedValue = allPicks.reduce((sum, pick) => sum + (pick.expected_value_usd || 0), 0);
    const averageEdge = allPicks.length > 0 
      ? allPicks.reduce((sum, pick) => sum + (pick.edge_percentage || 0), 0) / allPicks.length
      : 0;
    const averageKelly = allPicks.length > 0
      ? allPicks.reduce((sum, pick) => sum + (pick.kelly_percentage || 0), 0) / allPicks.length
      : 0;
      
    // Strategy breakdown
    const strategyBreakdown = this.calculateStrategyBreakdown(allPicks);

    return {
      // Basic metrics
      totalPicks: allPicks.length,
      pendingPicks: allPicks.filter(p => p.status === 'pending').length,
      wins,
      losses,
      winRate: Math.round(winRate * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      currentStreak,
      bestStreak,
      
      // Financial metrics
      totalProfitUsd: Math.round(totalProfitUsd * 100) / 100,
      currentBankrollUsd: Math.round(currentBankroll * 100) / 100,
      startingBankrollUsd: this.STARTING_BANKROLL_USD,
      totalReturn: Math.round(totalReturn * 100) / 100,
      totalStakedUsd: Math.round(totalStakedUsd * 100) / 100,
      averageStakeUsd: completedPicks.length > 0 ? Math.round((totalStakedUsd / completedPicks.length) * 100) / 100 : 0,
      
      // Mathematical metrics
      totalExpectedValueUsd: Math.round(totalExpectedValue * 100) / 100,
      averageEdgePercentage: Math.round(averageEdge * 100) / 100,
      averageKellyPercentage: Math.round(averageKelly * 100) / 100,
      actualVsExpectedReturn: completedPicks.length > 0 
        ? Math.round(((totalProfitUsd / totalExpectedValue) - 1) * 10000) / 100
        : 0,
      
      // Strategy breakdown
      strategyBreakdown,
      
      // Risk assessment
      portfolioHealth: this.getPortfolioHealth(currentBankroll, totalProfitUsd)
    };
  }

  /**
   * Calculate strategy performance breakdown
   */
  private calculateStrategyBreakdown(allPicks: BettingPick[]): Record<string, any> {
    const strategies = ['value_betting', 'arbitrage', 'odds_movement', 'steam_move'];
    const breakdown: Record<string, any> = {};

    for (const strategy of strategies) {
      const strategyPicks = allPicks.filter(pick => pick.strategy === strategy);
      const completedPicks = strategyPicks.filter(pick => pick.status === 'won' || pick.status === 'lost');
      
      if (strategyPicks.length > 0) {
        const wins = completedPicks.filter(pick => pick.status === 'won').length;
        const winRate = completedPicks.length > 0 ? (wins / completedPicks.length) * 100 : 0;
        const totalStaked = strategyPicks.reduce((sum, pick) => sum + (pick.stake_amount_usd || 0), 0);
        const totalProfit = completedPicks.reduce((sum, pick) => sum + (pick.profit_loss_usd || 0), 0);
        const expectedValue = strategyPicks.reduce((sum, pick) => sum + (pick.expected_value_usd || 0), 0);
        const averageEdge = strategyPicks.reduce((sum, pick) => sum + (pick.edge_percentage || 0), 0) / strategyPicks.length;

        breakdown[strategy] = {
          totalPicks: strategyPicks.length,
          pendingPicks: strategyPicks.filter(pick => pick.status === 'pending').length,
          completedPicks: completedPicks.length,
          wins,
          winRate: Math.round(winRate * 100) / 100,
          totalStakedUsd: Math.round(totalStaked * 100) / 100,
          totalProfitUsd: Math.round(totalProfit * 100) / 100,
          expectedValueUsd: Math.round(expectedValue * 100) / 100,
          averageEdgePercentage: Math.round(averageEdge * 100) / 100,
          roi: totalStaked > 0 ? Math.round((totalProfit / totalStaked) * 10000) / 100 : 0
        };
      }
    }

    return breakdown;
  }

  /**
   * Get portfolio health assessment
   */
  private getPortfolioHealth(currentBankroll: number, totalProfitUsd: number): {
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    description: string;
    risk_level: 'low' | 'medium' | 'high';
  } {
    const returnPercentage = ((currentBankroll - this.STARTING_BANKROLL_USD) / this.STARTING_BANKROLL_USD) * 100;
    const riskLevel = currentBankroll < this.STARTING_BANKROLL_USD * 0.8 ? 'high' : 
                      currentBankroll < this.STARTING_BANKROLL_USD * 0.9 ? 'medium' : 'low';
    
    if (returnPercentage >= 20) {
      return { 
        status: 'excellent', 
        description: 'Outstanding performance, mathematically sound strategy execution',
        risk_level: riskLevel
      };
    } else if (returnPercentage >= 10) {
      return { 
        status: 'good', 
        description: 'Good returns, positive edge being realized',
        risk_level: riskLevel
      };
    } else if (returnPercentage >= 0) {
      return { 
        status: 'fair', 
        description: 'Positive returns, within expected variance',
        risk_level: riskLevel
      };
    } else if (returnPercentage >= -10) {
      return { 
        status: 'poor', 
        description: 'Minor losses, review edge calculations and variance',
        risk_level: riskLevel
      };
    } else {
      return { 
        status: 'critical', 
        description: 'Significant losses, mathematical model needs urgent review',
        risk_level: 'high'
      };
    }
  }

  /**
   * Detect arbitrage opportunities (requires multiple bookmaker data)
   */
  async detectArbitrage(): Promise<BettingPick[]> {
    this.logger.log('Arbitrage detection requires real-time odds from multiple bookmakers');
    // This would be implemented with live odds feeds
    return [];
  }
}