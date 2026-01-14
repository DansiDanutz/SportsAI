export type FlashscoreMatchStatus = 'scheduled' | 'live' | 'finished' | 'unknown';

export interface FlashscoreMatch {
  url: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: FlashscoreMatchStatus;
  startTime?: string;
  tournament?: string;
  scrapedAt: string;
}

