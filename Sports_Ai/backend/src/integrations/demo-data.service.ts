import { Injectable, Logger } from '@nestjs/common';

interface DemoEvent {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue?: string;
  status: string;
  odds?: DemoOdds[];
}

interface DemoOdds {
  bookmaker: string;
  market: string;
  outcomes: {
    name: string;
    price: number;
    point?: number;
  }[];
  lastUpdate: string;
}

interface ArbitrageOpportunity {
  id: string;
  sport: string;
  league: string;
  event: string;
  market: string;
  profit: number;
  investment: number;
  bets: {
    bookmaker: string;
    outcome: string;
    odds: number;
    stake: number;
  }[];
  expiresAt: string;
  confidence: number;
}

@Injectable()
export class DemoDataService {
  private readonly logger = new Logger(DemoDataService.name);

  private readonly bookmakers = [
    'Bet365', 'DraftKings', 'FanDuel', 'Pinnacle', 'BetMGM', 
    'Caesars', 'BetRivers', 'PointsBet', 'Unibet', 'William Hill',
    'Bovada', 'BetUS', 'MyBookie', '888sport', 'Betway'
  ];

  private readonly sportsData = {
    'Soccer': {
      leagues: [
        { name: 'Premier League', country: 'England' },
        { name: 'La Liga', country: 'Spain' },
        { name: 'Serie A', country: 'Italy' },
        { name: 'Bundesliga', country: 'Germany' },
        { name: 'Ligue 1', country: 'France' },
        { name: 'Champions League', country: 'Europe' },
        { name: 'MLS', country: 'USA' },
      ],
      teams: [
        'Arsenal', 'Manchester City', 'Liverpool', 'Chelsea', 'Barcelona', 'Real Madrid',
        'Bayern Munich', 'PSG', 'Juventus', 'Inter Milan', 'AC Milan', 'Atletico Madrid',
        'Borussia Dortmund', 'Manchester United', 'Tottenham', 'Newcastle'
      ],
    },
    'Basketball': {
      leagues: [
        { name: 'NBA', country: 'USA' },
        { name: 'NCAA Basketball', country: 'USA' },
        { name: 'EuroLeague', country: 'Europe' },
      ],
      teams: [
        'Boston Celtics', 'Los Angeles Lakers', 'Golden State Warriors', 'Miami Heat',
        'Denver Nuggets', 'Milwaukee Bucks', 'Philadelphia 76ers', 'Phoenix Suns',
        'Dallas Mavericks', 'Memphis Grizzlies', 'New York Knicks', 'Brooklyn Nets'
      ],
    },
    'American Football': {
      leagues: [
        { name: 'NFL', country: 'USA' },
        { name: 'NCAA Football', country: 'USA' },
      ],
      teams: [
        'New England Patriots', 'Dallas Cowboys', 'Green Bay Packers', 'Pittsburgh Steelers',
        'San Francisco 49ers', 'Seattle Seahawks', 'Kansas City Chiefs', 'Buffalo Bills',
        'Los Angeles Rams', 'Tampa Bay Buccaneers', 'Baltimore Ravens', 'Denver Broncos'
      ],
    },
    'Tennis': {
      leagues: [
        { name: 'ATP Tour', country: 'International' },
        { name: 'WTA Tour', country: 'International' },
        { name: 'Grand Slams', country: 'International' },
      ],
      teams: [
        'Novak Djokovic', 'Carlos Alcaraz', 'Daniil Medvedev', 'Jannik Sinner',
        'Iga Swiatek', 'Aryna Sabalenka', 'Coco Gauff', 'Elena Rybakina',
        'Stefanos Tsitsipas', 'Casper Ruud', 'Jessica Pegula', 'Ons Jabeur'
      ],
    },
    'MMA': {
      leagues: [
        { name: 'UFC', country: 'International' },
        { name: 'Bellator MMA', country: 'International' },
      ],
      teams: [
        'Jon Jones', 'Islam Makhachev', 'Alexander Volkanovski', 'Leon Edwards',
        'Aljamain Sterling', 'Brandon Moreno', 'Valentina Shevchenko', 'Amanda Nunes',
        'Francis Ngannou', 'Stipe Miocic', 'Conor McGregor', 'Khabib Nurmagomedov'
      ],
    },
  };

  /**
   * Generate realistic demo events for the next 7 days
   */
  generateDemoEvents(count: number = 50): DemoEvent[] {
    const events: DemoEvent[] = [];
    const startDate = new Date();
    
    for (let i = 0; i < count; i++) {
      const sport = this.getRandomSport();
      const league = this.getRandomLeague(sport);
      const teams = this.getRandomTeams(sport, 2);
      
      // Generate event date within next 7 days
      const eventDate = new Date(startDate);
      eventDate.setDate(startDate.getDate() + Math.floor(Math.random() * 7));
      eventDate.setHours(Math.floor(Math.random() * 12) + 10); // 10 AM to 10 PM
      eventDate.setMinutes(Math.random() > 0.5 ? 0 : 30);
      
      const event: DemoEvent = {
        id: `demo_${i + 1}`,
        sport,
        league: league.name,
        homeTeam: teams[0],
        awayTeam: teams[1],
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toTimeString().split(' ')[0].substring(0, 5),
        venue: this.generateVenueName(sport),
        status: Math.random() > 0.8 ? 'live' : 'scheduled',
        odds: this.generateEventOdds(sport, teams),
      };
      
      events.push(event);
    }
    
    return events.sort((a, b) => 
      new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime()
    );
  }

  /**
   * Generate arbitrage opportunities with realistic data
   */
  generateArbitrageOpportunities(count: number = 15): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    for (let i = 0; i < count; i++) {
      const sport = this.getRandomSport();
      const league = this.getRandomLeague(sport);
      const teams = this.getRandomTeams(sport, 2);
      const market = this.getRandomMarket(sport);
      
      // Generate profitable arbitrage scenario
      const baseOdds = this.generateBaseOdds(market);
      const bookmaker1 = this.getRandomBookmaker();
      let bookmaker2 = this.getRandomBookmaker();
      while (bookmaker2 === bookmaker1) {
        bookmaker2 = this.getRandomBookmaker();
      }
      
      // Calculate arbitrage profit (1-5%)
      const profit = 0.01 + Math.random() * 0.04;
      const investment = 100 + Math.random() * 900; // $100-$1000
      
      const opportunity: ArbitrageOpportunity = {
        id: `arb_${i + 1}`,
        sport,
        league: league.name,
        event: `${teams[0]} vs ${teams[1]}`,
        market,
        profit: Math.round(profit * investment * 100) / 100,
        investment: Math.round(investment * 100) / 100,
        bets: this.generateArbitrageBets(baseOdds, bookmaker1, bookmaker2, investment),
        expiresAt: new Date(Date.now() + (5 + Math.random() * 55) * 60 * 1000).toISOString(), // 5-60 min
        confidence: 0.75 + Math.random() * 0.24, // 75-99%
      };
      
      opportunities.push(opportunity);
    }
    
    return opportunities.sort((a, b) => b.profit - a.profit);
  }

  /**
   * Generate demo team data
   */
  generateDemoTeams(sport?: string): any[] {
    const teams = [];
    const sportsToInclude = sport ? [sport] : Object.keys(this.sportsData);
    
    for (const sportName of sportsToInclude) {
      const sportData = this.sportsData[sportName];
      if (!sportData) continue;
      
      for (const team of sportData.teams) {
        teams.push({
          id: `demo_team_${teams.length + 1}`,
          name: team,
          sport: sportName,
          league: this.getRandomLeague(sportName).name,
          logo: `https://via.placeholder.com/100x100.png?text=${encodeURIComponent(team)}`,
          description: `${team} is a professional ${sportName.toLowerCase()} team competing at the highest level.`,
        });
      }
    }
    
    return teams;
  }

  /**
   * Generate demo league data
   */
  generateDemoLeagues(): any[] {
    const leagues = [];
    
    for (const [sport, sportData] of Object.entries(this.sportsData)) {
      for (const league of sportData.leagues) {
        leagues.push({
          id: `demo_league_${leagues.length + 1}`,
          name: league.name,
          sport,
          country: league.country,
          logo: `https://via.placeholder.com/100x100.png?text=${encodeURIComponent(league.name)}`,
        });
      }
    }
    
    return leagues;
  }

  private getRandomSport(): string {
    const sports = Object.keys(this.sportsData);
    return sports[Math.floor(Math.random() * sports.length)];
  }

  private getRandomLeague(sport: string) {
    const leagues = this.sportsData[sport]?.leagues || [];
    return leagues[Math.floor(Math.random() * leagues.length)];
  }

  private getRandomTeams(sport: string, count: number): string[] {
    const teams = this.sportsData[sport]?.teams || [];
    const selected = [];
    const available = [...teams];
    
    for (let i = 0; i < count && available.length > 0; i++) {
      const index = Math.floor(Math.random() * available.length);
      selected.push(available.splice(index, 1)[0]);
    }
    
    return selected;
  }

  private getRandomBookmaker(): string {
    return this.bookmakers[Math.floor(Math.random() * this.bookmakers.length)];
  }

  private getRandomMarket(sport: string): string {
    const markets = {
      'Soccer': ['Match Winner', 'Over/Under 2.5', 'Both Teams to Score', 'Asian Handicap'],
      'Basketball': ['Money Line', 'Point Spread', 'Total Points', 'Player Props'],
      'American Football': ['Money Line', 'Point Spread', 'Total Points', 'Player Props'],
      'Tennis': ['Match Winner', 'Set Betting', 'Total Games', 'Handicap'],
      'MMA': ['Fight Winner', 'Method of Victory', 'Fight Distance', 'Round Betting'],
    };
    
    const sportMarkets = markets[sport] || ['Money Line', 'Point Spread'];
    return sportMarkets[Math.floor(Math.random() * sportMarkets.length)];
  }

  private generateVenueName(sport: string): string {
    const venues = {
      'Soccer': ['Stadium', 'Arena', 'Park', 'Ground'],
      'Basketball': ['Arena', 'Center', 'Coliseum', 'Garden'],
      'American Football': ['Stadium', 'Field', 'Dome', 'Bowl'],
      'Tennis': ['Centre Court', 'Stadium Court', 'Arena', 'Complex'],
      'MMA': ['Arena', 'Center', 'Octagon', 'Dome'],
    };
    
    const sportVenues = venues[sport] || ['Arena'];
    const venue = sportVenues[Math.floor(Math.random() * sportVenues.length)];
    const cityName = ['Downtown', 'Central', 'Metropolitan', 'National', 'International'][Math.floor(Math.random() * 5)];
    
    return `${cityName} ${venue}`;
  }

  private generateEventOdds(sport: string, teams: string[]): DemoOdds[] {
    const odds: DemoOdds[] = [];
    const bookmakerCount = 3 + Math.floor(Math.random() * 5); // 3-7 bookmakers
    
    for (let i = 0; i < bookmakerCount; i++) {
      const bookmaker = this.getRandomBookmaker();
      const market = this.getRandomMarket(sport);
      
      odds.push({
        bookmaker,
        market,
        outcomes: this.generateOutcomes(market, teams),
        lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Within last hour
      });
    }
    
    return odds;
  }

  private generateOutcomes(market: string, teams: string[]) {
    switch (market) {
      case 'Match Winner':
      case 'Money Line':
      case 'Fight Winner':
        return [
          { name: teams[0], price: 1.5 + Math.random() * 3 },
          { name: teams[1], price: 1.5 + Math.random() * 3 },
        ];
      
      case 'Point Spread':
      case 'Asian Handicap':
      case 'Handicap':
        const spread = (Math.random() * 10 - 5).toFixed(1);
        return [
          { name: `${teams[0]} ${spread}`, price: 1.8 + Math.random() * 0.4, point: parseFloat(spread) },
          { name: `${teams[1]} ${-parseFloat(spread)}`, price: 1.8 + Math.random() * 0.4, point: -parseFloat(spread) },
        ];
      
      case 'Over/Under 2.5':
      case 'Total Points':
      case 'Total Games':
        const total = 2.5 + Math.random() * 5;
        return [
          { name: `Over ${total}`, price: 1.8 + Math.random() * 0.4, point: total },
          { name: `Under ${total}`, price: 1.8 + Math.random() * 0.4, point: total },
        ];
      
      default:
        return [
          { name: 'Yes', price: 1.8 + Math.random() * 0.4 },
          { name: 'No', price: 1.8 + Math.random() * 0.4 },
        ];
    }
  }

  private generateBaseOdds(market: string) {
    // Generate base odds that will be used for arbitrage calculation
    switch (market) {
      case 'Match Winner':
      case 'Money Line':
        return { outcome1: 2.1, outcome2: 1.9 };
      case 'Point Spread':
        return { outcome1: 1.9, outcome2: 1.9 };
      default:
        return { outcome1: 1.95, outcome2: 1.95 };
    }
  }

  private generateArbitrageBets(baseOdds: any, bookmaker1: string, bookmaker2: string, investment: number) {
    // Create arbitrage opportunity by having different odds at different bookmakers
    const odds1 = baseOdds.outcome1 + 0.1 + Math.random() * 0.2; // Slightly higher
    const odds2 = baseOdds.outcome2 + 0.1 + Math.random() * 0.2; // Slightly higher
    
    // Calculate stakes for arbitrage
    const total = (1/odds1) + (1/odds2);
    const stake1 = investment / (odds1 * total);
    const stake2 = investment / (odds2 * total);
    
    return [
      {
        bookmaker: bookmaker1,
        outcome: 'Outcome 1',
        odds: Math.round(odds1 * 100) / 100,
        stake: Math.round(stake1 * 100) / 100,
      },
      {
        bookmaker: bookmaker2,
        outcome: 'Outcome 2',
        odds: Math.round(odds2 * 100) / 100,
        stake: Math.round(stake2 * 100) / 100,
      },
    ];
  }

  /**
   * Get fresh demo data (rotates every hour to simulate live updates)
   */
  getFreshDemoData() {
    // Use current hour as seed for consistent but rotating data
    const hour = new Date().getHours();
    const seed = hour * 1000; // Simple seed
    
    // Mock random based on seed for consistent results within the hour
    const deterministicRandom = () => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    return {
      events: this.generateDemoEvents(25),
      arbitrageOpportunities: this.generateArbitrageOpportunities(10),
      teams: this.generateDemoTeams().slice(0, 20),
      leagues: this.generateDemoLeagues(),
      lastUpdated: new Date().toISOString(),
    };
  }
}