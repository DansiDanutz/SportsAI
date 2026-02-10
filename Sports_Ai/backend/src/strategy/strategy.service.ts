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
  stake_recommendation: string;
  strategy: string;
  status: 'pending' | 'won' | 'lost' | 'void';
  result: string | null;
  profit_loss: number | null;
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
        picks.push({
          id: uuidv4(),
          date: matchDate,
          event: eventName,
          league: league,
          pick: homeFavoritePick.pick,
          odds: homeFavoritePick.odds,
          confidence: homeFavoritePick.confidence,
          stake_recommendation: homeFavoritePick.stakeRecommendation,
          strategy: 'home_favorite',
          status: 'pending',
          result: null,
          profit_loss: null,
          created_at: new Date().toISOString(),
          home_team: homeTeam,
          away_team: awayTeam,
          match_time: matchTime
        });
      }

      // Strategy 2: Over/Under Analysis
      const overUnderPick = this.analyzeOverUnder(event);
      if (overUnderPick) {
        picks.push({
          id: uuidv4(),
          date: matchDate,
          event: eventName,
          league: league,
          pick: overUnderPick.pick,
          odds: overUnderPick.odds,
          confidence: overUnderPick.confidence,
          stake_recommendation: overUnderPick.stakeRecommendation,
          strategy: 'over_under',
          status: 'pending',
          result: null,
          profit_loss: null,
          created_at: new Date().toISOString(),
          home_team: homeTeam,
          away_team: awayTeam,
          match_time: matchTime
        });
      }

      // Strategy 3: Value Bet Detection
      const valueBet = this.detectValueBet(event);
      if (valueBet) {
        picks.push({
          id: uuidv4(),
          date: matchDate,
          event: eventName,
          league: league,
          pick: valueBet.pick,
          odds: valueBet.odds,
          confidence: valueBet.confidence,
          stake_recommendation: valueBet.stakeRecommendation,
          strategy: 'value_bet',
          status: 'pending',
          result: null,
          profit_loss: null,
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
        confidence: Math.min(confidence, 8),
        stakeRecommendation: confidence >= 7 ? '2 units' : '1 unit'
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
          confidence: Math.floor(5 + Math.abs(overProbability - 0.5) * 10),
          stakeRecommendation: '1 unit'
        };
      } else if (sport?.includes('basketball')) {
        // For basketball, analyze total points
        const threshold = 210;
        const pick = average > threshold ? `Over ${threshold}` : `Under ${threshold + 10}`;
        
        return {
          pick: pick,
          odds: 1.90 + Math.random() * 0.20,
          confidence: 6,
          stakeRecommendation: '1 unit'
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
          confidence: 8,
          stakeRecommendation: '2 units'
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
   * Calculate performance metrics
   */
  async getPerformanceMetrics() {
    const allPicks = await this.historyService.getAllPicks();
    const completedPicks = allPicks.filter(pick => pick.status === 'won' || pick.status === 'lost');
    
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
        totalProfit: 0,
        bankroll: 100 // Starting bankroll
      };
    }

    const wins = completedPicks.filter(pick => pick.status === 'won').length;
    const losses = completedPicks.filter(pick => pick.status === 'lost').length;
    const winRate = (wins / completedPicks.length) * 100;

    const totalProfit = completedPicks.reduce((sum, pick) => sum + (pick.profit_loss || 0), 0);
    const totalStaked = completedPicks.length * 1; // Assuming average 1 unit per bet
    const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

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
      totalProfit: Math.round(totalProfit * 100) / 100,
      bankroll: Math.round((100 + totalProfit) * 100) / 100
    };
  }
}