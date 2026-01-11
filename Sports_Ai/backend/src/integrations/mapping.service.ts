import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MappingService {
  private readonly logger = new Logger(MappingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Resolves a provider-specific event ID to a canonical event ID.
   */
  async resolveEvent(provider: string, providerEventId: string): Promise<string | null> {
    // This would typically involve checking a mapping table
    // For now, we'll return a placeholder or check externalIds in Event model
    const event = await this.prisma.event.findFirst({
      where: {
        externalIds: {
          contains: `"${provider}":"${providerEventId}"`,
        },
      },
    });
    return event?.id || null;
  }

  /**
   * Resolves a provider-specific team ID to a canonical team ID.
   */
  async resolveTeam(provider: string, providerTeamId: string): Promise<string | null> {
    const team = await this.prisma.team.findFirst({
      where: {
        externalIds: {
          contains: `"${provider}":"${providerTeamId}"`,
        },
      },
    });
    return team?.id || null;
  }

  /**
   * Normalizes a market key from a provider to our canonical format.
   */
  normalizeMarket(provider: string, providerMarketKey: string): string {
    // Mapping logic for different bookmaker naming conventions
    const mapping: Record<string, Record<string, string>> = {
      bet365: {
        'MATCH_ODDS': '1X2',
        'TOTAL_GOALS': 'OVER_UNDER_25',
      },
      stake: {
        'winner': '1X2',
        'totals': 'OVER_UNDER_25',
      },
    };

    return mapping[provider.toLowerCase()]?.[providerMarketKey] || providerMarketKey;
  }
}
