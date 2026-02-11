import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import axios from 'axios';

/**
 * Daily Accumulator Ticket System
 * 
 * Every day generates:
 * - 1x 2-leg accumulator (2 combined matches)
 * - 1x 3-leg accumulator (3 combined matches)
 * 
 * Stakes adapt daily based on current bankroll.
 * Next day's stakes recalculate from updated bankroll.
 */

export interface AccumulatorLeg {
  event: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  pick: string;           // e.g., "Home Win", "Over 2.5", "BTTS"
  odds: number;           // decimal odds
  confidence: number;     // 1-10
  reasoning: string;
}

export interface AccumulatorTicket {
  id: string;
  type: '2-fold' | '3-fold';
  date: string;
  legs: AccumulatorLeg[];
  combinedOdds: number;
  stake: number;
  potentialReturn: number;
  potentialProfit: number;
  status: 'pending' | 'won' | 'lost' | 'partial';
  result?: {
    legsWon: number;
    legsLost: number;
    actualReturn: number;
    pnl: number;
  };
}

export interface DailyAccumulatorState {
  bankroll: number;
  stakePercentage2Fold: number;  // % of bankroll for 2-fold (default 2%)
  stakePercentage3Fold: number;  // % of bankroll for 3-fold (default 1.5%)
  history: AccumulatorTicket[];
  totalPnl: number;
  winRate2Fold: number;
  winRate3Fold: number;
  streak: number;  // positive = wins, negative = losses
  lastGenerated: string;
}

@Injectable()
export class DailyAccumulatorsService {
  private readonly logger = new Logger('DailyAccumulators');
  private readonly dataDir = join(process.cwd(), 'data');
  private readonly stateFile = join(process.cwd(), 'data', 'daily_accumulators.json');
  private readonly OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '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';
  private readonly OPENROUTER_MODEL = 'google/gemini-2.0-flash-001';

  /**
   * Generate today's accumulator tickets
   */
  async generateDailyTickets(bankroll?: number): Promise<{ ticket2Fold: AccumulatorTicket; ticket3Fold: AccumulatorTicket }> {
    const state = await this.loadState();
    const currentBankroll = bankroll || state.bankroll;
    const today = new Date().toISOString().split('T')[0];

    // Check if already generated today
    const todayTickets = state.history.filter(t => t.date === today);
    if (todayTickets.length >= 2) {
      this.logger.log(`Already generated tickets for ${today}`);
      return {
        ticket2Fold: todayTickets.find(t => t.type === '2-fold')!,
        ticket3Fold: todayTickets.find(t => t.type === '3-fold')!,
      };
    }

    // Fetch today's events
    const events = await this.fetchTodayEvents();
    if (events.length < 5) {
      throw new Error(`Not enough events today (${events.length}). Need at least 5 for safe selection.`);
    }

    // Use AI to select best legs
    const aiPicks = await this.getAIPicks(events, currentBankroll);

    // Calculate stakes based on bankroll
    const stake2Fold = this.calculateStake(currentBankroll, state.stakePercentage2Fold, '2-fold', state);
    const stake3Fold = this.calculateStake(currentBankroll, state.stakePercentage3Fold, '3-fold', state);

    // Build 2-fold ticket (pick 2 safest legs)
    const legs2 = aiPicks.slice(0, 2);
    const combined2 = legs2.reduce((acc, leg) => acc * leg.odds, 1);
    const ticket2Fold: AccumulatorTicket = {
      id: `ACC-2F-${today}-${Date.now()}`,
      type: '2-fold',
      date: today,
      legs: legs2,
      combinedOdds: Math.round(combined2 * 100) / 100,
      stake: stake2Fold,
      potentialReturn: Math.round(stake2Fold * combined2 * 100) / 100,
      potentialProfit: Math.round(stake2Fold * (combined2 - 1) * 100) / 100,
      status: 'pending',
    };

    // Build 3-fold ticket (pick 3 best value legs, can overlap with 2-fold)
    const legs3 = aiPicks.slice(0, 3);
    const combined3 = legs3.reduce((acc, leg) => acc * leg.odds, 1);
    const ticket3Fold: AccumulatorTicket = {
      id: `ACC-3F-${today}-${Date.now()}`,
      type: '3-fold',
      date: today,
      legs: legs3,
      combinedOdds: Math.round(combined3 * 100) / 100,
      stake: stake3Fold,
      potentialReturn: Math.round(stake3Fold * combined3 * 100) / 100,
      potentialProfit: Math.round(stake3Fold * (combined3 - 1) * 100) / 100,
      status: 'pending',
    };

    // Save to state
    state.history.push(ticket2Fold, ticket3Fold);
    state.bankroll = currentBankroll;
    state.lastGenerated = new Date().toISOString();
    await this.saveState(state);

    this.logger.log(`Generated daily tickets: 2-fold @${combined2.toFixed(2)} ($${stake2Fold}), 3-fold @${combined3.toFixed(2)} ($${stake3Fold})`);

    return { ticket2Fold, ticket3Fold };
  }

  /**
   * Calculate stake based on bankroll and performance
   */
  private calculateStake(bankroll: number, basePercentage: number, type: '2-fold' | '3-fold', state: DailyAccumulatorState): number {
    let percentage = basePercentage;

    // Adaptive: reduce after losses, increase after wins
    if (state.streak <= -3) {
      percentage *= 0.5;  // Halve stake after 3+ consecutive losses
    } else if (state.streak <= -1) {
      percentage *= 0.75; // Reduce 25% after any loss streak
    } else if (state.streak >= 3) {
      percentage = Math.min(percentage * 1.25, 3); // Increase max 25%, cap at 3%
    }

    const stake = Math.round(bankroll * (percentage / 100) * 100) / 100;
    
    // Min $10, max 5% of bankroll
    return Math.max(10, Math.min(stake, bankroll * 0.05));
  }

  /**
   * Fetch today's real events from TheSportsDB
   */
  private async fetchTodayEvents(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const allEvents: any[] = [];

    // Top football leagues
    const leagues = [
      '4328', // English Premier League
      '4331', // German Bundesliga  
      '4332', // Italian Serie A
      '4334', // French Ligue 1
      '4335', // Spanish La Liga
      '4336', // Greek Super League
      '4337', // Dutch Eredivisie
      '4344', // Portuguese Primeira Liga
      '4346', // MLS
      '4359', // Chinese Super League
      '4396', // English Championship
      '4399', // Scottish Premiership
    ];

    for (const leagueId of leagues) {
      try {
        const res = await axios.get(
          `https://www.thesportsdb.com/api/v1/json/3/eventsround.php?id=${leagueId}&r=1&s=2025-2026`,
          { timeout: 5000 }
        );
        if (res.data?.events) {
          const todayEvents = res.data.events.filter((e: any) => e.dateEvent === today);
          allEvents.push(...todayEvents);
        }
      } catch {
        // Skip failed leagues
      }
    }

    // Also try events by day endpoint
    try {
      const res = await axios.get(
        `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Soccer`,
        { timeout: 5000 }
      );
      if (res.data?.events) {
        // Deduplicate by event ID
        const existingIds = new Set(allEvents.map((e: any) => e.idEvent));
        for (const event of res.data.events) {
          if (!existingIds.has(event.idEvent)) {
            allEvents.push(event);
          }
        }
      }
    } catch {
      // Fallback failed
    }

    this.logger.log(`Found ${allEvents.length} events for ${today}`);
    return allEvents;
  }

  /**
   * Use OpenRouter AI to pick the best accumulator legs
   */
  private async getAIPicks(events: any[], bankroll: number): Promise<AccumulatorLeg[]> {
    const eventList = events.map((e: any) => 
      `- ${e.strHomeTeam} vs ${e.strAwayTeam} (${e.strLeague}, ${e.dateEvent} ${e.strTime || ''})`
    ).join('\n');

    const prompt = `You are a professional sports betting analyst. Select the 5 BEST picks from today's matches for accumulator bets.

RULES:
1. Pick ONLY from the matches listed below — do NOT invent matches
2. For each pick, choose ONE outcome: Home Win, Away Win, Draw, Over 2.5 Goals, Under 2.5 Goals, BTTS Yes, BTTS No
3. Assign realistic decimal odds (1.20 - 3.50 range for accumulators)
4. For accumulators, prefer safer picks (odds 1.30-1.80) — we want consistent wins
5. Rate confidence 1-10 (8+ means very confident)
6. Give brief reasoning for each pick

TODAY'S MATCHES:
${eventList}

Current bankroll: $${bankroll}

Respond in this EXACT JSON format (no markdown, no code blocks):
[
  {
    "homeTeam": "Team A",
    "awayTeam": "Team B", 
    "league": "League Name",
    "pick": "Home Win",
    "odds": 1.45,
    "confidence": 8,
    "reasoning": "Brief reason"
  }
]

Return exactly 5 picks, sorted by confidence (highest first).`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.OPENROUTER_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content = response.data.choices?.[0]?.message?.content || '';
      
      // Extract JSON from response
      let jsonStr = content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const picks = JSON.parse(jsonStr);
      
      return picks.map((p: any) => ({
        event: `${p.homeTeam} vs ${p.awayTeam}`,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        league: p.league,
        pick: p.pick,
        odds: p.odds,
        confidence: p.confidence,
        reasoning: p.reasoning,
      }));
    } catch (error) {
      this.logger.error(`AI picks failed: ${error.message}`);
      // Fallback: pick from events manually with safe odds
      return this.fallbackPicks(events);
    }
  }

  /**
   * Fallback picks when AI is unavailable
   */
  private fallbackPicks(events: any[]): AccumulatorLeg[] {
    return events.slice(0, 5).map((e: any) => ({
      event: `${e.strHomeTeam} vs ${e.strAwayTeam}`,
      homeTeam: e.strHomeTeam,
      awayTeam: e.strAwayTeam,
      league: e.strLeague,
      pick: 'Over 2.5 Goals',  // Safe default
      odds: 1.75,
      confidence: 6,
      reasoning: 'Fallback pick — AI unavailable',
    }));
  }

  /**
   * Resolve yesterday's tickets with actual results
   */
  async resolveTickets(date?: string): Promise<any> {
    const state = await this.loadState();
    const targetDate = date || this.getYesterdayDate();
    
    const pendingTickets = state.history.filter(t => t.date === targetDate && t.status === 'pending');
    if (pendingTickets.length === 0) {
      return { message: `No pending tickets for ${targetDate}` };
    }

    const results: any[] = [];

    for (const ticket of pendingTickets) {
      let legsWon = 0;
      let legsLost = 0;

      // Try to fetch results for each leg
      for (const leg of ticket.legs) {
        const result = await this.checkLegResult(leg, targetDate);
        if (result === 'won') legsWon++;
        else if (result === 'lost') legsLost++;
        // void legs don't count either way
      }

      const allWon = legsWon === ticket.legs.length;
      ticket.status = allWon ? 'won' : (legsLost > 0 ? 'lost' : 'partial');
      ticket.result = {
        legsWon,
        legsLost,
        actualReturn: allWon ? ticket.potentialReturn : 0,
        pnl: allWon ? ticket.potentialProfit : -ticket.stake,
      };

      // Update bankroll
      state.bankroll += ticket.result.pnl;
      state.totalPnl += ticket.result.pnl;

      // Update win rates
      const type = ticket.type;
      const typeTickets = state.history.filter(t => t.type === type && t.status !== 'pending');
      const typeWins = typeTickets.filter(t => t.status === 'won').length;
      if (type === '2-fold') state.winRate2Fold = typeTickets.length > 0 ? (typeWins / typeTickets.length) * 100 : 0;
      if (type === '3-fold') state.winRate3Fold = typeTickets.length > 0 ? (typeWins / typeTickets.length) * 100 : 0;

      results.push({
        ticketId: ticket.id,
        type: ticket.type,
        status: ticket.status,
        legsWon,
        legsLost,
        pnl: ticket.result.pnl,
      });
    }

    // Update streak
    const recentResults = state.history
      .filter(t => t.status === 'won' || t.status === 'lost')
      .slice(-10);
    
    let streak = 0;
    for (let i = recentResults.length - 1; i >= 0; i--) {
      if (i === recentResults.length - 1) {
        streak = recentResults[i].status === 'won' ? 1 : -1;
      } else if ((streak > 0 && recentResults[i].status === 'won') || (streak < 0 && recentResults[i].status === 'lost')) {
        streak += streak > 0 ? 1 : -1;
      } else break;
    }
    state.streak = streak;

    await this.saveState(state);

    return {
      date: targetDate,
      results,
      bankroll: state.bankroll,
      totalPnl: state.totalPnl,
      streak: state.streak,
    };
  }

  /**
   * Check if a single leg won or lost
   */
  private async checkLegResult(leg: AccumulatorLeg, date: string): Promise<'won' | 'lost' | 'void'> {
    try {
      // Search for the match result on TheSportsDB
      const searchQuery = encodeURIComponent(`${leg.homeTeam} vs ${leg.awayTeam}`);
      const res = await axios.get(
        `https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${searchQuery}&d=${date}`,
        { timeout: 5000 }
      );

      const events = res.data?.event;
      if (!events || events.length === 0) return 'void';

      const match = events[0];
      const homeScore = parseInt(match.intHomeScore);
      const awayScore = parseInt(match.intAwayScore);

      if (isNaN(homeScore) || isNaN(awayScore)) return 'void'; // Not finished yet

      const totalGoals = homeScore + awayScore;
      const pick = leg.pick.toLowerCase();

      if (pick.includes('home win')) return homeScore > awayScore ? 'won' : 'lost';
      if (pick.includes('away win')) return awayScore > homeScore ? 'won' : 'lost';
      if (pick.includes('draw')) return homeScore === awayScore ? 'won' : 'lost';
      if (pick.includes('over 2.5')) return totalGoals >= 3 ? 'won' : 'lost';
      if (pick.includes('under 2.5')) return totalGoals < 3 ? 'won' : 'lost';
      if (pick.includes('btts yes')) return (homeScore > 0 && awayScore > 0) ? 'won' : 'lost';
      if (pick.includes('btts no')) return (homeScore === 0 || awayScore === 0) ? 'won' : 'lost';

      return 'void';
    } catch {
      return 'void';
    }
  }

  /**
   * Get current status and today's tickets
   */
  async getStatus(): Promise<any> {
    const state = await this.loadState();
    const today = new Date().toISOString().split('T')[0];
    const todayTickets = state.history.filter(t => t.date === today);

    return {
      bankroll: state.bankroll,
      totalPnl: state.totalPnl,
      streak: state.streak,
      winRate2Fold: Math.round(state.winRate2Fold * 10) / 10,
      winRate3Fold: Math.round(state.winRate3Fold * 10) / 10,
      todayTickets,
      totalTickets: state.history.length,
      stakeConfig: {
        '2-fold': `${state.stakePercentage2Fold}% of bankroll`,
        '3-fold': `${state.stakePercentage3Fold}% of bankroll`,
      },
    };
  }

  /**
   * Get full ticket history
   */
  async getHistory(limit: number = 20): Promise<AccumulatorTicket[]> {
    const state = await this.loadState();
    return state.history.slice(-limit);
  }

  /**
   * Update bankroll (e.g., after deposit or manual adjustment)
   */
  async updateBankroll(newBankroll: number): Promise<any> {
    const state = await this.loadState();
    const oldBankroll = state.bankroll;
    state.bankroll = newBankroll;
    await this.saveState(state);
    return { oldBankroll, newBankroll, difference: newBankroll - oldBankroll };
  }

  private getYesterdayDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  private async loadState(): Promise<DailyAccumulatorState> {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      const defaultState: DailyAccumulatorState = {
        bankroll: 9975, // After Day 1 trial
        stakePercentage2Fold: 2,    // 2% for 2-fold
        stakePercentage3Fold: 1.5,  // 1.5% for 3-fold
        history: [],
        totalPnl: 0,
        winRate2Fold: 0,
        winRate3Fold: 0,
        streak: 0,
        lastGenerated: '',
      };
      await this.saveState(defaultState);
      return defaultState;
    }
  }

  private async saveState(state: DailyAccumulatorState): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
  }
}
