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
  odds: number;
  confidence: number; // 1-10
  stake_amount_usd: number; // Actual dollar amount
  stake_percentage: number; // Percentage of bankroll (1-5%)
  strategy: string;
  status: 'pending' | 'won' | 'lost' | 'void';
  result: string | null;
  profit_loss_usd: number | null; // Profit/loss in USD
  created_at: string;
  home_team?: string;
  away_team?: string;
  match_time?: string;
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

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);
  private readonly STARTING_BANKROLL_USD = 10000; // $10,000 starting capital
  private readonly MAX_STAKE_PERCENTAGE = 5; // Never risk more than 5%
  private readonly MIN_STAKE_PERCENTAGE = 1; // Minimum 1%

  constructor(private historyService: HistoryService) {}

  /**
   * Generate betting picks based on strategy analysis
   */
  async generateTodaysPicks(): Promise<BettingPick[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const picks: BettingPick[] = [];

      // Get today's events from TheSportsDB
      const todaysEvents = await this.getTodaysEvents(today);
      
      // Filter for major leagues only
      const majorLeagues = [
        'English Premier League',
        'German Bundesliga',
        'Italian Serie A',
        'Spanish La Liga',
        'French Ligue 1',
        'UEFA Champions League',
        'UEFA Europa League',
        'NBA',
        'NFL',
        'MLB',
        'UEFA European Championship'
      ];

      const filteredEvents = todaysEvents.filter(event => 
        majorLeagues.some(league => 
          event.strLeague?.toLowerCase().includes(league.toLowerCase())
        )
      );

      // Generate picks for each filtered event
      for (const event of filteredEvents.slice(0, 10)) { // Limit to 10 picks
        const eventPicks = await this.analyzeEvent(event);
        picks.push(...eventPicks);
      }

      // Save all picks to history
      for (const pick of picks) {
        await this.historyService.savePick(pick);
      }

      return picks;
    } catch (error) {
      this.logger.error(`Error generating picks: ${error.message}`);
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
   * Analyze a single event and generate betting picks
   */
  private async analyzeEvent(event: SportsEvent): Promise<BettingPick[]> {
    const picks: BettingPick[] = [];
    
    try {
      const homeTeam = event.strHomeTeam;
      const awayTeam = event.strAwayTeam;
      const league = event.strLeague;
      const eventName = `${homeTeam} vs ${awayTeam}`;
      const matchDate = event.dateEvent;
      const matchTime = event.strTime;

      // Strategy 1: Home Favorite Analysis
      const homeFavoritePick = this.analyzeHomeFavorite(event);
      if (homeFavoritePick) {
        const currentBankroll = await this.getCurrentBankroll();
        const stakeInfo = this.calculateStakeAmount(homeFavoritePick.confidence, currentBankroll);
        
        picks.push({
          id: uuidv4(),
          date: matchDate,
          event: eventName,
          league: league,
          pick: homeFavoritePick.pick,
          odds: homeFavoritePick.odds,
          confidence: homeFavoritePick.confidence,
          stake_amount_usd: stakeInfo.amount,
          stake_percentage: stakeInfo.percentage,
          strategy: 'home_favorite',
          status: 'pending',
          result: null,
          profit_loss_usd: null,
          created_at: new Date().toISOString(),
          home_team: homeTeam,
          away_team: awayTeam,
          match_time: matchTime
        });
      }

      // Strategy 2: Over/Under Analysis
      const overUnderPick = this.analyzeOverUnder(event);
      if (overUnderPick) {
        const currentBankroll = await this.getCurrentBankroll();
        const stakeInfo = this.calculateStakeAmount(overUnderPick.confidence, currentBankroll);
        
        picks.push({
          id: uuidv4(),
          date: matchDate,
          event: eventName,
          league: league,
          pick: overUnderPick.pick,
          odds: overUnderPick.odds,
          confidence: overUnderPick.confidence,
          stake_amount_usd: stakeInfo.amount,
          stake_percentage: stakeInfo.percentage,
          strategy: 'over_under',
          status: 'pending',
          result: null,
          profit_loss_usd: null,
          created_at: new Date().toISOString(),
          home_team: homeTeam,
          away_team: awayTeam,
          match_time: matchTime
        });
      }

      // Strategy 3: Value Bet Detection
      const valueBet = this.detectValueBet(event);
      if (valueBet) {
        const currentBankroll = await this.getCurrentBankroll();
        const stakeInfo = this.calculateStakeAmount(valueBet.confidence, currentBankroll);
        
        picks.push({
          id: uuidv4(),
          date: matchDate,
          event: eventName,
          league: league,
          pick: valueBet.pick,
          odds: valueBet.odds,
          confidence: valueBet.confidence,
          stake_amount_usd: stakeInfo.amount,
          stake_percentage: stakeInfo.percentage,
          strategy: 'value_bet',
          status: 'pending',
          result: null,
          profit_loss_usd: null,
          created_at: new Date().toISOString(),
          home_team: homeTeam,
          away_team: awayTeam,
          match_time: matchTime
        });
      }

      return picks;
    } catch (error) {
      this.logger.error(`Error analyzing event ${event.strEvent}: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze home favorite opportunities
   */
  private analyzeHomeFavorite(event: SportsEvent) {
    const league = event.strLeague?.toLowerCase();
    
    // Home win rates by league (historical data)
    const homeWinRates = {
      'premier league': 0.46,
      'bundesliga': 0.43,
      'serie a': 0.44,
      'la liga': 0.47,
      'ligue 1': 0.45,
      'champions league': 0.41,
      'europa league': 0.42
    };

    const leagueKey = Object.keys(homeWinRates).find(key => 
      league?.includes(key.replace(' ', ''))
    );

    if (leagueKey && homeWinRates[leagueKey] > 0.43) {
      // Generate realistic odds for home win
      const baseOdds = 1.90 + (Math.random() * 0.40); // 1.90 - 2.30
      const confidence = Math.floor(6 + (homeWinRates[leagueKey] - 0.43) * 20);
      
      return {
        pick: `${event.strHomeTeam} Win`,
        odds: Math.round(baseOdds * 100) / 100,
        confidence: Math.min(confidence, 8)
      };
    }

    return null;
  }

  /**
   * Analyze Over/Under opportunities
   */
  private analyzeOverUnder(event: SportsEvent) {
    const league = event.strLeague?.toLowerCase();
    const sport = event.strSport?.toLowerCase();
    
    // Average goals/points by league
    const leagueAverages = {
      'premier league': 2.8,
      'bundesliga': 3.1,
      'serie a': 2.6,
      'la liga': 2.7,
      'ligue 1': 2.8,
      'champions league': 2.9,
      'nba': 220,
      'nfl': 45
    };

    const leagueKey = Object.keys(leagueAverages).find(key => 
      league?.includes(key.replace(' ', ''))
    );

    if (leagueKey) {
      const average = leagueAverages[leagueKey];
      const isFootball = sport?.includes('soccer') || sport?.includes('football') && !sport?.includes('american');
      
      if (isFootball) {
        // For football, analyze over/under 2.5 goals
        const threshold = 2.5;
        const overProbability = average > threshold ? 0.55 : 0.45;
        const pick = overProbability > 0.52 ? 'Over 2.5 Goals' : 'Under 2.5 Goals';
        const odds = overProbability > 0.52 ? 1.85 + Math.random() * 0.20 : 2.05 + Math.random() * 0.25;
        
        return {
          pick: pick,
          odds: Math.round(odds * 100) / 100,
          confidence: Math.floor(5 + Math.abs(overProbability - 0.5) * 10)
        };
      } else if (sport?.includes('basketball')) {
        // For basketball, analyze total points
        const threshold = 210;
        const pick = average > threshold ? `Over ${threshold}` : `Under ${threshold + 10}`;
        
        return {
          pick: pick,
          odds: 1.90 + Math.random() * 0.20,
          confidence: 6
        };
      }
    }

    return null;
  }

  /**
   * Detect value betting opportunities
   */
  private detectValueBet(event: SportsEvent) {
    // Simulate value bet detection based on market inefficiencies
    const homeTeam = event.strHomeTeam;
    const awayTeam = event.strAwayTeam;
    
    // Simple heuristic: look for strong teams as underdogs
    const strongTeams = [
      'Manchester City', 'Liverpool', 'Arsenal', 'Chelsea',
      'Barcelona', 'Real Madrid', 'Bayern Munich', 'PSG',
      'Juventus', 'AC Milan', 'Inter Milan'
    ];

    const isHomeStrong = strongTeams.some(team => homeTeam?.includes(team));
    const isAwayStrong = strongTeams.some(team => awayTeam?.includes(team));

    if (isHomeStrong || isAwayStrong) {
      // Simulate finding value in odds
      const valueFound = Math.random() > 0.7; // 30% chance to find value
      
      if (valueFound) {
        const strongTeam = isHomeStrong ? homeTeam : awayTeam;
        const pick = `${strongTeam} Win or Draw`;
        
        return {
          pick: pick,
          odds: 1.40 + Math.random() * 0.30, // Lower odds for safer bet
          confidence: 8
        };
      }
    }

    return null;
  }

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
   * Calculate stake amount based on confidence and current bankroll
   * Uses conservative percentage-based staking (1-5% max)
   */
  calculateStakeAmount(confidence: number, currentBankroll: number): {
    amount: number;
    percentage: number;
  } {
    // Map confidence (1-10) to stake percentage (1-5%)
    // Conservative approach: Higher confidence = higher stake
    let stakePercentage: number;
    
    if (confidence >= 9) {
      stakePercentage = 5; // Maximum 5%
    } else if (confidence >= 8) {
      stakePercentage = 4; // 4%
    } else if (confidence >= 7) {
      stakePercentage = 3; // 3%
    } else if (confidence >= 6) {
      stakePercentage = 2; // 2%
    } else {
      stakePercentage = 1; // Minimum 1%
    }

    const stakeAmount = Math.round((currentBankroll * stakePercentage) / 100);
    
    return {
      amount: stakeAmount,
      percentage: stakePercentage
    };
  }

  /**
   * Kelly Criterion calculation (alternative staking method)
   * Formula: f = (bp - q) / b
   * where f = fraction to bet, b = odds-1, p = probability, q = 1-p
   */
  calculateKellyStake(odds: number, confidence: number, currentBankroll: number): {
    amount: number;
    percentage: number;
  } {
    // Convert confidence (1-10) to probability estimate
    const probability = Math.min(0.95, Math.max(0.45, (confidence + 40) / 100));
    
    const b = odds - 1; // Net odds
    const p = probability; // Win probability
    const q = 1 - p; // Loss probability
    
    const kellyFraction = (b * p - q) / b;
    
    // Cap Kelly at 5% for safety (quarter Kelly or less)
    const safeKellyPercentage = Math.max(1, Math.min(5, kellyFraction * 25));
    const stakeAmount = Math.round((currentBankroll * safeKellyPercentage) / 100);
    
    return {
      amount: stakeAmount,
      percentage: Math.round(safeKellyPercentage * 100) / 100
    };
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

    return {
      totalPicks: allPicks.length,
      pendingPicks: allPicks.filter(p => p.status === 'pending').length,
      wins,
      losses,
      winRate: Math.round(winRate * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      currentStreak,
      bestStreak,
      totalProfitUsd: Math.round(totalProfitUsd * 100) / 100,
      currentBankrollUsd: Math.round(currentBankroll * 100) / 100,
      startingBankrollUsd: this.STARTING_BANKROLL_USD,
      totalReturn: Math.round(totalReturn * 100) / 100,
      totalStakedUsd: Math.round(totalStakedUsd * 100) / 100,
      averageStakeUsd: completedPicks.length > 0 ? Math.round((totalStakedUsd / completedPicks.length) * 100) / 100 : 0,
      portfolioHealth: this.getPortfolioHealth(currentBankroll, totalProfitUsd)
    };
  }

  /**
   * Get portfolio health assessment
   */
  private getPortfolioHealth(currentBankroll: number, totalProfitUsd: number): {
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    description: string;
  } {
    const returnPercentage = ((currentBankroll - this.STARTING_BANKROLL_USD) / this.STARTING_BANKROLL_USD) * 100;
    
    if (returnPercentage >= 20) {
      return { status: 'excellent', description: 'Outstanding performance, portfolio growing strongly' };
    } else if (returnPercentage >= 10) {
      return { status: 'good', description: 'Good returns, solid performance' };
    } else if (returnPercentage >= 0) {
      return { status: 'fair', description: 'Positive returns, steady progress' };
    } else if (returnPercentage >= -10) {
      return { status: 'poor', description: 'Minor losses, needs improvement' };
    } else {
      return { status: 'critical', description: 'Significant losses, review strategy urgently' };
    }
  }
}