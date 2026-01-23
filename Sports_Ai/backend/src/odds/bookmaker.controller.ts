import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('v1/bookmakers')
@UseGuards(JwtAuthGuard)
export class BookmakerController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAll() {
    const bookmakers = await this.prisma.bookmaker.findMany({
      orderBy: { brand: 'asc' },
    });

    // Enrich with some stats derived from database
    const enriched = await Promise.all(
      bookmakers.map(async (b) => {
        const oddsCount = await this.prisma.oddsQuote.count({
          where: { bookmakerId: b.id },
        });
        
        // Find sports covered by this bookmaker
        const sports = await this.prisma.sport.findMany({
          where: {
            events: {
              some: {
                oddsQuotes: {
                  some: { bookmakerId: b.id }
                }
              }
            }
          },
          select: { name: true }
        });

        return {
          id: b.key,
          name: b.brand,
          regions: JSON.parse(b.regions || '[]'),
          sportsCount: sports.length,
          marketsCount: 1, // h2h is the only one we sync for now
          isEnabled: true,
          oddsCount,
          sports: sports.map(s => s.name),
        };
      })
    );

    return enriched;
  }
}
