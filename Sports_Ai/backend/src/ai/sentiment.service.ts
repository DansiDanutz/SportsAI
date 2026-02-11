import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface SentimentAnalysis {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  sentiment: {
    overall: 'bullish' | 'bearish' | 'neutral';
    homeTeamSentiment: number; // -1 to +1
    awayTeamSentiment: number; // -1 to +1
    publicMoney: {
      favorsHome: number; // 0-100%
      favorsAway: number; // 0-100%
    };
    sharpMoney: {
      indicatedDirection: 'home' | 'away' | 'neutral';
      confidence: number; // 0-1
    };
    contrarian: {
      recommendation: 'home' | 'away' | 'avoid';
      reasoning: string;
      strength: number; // 0-1
    };
  };
  sources: string[];
  timestamp: string;
  aiModel: string;
}

interface SentimentSource {
  platform: string;
  content: string;
  engagement: number;
  timestamp: string;
}

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);
  private readonly openRouterApiKey = process.env.OPENROUTER_API_KEY || '';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {}

  /**
   * Analyze sentiment for a specific match
   */
  async analyzeSentiment(eventId: string): Promise<SentimentAnalysis> {
    this.logger.log(`Analyzing sentiment for event: ${eventId}`);
    
    try {
      // Get event details
      const event = await this.getEventDetails(eventId);
      if (!event) {
        throw new HttpException(`Event ${eventId} not found`, HttpStatus.NOT_FOUND);
      }

      // Gather sentiment data from multiple sources
      const sentimentSources = await this.gatherSentimentData(event);

      // Analyze sentiment using AI
      const sentimentAnalysis = await this.performAiSentimentAnalysis(event, sentimentSources);

      const result: SentimentAnalysis = {
        eventId,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        sport: event.sport,
        sentiment: sentimentAnalysis,
        sources: sentimentSources.map(s => s.platform),
        timestamp: new Date().toISOString(),
        aiModel: 'google/gemini-2.0-flash-001'
      };

      // Store analysis in database
      await this.storeSentimentAnalysis(result);

      return result;
    } catch (error) {
      this.logger.error(`Failed to analyze sentiment for ${eventId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gather sentiment data from multiple sources (simulated)
   */
  private async gatherSentimentData(event: any): Promise<SentimentSource[]> {
    // In a real implementation, this would scrape social media, news, forums, etc.
    // For now, we'll generate realistic sample data
    
    const sources: SentimentSource[] = [
      {
        platform: 'Twitter',
        content: `${event.homeTeam} looking strong at home today. Recent form has been impressive. #${event.homeTeam.replace(/\s/g, '')} #betting`,
        engagement: 150,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        platform: 'Reddit',
        content: `Everyone backing ${event.homeTeam} but ${event.awayTeam} has great value at these odds. Away form has been solid and they perform well under pressure.`,
        engagement: 45,
        timestamp: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString()
      },
      {
        platform: 'BettingForum',
        content: `Heavy public money on ${event.homeTeam}. Lines moved from 2.1 to 1.9 in their favor. Sharp money might be on the other side here.`,
        engagement: 78,
        timestamp: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000).toISOString()
      },
      {
        platform: 'TipsterNetwork',
        content: `${event.awayTeam} has been underperforming but their underlying stats are solid. Could be a trap game for ${event.homeTeam}.`,
        engagement: 23,
        timestamp: new Date(Date.now() - Math.random() * 3 * 60 * 60 * 1000).toISOString()
      },
      {
        platform: 'SportsBlog',
        content: `Injury news favoring ${event.homeTeam}. Key players available while ${event.awayTeam} missing important defender.`,
        engagement: 89,
        timestamp: new Date(Date.now() - Math.random() * 8 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Add some randomization based on team names
    const homeTeamPopularity = this.calculateTeamPopularity(event.homeTeam);
    const awayTeamPopularity = this.calculateTeamPopularity(event.awayTeam);
    
    // Adjust sentiment based on popularity
    if (homeTeamPopularity > awayTeamPopularity) {
      sources.push({
        platform: 'Facebook',
        content: `Big match today! Everyone at work backing ${event.homeTeam}. Seems like easy money 💰`,
        engagement: 234,
        timestamp: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000).toISOString()
      });
    } else {
      sources.push({
        platform: 'Discord',
        content: `Contrarian play: ${event.awayTeam} +odds looking juicy. Public all over ${event.homeTeam} but fundamentals suggest otherwise.`,
        engagement: 67,
        timestamp: new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000).toISOString()
      });
    }

    return sources;
  }

  /**
   * Perform AI-powered sentiment analysis
   */
  private async performAiSentimentAnalysis(event: any, sources: SentimentSource[]): Promise<any> {
    const prompt = this.buildSentimentPrompt(event, sources);
    
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
            content: 'You are an expert sports betting sentiment analyst. Analyze social sentiment, public vs sharp money patterns, and contrarian betting opportunities. Return detailed analysis in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Low temperature for consistent analysis
        max_tokens: 1200
      })
    });

    if (!response.ok) {
      throw new HttpException(`OpenRouter API error: ${response.statusText}`, HttpStatus.BAD_GATEWAY);
    }

    const data = await response.json();
    const content = (data as any).choices[0]?.message?.content;
    
    if (!content) {
      throw new HttpException('No sentiment analysis received from AI', HttpStatus.BAD_GATEWAY);
    }

    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      this.logger.error(`Failed to parse AI sentiment response: ${parseError.message}\nResponse: ${content}`);
      
      // Fallback to manual parsing
      return this.parseSentimentResponseManually(content, sources);
    }
  }

  /**
   * Build sentiment analysis prompt
   */
  private buildSentimentPrompt(event: any, sources: SentimentSource[]): string {
    const sourcesText = sources.map(source => 
      `Platform: ${source.platform} (${source.engagement} engagements)\nContent: ${source.content}\n---`
    ).join('\n');

    return `
Analyze the social sentiment for this upcoming match:

**Match:** ${event.homeTeam} vs ${event.awayTeam}
**Sport:** ${event.sport}

**Social Media & Betting Community Sentiment:**
${sourcesText}

Please analyze the sentiment and betting patterns to provide insights about:

1. **Public Money Pattern**: Where is casual betting money flowing?
2. **Sharp Money Indicators**: Any signs of professional betting interest?
3. **Contrarian Opportunities**: When public heavily favors one side, the other often has value
4. **Overall Sentiment**: Bullish/bearish/neutral for each team

Provide your analysis in this JSON format:
{
  "overall": "bullish|bearish|neutral",
  "homeTeamSentiment": 0.3,
  "awayTeamSentiment": -0.1,
  "publicMoney": {
    "favorsHome": 75,
    "favorsAway": 25
  },
  "sharpMoney": {
    "indicatedDirection": "away",
    "confidence": 0.7
  },
  "contrarian": {
    "recommendation": "away",
    "reasoning": "Heavy public money on home team creates value on away side",
    "strength": 0.8
  }
}

Key principles:
- High public percentage on one side often creates value on the other
- Sharp money usually moves against public sentiment
- Sentiment values: -1 (very negative) to +1 (very positive)
- Confidence/strength: 0 to 1
`;
  }

  /**
   * Fallback sentiment parsing if JSON fails
   */
  private parseSentimentResponseManually(content: string, sources: SentimentSource[]): any {
    // Count mentions and positive/negative keywords for each team
    const homePositive = (content.match(/strong|good|impressive|solid|confident/gi) || []).length;
    const homeNegative = (content.match(/weak|poor|struggling|concerning|worried/gi) || []).length;
    const awayPositive = (content.match(/undervalued|value|opportunity|contrarian/gi) || []).length;
    const awayNegative = (content.match(/overrated|public|trap|avoid/gi) || []).length;

    // Calculate public money distribution based on engagement
    const totalEngagement = sources.reduce((sum, s) => sum + s.engagement, 0);
    const homeEngagement = sources.filter(s => s.content.toLowerCase().includes('home') || 
      s.content.includes('💰') || s.content.includes('easy money')).reduce((sum, s) => sum + s.engagement, 0);
    
    const publicFavorsHome = totalEngagement > 0 ? (homeEngagement / totalEngagement) * 100 : 50;

    return {
      overall: homePositive > awayPositive ? 'bullish' : awayPositive > homePositive ? 'bearish' : 'neutral',
      homeTeamSentiment: Math.min(1, Math.max(-1, (homePositive - homeNegative) * 0.2)),
      awayTeamSentiment: Math.min(1, Math.max(-1, (awayPositive - awayNegative) * 0.2)),
      publicMoney: {
        favorsHome: Math.round(publicFavorsHome),
        favorsAway: Math.round(100 - publicFavorsHome)
      },
      sharpMoney: {
        indicatedDirection: publicFavorsHome > 65 ? 'away' : publicFavorsHome < 35 ? 'home' : 'neutral',
        confidence: Math.abs(publicFavorsHome - 50) / 50
      },
      contrarian: {
        recommendation: publicFavorsHome > 70 ? 'away' : publicFavorsHome < 30 ? 'home' : 'avoid',
        reasoning: publicFavorsHome > 70 ? 'Heavy public money on home team creates contrarian value on away side' :
                  publicFavorsHome < 30 ? 'Heavy public money on away team creates contrarian value on home side' :
                  'Balanced public sentiment, no clear contrarian opportunity',
        strength: Math.min(0.9, Math.abs(publicFavorsHome - 50) / 50)
      }
    };
  }

  /**
   * Calculate team popularity score for sentiment weighting
   */
  private calculateTeamPopularity(teamName: string): number {
    // Simple popularity calculation based on common big clubs
    const bigClubs = [
      'Arsenal', 'Chelsea', 'Manchester United', 'Manchester City', 'Liverpool', 'Tottenham',
      'Barcelona', 'Real Madrid', 'PSG', 'Bayern Munich', 'Juventus', 'Inter Milan', 'AC Milan',
      'Lakers', 'Warriors', 'Celtics', 'Heat', 'Bulls', 'Knicks',
      'Cowboys', 'Patriots', 'Packers', 'Steelers', 'Giants', '49ers'
    ];
    
    const normalizedTeamName = teamName.toLowerCase();
    const matchingClub = bigClubs.find(club => normalizedTeamName.includes(club.toLowerCase()));
    
    return matchingClub ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.4;
  }

  /**
   * Get event details from database or API
   */
  private async getEventDetails(eventId: string): Promise<any> {
    try {
      // Try to find in database first
      const dbEvent = await this.prisma.event.findUnique({
        where: { id: eventId }
      });

      if (dbEvent) {
        return dbEvent;
      }

      // If not found, generate mock event for testing
      return {
        id: eventId,
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        sport: 'Football',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    } catch (error) {
      this.logger.warn(`Failed to get event details for ${eventId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Store sentiment analysis in database
   */
  private async storeSentimentAnalysis(analysis: SentimentAnalysis): Promise<void> {
    try {
      await (this.prisma as any).sentimentAnalysis.create({
        data: {
          eventId: analysis.eventId,
          sentiment: JSON.stringify(analysis.sentiment),
          sources: JSON.stringify(analysis.sources),
          aiModel: analysis.aiModel,
          createdAt: new Date(analysis.timestamp)
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to store sentiment analysis in database: ${error.message}`);
      // Don't throw - this shouldn't break the sentiment analysis flow
    }
  }

  /**
   * Get historical sentiment analyses
   */
  async getSentimentHistory(eventId?: string, limit: number = 20): Promise<any[]> {
    try {
      const whereClause = eventId ? { eventId } : {};
      
      return await (this.prisma as any).sentimentAnalysis.findMany({
        where: whereClause,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      this.logger.warn(`Failed to fetch sentiment history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get sentiment trends for multiple events
   */
  async getSentimentTrends(sportFilter?: string): Promise<any> {
    try {
      // Get recent sentiment analyses
      const recentAnalyses = await (this.prisma as any).sentimentAnalysis.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          event: true
        }
      });

      // Group by sentiment patterns
      const trends = {
        totalAnalyses: recentAnalyses.length,
        contrarianOpportunities: 0,
        strongPublicBias: 0,
        sharpMoneyIndicators: 0,
        sentimentDistribution: {
          bullish: 0,
          bearish: 0,
          neutral: 0
        }
      };

      for (const analysis of recentAnalyses) {
        const sentiment = JSON.parse(analysis.sentiment || '{}');
        
        // Count contrarian opportunities
        if (sentiment.contrarian?.strength > 0.7) {
          trends.contrarianOpportunities++;
        }
        
        // Count strong public bias (>75% one way)
        if (sentiment.publicMoney?.favorsHome > 75 || sentiment.publicMoney?.favorsAway > 75) {
          trends.strongPublicBias++;
        }
        
        // Count sharp money indicators
        if (sentiment.sharpMoney?.confidence > 0.6) {
          trends.sharpMoneyIndicators++;
        }
        
        // Sentiment distribution
        trends.sentimentDistribution[sentiment.overall || 'neutral']++;
      }

      return trends;
    } catch (error) {
      this.logger.error(`Failed to get sentiment trends: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Test sentiment analysis with a sample event
   */
  async testSentimentAnalysis(): Promise<any> {
    const testEvent = {
      id: 'test-123',
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      sport: 'Football'
    };

    try {
      const result = await this.analyzeSentiment('test-123');
      
      return {
        status: 'success',
        testEvent,
        sentimentAnalysis: result
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        testEvent
      };
    }
  }
}