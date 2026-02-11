import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OpenrouterService } from './openrouter.service';
import { OddsService } from '../odds/odds.service';

interface MatchPrediction {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  predictions: {
    homeWinProbability: number;
    awayWinProbability: number;
    drawProbability?: number;
    overUnder25Goals?: {
      over: number;
      under: number;
    };
  };
  confidence: number;
  reasoning: string;
  valueBets: ValueBet[];
  aiModel: string;
  timestamp: string;
}

interface ValueBet {
  outcome: string;
  aiProbability: number;
  bestOdds: number;
  bookmaker: string;
  expectedValue: number;
  kellyPercentage: number;
  isValueBet: boolean;
}

interface HistoricalData {
  homeTeam: {
    recentForm: string[];
    averageGoalsFor: number;
    averageGoalsAgainst: number;
    homeRecord: { wins: number; draws: number; losses: number };
  };
  awayTeam: {
    recentForm: string[];
    averageGoalsFor: number;
    averageGoalsAgainst: number;
    awayRecord: { wins: number; draws: number; losses: number };
  };
  headToHead: {
    totalMeetings: number;
    homeTeamWins: number;
    awayTeamWins: number;
    draws: number;
    averageGoals: number;
  };
}

@Injectable()
export class AiPredictorService {
  private readonly logger = new Logger(AiPredictorService.name);
  private readonly openRouterApiKey = process.env.OPENROUTER_API_KEY || '';

  constructor(
    private prisma: PrismaService,
    private openrouterService: OpenrouterService,
    private oddsService: OddsService,
    private configService: ConfigService
  ) {}

  /**
   * Generate AI prediction for a specific match
   */
  async predictMatch(eventId: string): Promise<MatchPrediction> {
    this.logger.log(`Generating AI prediction for event: ${eventId}`);
    
    try {
      // Get event details
      const event = await this.getEventDetails(eventId);
      if (!event) {
        throw new HttpException(`Event ${eventId} not found`, HttpStatus.NOT_FOUND);
      }

      // Get historical data for both teams
      const historicalData = await this.getHistoricalData(event.homeTeam, event.awayTeam, event.sport);

      // Get current odds for value betting analysis
      const currentOdds = await this.oddsService.getBestOdds(eventId);

      // Generate AI prediction using OpenRouter
      const aiPrediction = await this.generateAiPrediction(event, historicalData);

      // Calculate value bets
      const valueBets = this.calculateValueBets(aiPrediction.predictions, currentOdds);

      const result: MatchPrediction = {
        eventId,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        sport: event.sport,
        predictions: aiPrediction.predictions,
        confidence: aiPrediction.confidence,
        reasoning: aiPrediction.reasoning,
        valueBets,
        aiModel: 'google/gemini-2.0-flash-001',
        timestamp: new Date().toISOString()
      };

      // Store prediction in database
      await this.storePrediction(result);

      return result;
    } catch (error) {
      this.logger.error(`Failed to predict match ${eventId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate AI prediction using OpenRouter API
   */
  private async generateAiPrediction(event: any, historicalData: HistoricalData): Promise<{
    predictions: any;
    confidence: number;
    reasoning: string;
  }> {
    const prompt = this.buildPredictionPrompt(event, historicalData);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openRouterApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'system',
            content: 'You are an expert sports betting analyst with deep knowledge of football analytics, team performance patterns, and match prediction models. Provide detailed, data-driven predictions in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent predictions
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new HttpException(`OpenRouter API error: ${response.statusText}`, HttpStatus.BAD_GATEWAY);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new HttpException('No prediction received from AI', HttpStatus.BAD_GATEWAY);
    }

    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      this.logger.error(`Failed to parse AI response: ${parseError.message}\nResponse: ${content}`);
      
      // Fallback: extract numbers manually
      return this.parseAiResponseManually(content);
    }
  }

  /**
   * Build detailed prompt for AI prediction
   */
  private buildPredictionPrompt(event: any, historicalData: HistoricalData): string {
    return `
Analyze the upcoming ${event.sport} match and provide a detailed prediction:

**Match:** ${event.homeTeam} vs ${event.awayTeam}
**Date:** ${event.startTime}
**Venue:** Home (${event.homeTeam})

**Team Statistics:**

${event.homeTeam} (Home):
- Recent form: ${historicalData.homeTeam.recentForm.join(', ')}
- Goals per game: ${historicalData.homeTeam.averageGoalsFor.toFixed(2)}
- Goals conceded per game: ${historicalData.homeTeam.averageGoalsAgainst.toFixed(2)}
- Home record: ${historicalData.homeTeam.homeRecord.wins}W-${historicalData.homeTeam.homeRecord.draws}D-${historicalData.homeTeam.homeRecord.losses}L

${event.awayTeam} (Away):
- Recent form: ${historicalData.awayTeam.recentForm.join(', ')}
- Goals per game: ${historicalData.awayTeam.averageGoalsFor.toFixed(2)}
- Goals conceded per game: ${historicalData.awayTeam.averageGoalsAgainst.toFixed(2)}
- Away record: ${historicalData.awayTeam.awayRecord.wins}W-${historicalData.awayTeam.awayRecord.draws}D-${historicalData.awayTeam.awayRecord.losses}L

**Head-to-Head:**
- Total meetings: ${historicalData.headToHead.totalMeetings}
- ${event.homeTeam} wins: ${historicalData.headToHead.homeTeamWins}
- ${event.awayTeam} wins: ${historicalData.headToHead.awayTeamWins}
- Draws: ${historicalData.headToHead.draws}
- Average goals per meeting: ${historicalData.headToHead.averageGoals.toFixed(2)}

Please provide your analysis in the following JSON format:
{
  "predictions": {
    "homeWinProbability": 0.35,
    "awayWinProbability": 0.40,
    "drawProbability": 0.25,
    "overUnder25Goals": {
      "over": 0.60,
      "under": 0.40
    }
  },
  "confidence": 0.75,
  "reasoning": "Detailed explanation of your analysis considering recent form, head-to-head record, home advantage, attacking/defensive strengths, etc."
}

Ensure probabilities sum to 1.0 and confidence is between 0.5-0.95. Be specific about key factors influencing your prediction.
`;
  }

  /**
   * Fallback parser if JSON parsing fails
   */
  private parseAiResponseManually(content: string): any {
    const defaultPrediction = {
      predictions: {
        homeWinProbability: 0.33,
        awayWinProbability: 0.33,
        drawProbability: 0.34,
        overUnder25Goals: {
          over: 0.55,
          under: 0.45
        }
      },
      confidence: 0.65,
      reasoning: 'AI prediction parsing failed. Using default balanced prediction.'
    };

    try {
      // Try to extract probabilities from text
      const homeMatch = content.match(/home.*?(\d+\.?\d*)%?/i);
      const awayMatch = content.match(/away.*?(\d+\.?\d*)%?/i);
      const drawMatch = content.match(/draw.*?(\d+\.?\d*)%?/i);
      
      if (homeMatch && awayMatch) {
        const home = parseFloat(homeMatch[1]) / (homeMatch[1].includes('.') ? 1 : 100);
        const away = parseFloat(awayMatch[1]) / (awayMatch[1].includes('.') ? 1 : 100);
        const draw = drawMatch ? parseFloat(drawMatch[1]) / (drawMatch[1].includes('.') ? 1 : 100) : 0.25;
        
        // Normalize to sum to 1
        const total = home + away + draw;
        defaultPrediction.predictions.homeWinProbability = home / total;
        defaultPrediction.predictions.awayWinProbability = away / total;
        defaultPrediction.predictions.drawProbability = draw / total;
        defaultPrediction.reasoning = 'Parsed from AI text response: ' + content.substring(0, 200) + '...';
      }
    } catch (error) {
      this.logger.warn(`Manual parsing also failed: ${error.message}`);
    }

    return defaultPrediction;
  }

  /**
   * Calculate value bets based on AI predictions vs bookmaker odds
   */
  private calculateValueBets(predictions: any, bookmakerOdds: any[]): ValueBet[] {
    const valueBets: ValueBet[] = [];
    
    if (!bookmakerOdds || bookmakerOdds.length === 0) {
      return valueBets;
    }

    // Find the best odds for each outcome
    const bestHomeOdds = Math.max(...bookmakerOdds.filter(o => o.market === 'h2h' && o.outcome === 'home').map(o => o.odds));
    const bestAwayOdds = Math.max(...bookmakerOdds.filter(o => o.market === 'h2h' && o.outcome === 'away').map(o => o.odds));
    const bestDrawOdds = Math.max(...bookmakerOdds.filter(o => o.market === 'h2h' && o.outcome === 'draw').map(o => o.odds));

    // Calculate expected value for each outcome
    const outcomes = [
      { outcome: 'home', probability: predictions.homeWinProbability, odds: bestHomeOdds },
      { outcome: 'away', probability: predictions.awayWinProbability, odds: bestAwayOdds },
      { outcome: 'draw', probability: predictions.drawProbability, odds: bestDrawOdds }
    ].filter(o => o.odds && o.odds > 0);

    for (const outcome of outcomes) {
      const expectedValue = (outcome.probability * outcome.odds) - 1;
      const kellyPercentage = Math.max(0, (outcome.probability * outcome.odds - 1) / (outcome.odds - 1)) * 100;
      const isValueBet = expectedValue > 0.05; // 5% minimum edge

      const bookmakerName = bookmakerOdds.find(o => 
        o.market === 'h2h' && 
        o.outcome === outcome.outcome && 
        o.odds === outcome.odds
      )?.bookmaker || 'Unknown';

      valueBets.push({
        outcome: outcome.outcome,
        aiProbability: outcome.probability,
        bestOdds: outcome.odds,
        bookmaker: bookmakerName,
        expectedValue,
        kellyPercentage: Math.round(kellyPercentage * 100) / 100,
        isValueBet
      });
    }

    return valueBets.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  /**
   * Get event details from database or API
   */
  private async getEventDetails(eventId: string): Promise<any> {
    // Try to find in database first
    const dbEvent = await this.prisma.event.findUnique({
      where: { id: eventId }
    });

    if (dbEvent) {
      return dbEvent;
    }

    // If not found, check if it's in the live odds data
    const oddsData = await this.oddsService.getLiveOdds();
    const event = oddsData.find(e => e.eventId === eventId);
    
    if (!event) {
      return null;
    }

    return {
      id: eventId,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      sport: event.sport,
      startTime: event.startTime
    };
  }

  /**
   * Get historical data for teams (mock implementation for now)
   */
  private async getHistoricalData(homeTeam: string, awayTeam: string, sport: string): Promise<HistoricalData> {
    // Mock data - in production, this would query actual historical data
    return {
      homeTeam: {
        recentForm: ['W', 'W', 'D', 'L', 'W'],
        averageGoalsFor: 1.8 + Math.random() * 0.4,
        averageGoalsAgainst: 1.2 + Math.random() * 0.4,
        homeRecord: { wins: 8, draws: 3, losses: 4 }
      },
      awayTeam: {
        recentForm: ['L', 'W', 'W', 'D', 'W'],
        averageGoalsFor: 1.6 + Math.random() * 0.4,
        averageGoalsAgainst: 1.4 + Math.random() * 0.4,
        awayRecord: { wins: 6, draws: 5, losses: 4 }
      },
      headToHead: {
        totalMeetings: 15,
        homeTeamWins: 6,
        awayTeamWins: 5,
        draws: 4,
        averageGoals: 2.1 + Math.random() * 0.8
      }
    };
  }

  /**
   * Store prediction in database
   */
  private async storePrediction(prediction: MatchPrediction): Promise<void> {
    try {
      await this.prisma.aiPrediction.create({
        data: {
          eventId: prediction.eventId,
          predictions: JSON.stringify(prediction.predictions),
          confidence: prediction.confidence,
          reasoning: prediction.reasoning,
          valueBets: JSON.stringify(prediction.valueBets),
          aiModel: prediction.aiModel,
          createdAt: new Date(prediction.timestamp)
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to store prediction in database: ${error.message}`);
      // Don't throw - this shouldn't break the prediction flow
    }
  }

  /**
   * Get historical predictions for performance analysis
   */
  async getPredictionHistory(limit: number = 20): Promise<any[]> {
    try {
      return await this.prisma.aiPrediction.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: true
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to fetch prediction history: ${error.message}`);
      return [];
    }
  }

  /**
   * Test the AI predictor with a sample match
   */
  async testPredictor(): Promise<any> {
    const testPrompt = 'Predict the outcome of Arsenal vs Chelsea in the Premier League. Give win probability for each team and over/under 2.5 goals probability. Respond in JSON format.';
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'user', content: testPrompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        status: 'success',
        testPrompt,
        response: data.choices[0]?.message?.content,
        usage: data.usage
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        testPrompt
      };
    }
  }
}