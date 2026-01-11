import { Injectable, Logger } from '@nestjs/common';
import { LanguageService } from './language.service';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AiAdvice {
  id: string;
  title: string;
  content: string;
  category: 'strategy' | 'insight' | 'warning' | 'opportunity';
  confidence: number;
  sport?: string;
  relatedMatch?: string;
  createdAt: string;
}

interface AiNewsItem {
  id: string;
  headline: string;
  summary: string;
  sport: string;
  impact: 'high' | 'medium' | 'low';
  createdAt: string;
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  // Free model that doesn't require credits
  private readonly freeModel = 'meta-llama/llama-3.2-3b-instruct:free';

  constructor(private languageService: LanguageService) {}

  async generateAdvice(
    configuration: {
      sportKey: string;
      countries: string[];
      leagues: string[];
      markets: string[];
    },
    matches: Array<{
      homeTeam: string;
      awayTeam: string;
      league: string;
      startTime: string;
      odds: { home: number; draw?: number; away: number };
    }>,
    languageCode: string = 'en',
  ): Promise<AiAdvice[]> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    // If no API key, return mock data
    if (!apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not set, returning mock advice');
      return this.getMockAdvice(configuration, matches, languageCode);
    }

    const translationInstruction = this.languageService.getTranslationInstruction(languageCode);

    const systemPrompt = `You are an expert sports betting analyst AI. You provide clear, actionable betting advice based on statistical analysis, historical trends, and current odds.

Your advice should be:
- Data-driven and objective
- Clear about risk levels
- Focused on value opportunities
- Respectful of responsible gambling

${translationInstruction}

Format your response as a JSON array of advice objects with this structure:
[
  {
    "title": "Brief advice title",
    "content": "Detailed explanation of the advice",
    "category": "strategy|insight|warning|opportunity",
    "confidence": 70-95,
    "relatedMatch": "Team A vs Team B (if applicable)"
  }
]

Only return the JSON array, no other text.`;

    const userPrompt = this.buildUserPrompt(configuration, matches);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
          'X-Title': 'SportsAI Platform',
        },
        body: JSON.stringify({
          model: this.freeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ] as OpenRouterMessage[],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`OpenRouter API error: ${error}`);
        return this.getMockAdvice(configuration, matches, languageCode);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices[0]?.message?.content || '';

      // Parse the JSON response
      try {
        const adviceArray = JSON.parse(content);
        return adviceArray.map((advice: any, index: number) => ({
          id: `advice-${Date.now()}-${index}`,
          title: advice.title || 'AI Insight',
          content: advice.content || '',
          category: advice.category || 'insight',
          confidence: advice.confidence || 75,
          sport: configuration.sportKey,
          relatedMatch: advice.relatedMatch,
          createdAt: new Date().toISOString(),
        }));
      } catch {
        this.logger.warn('Failed to parse AI response, returning mock advice');
        return this.getMockAdvice(configuration, matches, languageCode);
      }
    } catch (error) {
      this.logger.error(`OpenRouter request failed: ${error}`);
      return this.getMockAdvice(configuration, matches, languageCode);
    }
  }

  async generateNews(
    sportKeys: string[],
    languageCode: string = 'en',
  ): Promise<AiNewsItem[]> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    // If no API key, return mock data
    if (!apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not set, returning mock news');
      return this.getMockNews(sportKeys, languageCode);
    }

    const translationInstruction = this.languageService.getTranslationInstruction(languageCode);

    const systemPrompt = `You are a sports news AI that provides relevant updates for sports bettors. Generate news items about injuries, team form, weather impacts, and other factors that affect betting markets.

${translationInstruction}

Format your response as a JSON array of news objects with this structure:
[
  {
    "headline": "Brief headline",
    "summary": "2-3 sentence summary",
    "sport": "soccer|basketball|tennis|etc",
    "impact": "high|medium|low"
  }
]

Only return the JSON array, no other text.`;

    const userPrompt = `Generate 5 relevant sports news items for betting analysis. Focus on these sports: ${sportKeys.join(', ')}. Include updates about:
- Key player injuries or returns
- Team form and momentum
- Weather or venue factors
- Market movements and sharp action
- Historical matchup insights`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
          'X-Title': 'SportsAI Platform',
        },
        body: JSON.stringify({
          model: this.freeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ] as OpenRouterMessage[],
          temperature: 0.8,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`OpenRouter API error: ${error}`);
        return this.getMockNews(sportKeys, languageCode);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices[0]?.message?.content || '';

      // Parse the JSON response
      try {
        const newsArray = JSON.parse(content);
        return newsArray.map((news: any, index: number) => ({
          id: `news-${Date.now()}-${index}`,
          headline: news.headline || 'Sports Update',
          summary: news.summary || '',
          sport: news.sport || sportKeys[0] || 'general',
          impact: news.impact || 'medium',
          createdAt: new Date().toISOString(),
        }));
      } catch {
        this.logger.warn('Failed to parse AI news response, returning mock news');
        return this.getMockNews(sportKeys, languageCode);
      }
    } catch (error) {
      this.logger.error(`OpenRouter news request failed: ${error}`);
      return this.getMockNews(sportKeys, languageCode);
    }
  }

  private buildUserPrompt(
    configuration: {
      sportKey: string;
      countries: string[];
      leagues: string[];
      markets: string[];
    },
    matches: Array<{
      homeTeam: string;
      awayTeam: string;
      league: string;
      startTime: string;
      odds: { home: number; draw?: number; away: number };
    }>,
  ): string {
    let prompt = `Analyze the following betting configuration and upcoming matches to provide strategic advice:

Configuration:
- Sport: ${configuration.sportKey}
- Countries: ${configuration.countries.length > 0 ? configuration.countries.join(', ') : 'All'}
- Leagues: ${configuration.leagues.length > 0 ? configuration.leagues.join(', ') : 'All'}
- Markets: ${configuration.markets.length > 0 ? configuration.markets.join(', ') : 'All'}

Upcoming Matches:
`;

    matches.forEach((match, index) => {
      prompt += `
${index + 1}. ${match.homeTeam} vs ${match.awayTeam}
   League: ${match.league}
   Date: ${match.startTime}
   Odds: Home ${match.odds.home}${match.odds.draw ? ` | Draw ${match.odds.draw}` : ''} | Away ${match.odds.away}`;
    });

    prompt += `

Provide 4-5 pieces of advice covering:
1. A value betting opportunity
2. A strategic insight about one of the matches
3. A risk warning if applicable
4. A general market observation`;

    return prompt;
  }

  private getMockAdvice(
    configuration: {
      sportKey: string;
      countries: string[];
      leagues: string[];
      markets: string[];
    },
    matches: Array<{
      homeTeam: string;
      awayTeam: string;
      league: string;
      startTime: string;
      odds: { home: number; draw?: number; away: number };
    }>,
    languageCode: string = 'en',
  ): AiAdvice[] {
    const sportName = this.getSportName(configuration.sportKey);
    const topMatch = matches[0];

    // Get localized mock data based on language
    const localizedContent = this.getLocalizedMockAdvice(languageCode, sportName, topMatch, configuration);

    return localizedContent;
  }

  private getLocalizedMockAdvice(
    languageCode: string,
    sportName: string,
    topMatch: { homeTeam: string; awayTeam: string; odds: { home: number; draw?: number; away: number } } | undefined,
    configuration: { sportKey: string; countries: string[]; leagues: string[]; markets: string[] },
  ): AiAdvice[] {
    // Romanian translations
    if (languageCode === 'ro') {
      return [
        {
          id: `advice-${Date.now()}-1`,
          title: `Oportunitate de Valoare ${sportName}`,
          content: topMatch
            ? `Bazat pe performanța istorică și analiza formei actuale, ${topMatch.homeTeam} pare să ofere valoare la cotele curente de ${topMatch.odds.home}. Factorul avantajului de teren și rezultatele recente sugerează că probabilitatea implicită este mai mare decât indică cotele de piață.`
            : `Căutați valoare în selecțiile echipei gazdă unde cotele depășesc 2.0. Datele istorice sugerează că avantajul de teren este adesea subevaluat în condițiile actuale ale pieței.`,
          category: 'opportunity',
          confidence: 78,
          sport: configuration.sportKey,
          relatedMatch: topMatch ? `${topMatch.homeTeam} vs ${topMatch.awayTeam}` : undefined,
          createdAt: new Date().toISOString(),
        },
        {
          id: `advice-${Date.now()}-2`,
          title: 'Alertă Mișcare Piață',
          content: `Banii experților s-au mutat pe piețele ${configuration.leagues.length > 0 ? configuration.leagues[0] : sportName}. Monitorizați cu atenție mișcările de linie, deoarece casele de pariuri se ajustează pentru acțiunea recreativă așteptată. Luați în considerare poziții contrare pe meciurile cu susținere publică semnificativă.`,
          category: 'insight',
          confidence: 72,
          sport: configuration.sportKey,
          createdAt: new Date().toISOString(),
        },
        {
          id: `advice-${Date.now()}-3`,
          title: 'Reamintire Gestionare Risc',
          content: `${configuration.markets.includes('btts') || configuration.markets.includes('over_under')
            ? 'Piețele de goluri pot fi volatile. Luați în considerare mize mai mici pe pariurile over/under în perioadele de variație ridicată.'
            : 'Evitați urmărirea pierderilor pe piețele de rezultat al meciului. Rămâneți la analiza pre-meci și strategia de gestionare a fondurilor.'}`,
          category: 'warning',
          confidence: 85,
          sport: configuration.sportKey,
          createdAt: new Date().toISOString(),
        },
        {
          id: `advice-${Date.now()}-4`,
          title: 'Abordare Strategică',
          content: `Pentru meciurile din ${configuration.countries.length > 0 ? configuration.countries.join(' și ') : sportName}, concentrați-vă pe analiza de la începutul săptămânii. Cotele sunt de obicei mai ineficiente cu 3-4 zile înainte de meciuri. Blocați valoarea înainte de corecțiile pieței.`,
          category: 'strategy',
          confidence: 81,
          sport: configuration.sportKey,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    // Spanish translations
    if (languageCode === 'es') {
      return [
        {
          id: `advice-${Date.now()}-1`,
          title: `Oportunidad de Valor en ${sportName}`,
          content: topMatch
            ? `Basado en el rendimiento histórico y análisis de forma actual, ${topMatch.homeTeam} parece ofrecer valor a las cuotas actuales de ${topMatch.odds.home}. El factor de ventaja local y los resultados recientes sugieren que la probabilidad implícita es mayor de lo que indican las cuotas del mercado.`
            : `Busque valor en las selecciones del equipo local donde las cuotas superen 2.0. Los datos históricos sugieren que la ventaja local a menudo está infravalorada en las condiciones actuales del mercado.`,
          category: 'opportunity',
          confidence: 78,
          sport: configuration.sportKey,
          relatedMatch: topMatch ? `${topMatch.homeTeam} vs ${topMatch.awayTeam}` : undefined,
          createdAt: new Date().toISOString(),
        },
        {
          id: `advice-${Date.now()}-2`,
          title: 'Alerta de Movimiento del Mercado',
          content: `El dinero inteligente se ha movido en los mercados de ${configuration.leagues.length > 0 ? configuration.leagues[0] : sportName}. Monitoree los movimientos de línea de cerca ya que las casas de apuestas se ajustan para la acción recreativa esperada.`,
          category: 'insight',
          confidence: 72,
          sport: configuration.sportKey,
          createdAt: new Date().toISOString(),
        },
        {
          id: `advice-${Date.now()}-3`,
          title: 'Recordatorio de Gestión de Riesgos',
          content: `Evite perseguir pérdidas en los mercados de resultados de partidos. Manténgase fiel a su análisis previo al juego y estrategia de gestión de fondos.`,
          category: 'warning',
          confidence: 85,
          sport: configuration.sportKey,
          createdAt: new Date().toISOString(),
        },
        {
          id: `advice-${Date.now()}-4`,
          title: 'Enfoque Estratégico',
          content: `Para los partidos de ${configuration.countries.length > 0 ? configuration.countries.join(' y ') : sportName}, enfóquese en el análisis de principio de semana. Las cuotas suelen ser más ineficientes 3-4 días antes de los partidos.`,
          category: 'strategy',
          confidence: 81,
          sport: configuration.sportKey,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    // Default English
    return [
      {
        id: `advice-${Date.now()}-1`,
        title: `${sportName} Value Opportunity`,
        content: topMatch
          ? `Based on historical performance and current form analysis, ${topMatch.homeTeam} appears to offer value at current odds of ${topMatch.odds.home}. The home advantage factor and recent results suggest implied probability is higher than market odds indicate.`
          : `Look for value in home team selections where odds exceed 2.0. Historical data suggests home advantage is often undervalued in current market conditions.`,
        category: 'opportunity',
        confidence: 78,
        sport: configuration.sportKey,
        relatedMatch: topMatch ? `${topMatch.homeTeam} vs ${topMatch.awayTeam}` : undefined,
        createdAt: new Date().toISOString(),
      },
      {
        id: `advice-${Date.now()}-2`,
        title: 'Market Movement Alert',
        content: `Sharp money has been moving in ${configuration.leagues.length > 0 ? configuration.leagues[0] : sportName} markets. Monitor line movements closely as bookmakers are adjusting for expected recreational action. Consider contrarian positions on matches with significant public backing.`,
        category: 'insight',
        confidence: 72,
        sport: configuration.sportKey,
        createdAt: new Date().toISOString(),
      },
      {
        id: `advice-${Date.now()}-3`,
        title: 'Risk Management Reminder',
        content: `${configuration.markets.includes('btts') || configuration.markets.includes('over_under')
          ? 'Goals markets can be volatile. Consider smaller stakes on over/under bets during periods of high variance.'
          : 'Avoid chasing losses in match result markets. Stick to your pre-game analysis and bankroll management strategy.'}`,
        category: 'warning',
        confidence: 85,
        sport: configuration.sportKey,
        createdAt: new Date().toISOString(),
      },
      {
        id: `advice-${Date.now()}-4`,
        title: 'Strategic Approach',
        content: `For ${configuration.countries.length > 0 ? configuration.countries.join(' and ') : sportName} matches, focus on early-week analysis. Odds are typically more inefficient 3-4 days before matches. Lock in value before market corrections occur.`,
        category: 'strategy',
        confidence: 81,
        sport: configuration.sportKey,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private getMockNews(sportKeys: string[], languageCode: string = 'en'): AiNewsItem[] {
    const primarySport = sportKeys[0] || 'soccer';
    const sportName = this.getSportName(primarySport);

    // Romanian translations
    if (languageCode === 'ro') {
      return [
        {
          id: `news-${Date.now()}-1`,
          headline: `Actualizări Cheie ${sportName} Înaintea Meciurilor de Weekend`,
          summary: `Mai multe actualizări despre accidentări din ligile de top afectează liniile de pariuri. Mai mulți jucători vedetă care revin după accidentări ar putea avea un impact semnificativ asupra rezultatelor meciurilor și cotelor de piață.`,
          sport: primarySport,
          impact: 'high',
          createdAt: new Date().toISOString(),
        },
        {
          id: `news-${Date.now()}-2`,
          headline: 'Mișcare de Bani Experți Detectată',
          summary: `Pariorii profesioniști au fost activi pe piețele overnight. Mișcările semnificative de linie sugerează că banii inteligenți se poziționează înaintea meciurilor importante.`,
          sport: primarySport,
          impact: 'high',
          createdAt: new Date().toISOString(),
        },
        {
          id: `news-${Date.now()}-3`,
          headline: 'Avertizare Meteo pentru Meciurile Viitoare',
          summary: `Condiții meteo nefavorabile așteptate în mai multe regiuni ar putea afecta sporturile în aer liber. Luați în considerare vremea în totalurile și predicțiile de scor.`,
          sport: primarySport,
          impact: 'medium',
          createdAt: new Date().toISOString(),
        },
        {
          id: `news-${Date.now()}-4`,
          headline: 'Analiză Formă: Echipe de Top în Trend',
          summary: `Analiza recentă a formei arată mai multe echipe de top în serii de victorii. Avantajul de teren continuă să fie un factor semnificativ în statisticile sezonului curent.`,
          sport: primarySport,
          impact: 'medium',
          createdAt: new Date().toISOString(),
        },
        {
          id: `news-${Date.now()}-5`,
          headline: 'Raport Eficiență Piață',
          summary: `Marjele caselor de pariuri s-au strâns pe ligile majore, rămânând mai largi pe piețele mai mici. Căutătorii de valoare ar trebui să se concentreze pe competițiile de nivel mediu.`,
          sport: primarySport,
          impact: 'low',
          createdAt: new Date().toISOString(),
        },
      ];
    }

    // Spanish translations
    if (languageCode === 'es') {
      return [
        {
          id: `news-${Date.now()}-1`,
          headline: `Actualizaciones Clave de ${sportName} Antes de los Partidos del Fin de Semana`,
          summary: `Múltiples actualizaciones de lesiones en las principales ligas están afectando las líneas de apuestas. Varios jugadores estrella que regresan de lesiones podrían impactar significativamente los resultados de los partidos.`,
          sport: primarySport,
          impact: 'high',
          createdAt: new Date().toISOString(),
        },
        {
          id: `news-${Date.now()}-2`,
          headline: 'Movimiento de Dinero Inteligente Detectado',
          summary: `Los apostadores profesionales han estado activos en los mercados nocturnos. Los movimientos significativos de línea sugieren que el dinero inteligente se está posicionando.`,
          sport: primarySport,
          impact: 'high',
          createdAt: new Date().toISOString(),
        },
        {
          id: `news-${Date.now()}-3`,
          headline: 'Aviso Meteorológico para Próximos Partidos',
          summary: `Se esperan condiciones climáticas adversas en varias regiones que podrían afectar los deportes al aire libre. Considere el clima en los totales y predicciones de puntuación.`,
          sport: primarySport,
          impact: 'medium',
          createdAt: new Date().toISOString(),
        },
        {
          id: `news-${Date.now()}-4`,
          headline: 'Análisis de Forma: Equipos Top en Tendencia',
          summary: `El análisis de forma reciente muestra a varios equipos top en rachas ganadoras. La ventaja local continúa siendo un factor significativo en las estadísticas de la temporada actual.`,
          sport: primarySport,
          impact: 'medium',
          createdAt: new Date().toISOString(),
        },
        {
          id: `news-${Date.now()}-5`,
          headline: 'Informe de Eficiencia del Mercado',
          summary: `Los márgenes de las casas de apuestas se han ajustado en las ligas principales mientras permanecen más amplios en mercados menores. Los buscadores de valor deberían enfocarse en competiciones de nivel medio.`,
          sport: primarySport,
          impact: 'low',
          createdAt: new Date().toISOString(),
        },
      ];
    }

    // Default English
    return [
      {
        id: `news-${Date.now()}-1`,
        headline: `Key ${sportName} Updates Ahead of Weekend Fixtures`,
        summary: `Multiple injury updates across top leagues are affecting betting lines. Several star players returning from injury could significantly impact match outcomes and market odds.`,
        sport: primarySport,
        impact: 'high',
        createdAt: new Date().toISOString(),
      },
      {
        id: `news-${Date.now()}-2`,
        headline: 'Sharp Money Movement Detected',
        summary: `Professional bettors have been active in overnight markets. Significant line movements suggest smart money is positioning ahead of major matchups.`,
        sport: primarySport,
        impact: 'high',
        createdAt: new Date().toISOString(),
      },
      {
        id: `news-${Date.now()}-3`,
        headline: 'Weather Advisory for Upcoming Matches',
        summary: `Adverse weather conditions expected in several regions could affect outdoor sports. Consider factoring weather into totals and scoring predictions.`,
        sport: primarySport,
        impact: 'medium',
        createdAt: new Date().toISOString(),
      },
      {
        id: `news-${Date.now()}-4`,
        headline: 'Form Analysis: Top Teams Trending',
        summary: `Recent form analysis shows several top teams on hot streaks. Home advantage continues to be a significant factor in current season statistics.`,
        sport: primarySport,
        impact: 'medium',
        createdAt: new Date().toISOString(),
      },
      {
        id: `news-${Date.now()}-5`,
        headline: 'Market Efficiency Report',
        summary: `Bookmaker margins have tightened on major leagues while remaining wider on smaller markets. Value seekers should focus on mid-tier competitions.`,
        sport: primarySport,
        impact: 'low',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private getSportName(sportKey: string): string {
    const sportNames: Record<string, string> = {
      soccer: 'Soccer',
      basketball: 'Basketball',
      tennis: 'Tennis',
      baseball: 'Baseball',
      american_football: 'American Football',
      ice_hockey: 'Ice Hockey',
      cricket: 'Cricket',
      rugby: 'Rugby',
      mma: 'MMA',
      esports: 'eSports',
    };
    return sportNames[sportKey] || 'Sports';
  }
}
