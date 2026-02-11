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
  type: 'odds-2' | 'odds-3';  // Target minimum combined odds
  targetMinOdds: number;
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
  stakePercentageOdds2: number;  // % of bankroll for odds-2 ticket (default 2%)
  stakePercentageOdds3: number;  // % of bankroll for odds-3 ticket (default 1.5%)
  history: AccumulatorTicket[];
  totalPnl: number;
  winRateOdds2: number;
  winRateOdds3: number;
  streak: number;  // positive = wins, negative = losses
  lastGenerated: string;
}

@Injectable()
export class DailyAccumulatorsService {
  private readonly logger = new Logger('DailyAccumulators');
  private readonly dataDir = join(process.cwd(), 'data');
  private readonly stateFile = join(process.cwd(), 'data', 'daily_accumulators.json');
  private readonly OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
  private readonly OPENROUTER_MODEL = 'google/gemini-2.0-flash-001';

  /**
   * Generate today's accumulator tickets
   * - Ticket 1: combined odds >= 2.00 (use however many legs needed)
   * - Ticket 2: combined odds >= 3.00 (use however many legs needed)
   * Stakes adapt daily based on current bankroll.
   */
  async generateDailyTickets(bankroll?: number): Promise<{ ticketOdds2: AccumulatorTicket; ticketOdds3: AccumulatorTicket }> {
    const state = await this.loadState();
    const currentBankroll = bankroll || state.bankroll;
    const today = new Date().toISOString().split('T')[0];

    // Check if already generated today
    const todayTickets = state.history.filter(t => t.date === today);
    if (todayTickets.length >= 2) {
      this.logger.log(`Already generated tickets for ${today}`);
      return {
        ticketOdds2: todayTickets.find(t => t.type === 'odds-2')!,
        ticketOdds3: todayTickets.find(t => t.type === 'odds-3')!,
      };
    }

    // Fetch today's events
    const events = await this.fetchTodayEvents();
    if (events.length < 3) {
      throw new Error(`Not enough events today (${events.length}). Need at least 3 for accumulator selection.`);
    }

    // Use AI to select best legs — ask for enough picks to build both tickets
    const aiPicks = await this.getAIPicks(events, currentBankroll);

    // Build Ticket 1: combined odds >= 2.00
    const legsOdds2 = this.buildTicketToTargetOdds(aiPicks, 2.0);
    const combined2 = legsOdds2.reduce((acc, leg) => acc * leg.odds, 1);
    const stakeOdds2 = this.calculateStake(currentBankroll, state.stakePercentageOdds2, 'odds-2', state);

    const ticketOdds2: AccumulatorTicket = {
      id: `ACC-O2-${today}-${Date.now()}`,
      type: 'odds-2',
      targetMinOdds: 2.0,
      date: today,
      legs: legsOdds2,
      combinedOdds: Math.round(combined2 * 100) / 100,
      stake: stakeOdds2,
      potentialReturn: Math.round(stakeOdds2 * combined2 * 100) / 100,
      potentialProfit: Math.round(stakeOdds2 * (combined2 - 1) * 100) / 100,
      status: 'pending',
    };

    // Build Ticket 2: combined odds >= 3.00
    const legsOdds3 = this.buildTicketToTargetOdds(aiPicks, 3.0);
    const combined3 = legsOdds3.reduce((acc, leg) => acc * leg.odds, 1);
    const stakeOdds3 = this.calculateStake(currentBankroll, state.stakePercentageOdds3, 'odds-3', state);

    const ticketOdds3: AccumulatorTicket = {
      id: `ACC-O3-${today}-${Date.now()}`,
      type: 'odds-3',
      targetMinOdds: 3.0,
      date: today,
      legs: legsOdds3,
      combinedOdds: Math.round(combined3 * 100) / 100,
      stake: stakeOdds3,
      potentialReturn: Math.round(stakeOdds3 * combined3 * 100) / 100,
      potentialProfit: Math.round(stakeOdds3 * (combined3 - 1) * 100) / 100,
      status: 'pending',
    };

    // Save to state
    state.history.push(ticketOdds2, ticketOdds3);
    state.bankroll = currentBankroll;
    state.lastGenerated = new Date().toISOString();
    await this.saveState(state);

    this.logger.log(`Generated daily tickets: odds-2 @${combined2.toFixed(2)} ($${stakeOdds2}), odds-3 @${combined3.toFixed(2)} ($${stakeOdds3})`);

    return { ticketOdds2, ticketOdds3 };
  }

  /**
   * Build an accumulator by adding legs until combined odds >= target
   * Picks the highest-confidence legs first, keeps adding until target reached.
   */
  private buildTicketToTargetOdds(allPicks: AccumulatorLeg[], targetOdds: number): AccumulatorLeg[] {
    // Sort by confidence descending (safest picks first)
    const sorted = [...allPicks].sort((a, b) => b.confidence - a.confidence);
    const selected: AccumulatorLeg[] = [];
    let currentOdds = 1.0;

    for (const pick of sorted) {
      selected.push(pick);
      currentOdds *= pick.odds;
      if (currentOdds >= targetOdds) break;
    }

    // If we still haven't reached the target, that's the best we can do
    if (currentOdds < targetOdds) {
      this.logger.warn(`Could only reach combined odds ${currentOdds.toFixed(2)} (target: ${targetOdds})`);
    }

    return selected;
  }

  /**
   * Calculate stake based on bankroll and performance
   */
  private calculateStake(bankroll: number, basePercentage: number, type: 'odds-2' | 'odds-3', state: DailyAccumulatorState): number {
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

    const prompt = `You are a professional sports betting analyst. We need picks for TWO daily accumulator tickets:
- Ticket 1: combined odds must reach at least 2.00
- Ticket 2: combined odds must reach at least 3.00

Select 6-8 STRONG picks from today's matches. We'll combine them to hit the target odds.

RULES:
1. Pick ONLY from the matches listed below — do NOT invent matches
2. For each pick, choose ONE outcome: Home Win, Away Win, Draw, Over 2.5 Goals, Under 2.5 Goals, BTTS Yes, BTTS No
3. Assign REALISTIC decimal odds based on the teams and league context
4. Mix safe picks (1.25-1.60) with value picks (1.60-2.50) so we can build both tickets
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

Return 6-8 picks, sorted by confidence (highest first).`;

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
      if (type === 'odds-2') state.winRateOdds2 = typeTickets.length > 0 ? (typeWins / typeTickets.length) * 100 : 0;
      if (type === 'odds-3') state.winRateOdds3 = typeTickets.length > 0 ? (typeWins / typeTickets.length) * 100 : 0;

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
      winRateOdds2: Math.round(state.winRateOdds2 * 10) / 10,
      winRateOdds3: Math.round(state.winRateOdds3 * 10) / 10,
      todayTickets,
      totalTickets: state.history.length,
      stakeConfig: {
        'odds-2': `${state.stakePercentageOdds2}% of bankroll`,
        'odds-3': `${state.stakePercentageOdds3}% of bankroll`,
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
        stakePercentageOdds2: 2,    // 2% for odds-2 ticket
        stakePercentageOdds3: 1.5,  // 1.5% for odds-3 ticket
        history: [],
        totalPnl: 0,
        winRateOdds2: 0,
        winRateOdds3: 0,
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
